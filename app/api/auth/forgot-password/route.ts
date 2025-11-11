import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import sgMail from "@sendgrid/mail"
import crypto from "crypto"

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Find user by email
    const users = await sql`
      SELECT id, email, name
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    // Always return success to prevent email enumeration
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a password reset link has been sent."
      })
    }

    const user = users[0]

    // Generate reset token (32 random bytes as hex)
    const resetToken = crypto.randomBytes(32).toString('hex')

    // Set expiration to 1 hour from now
    const resetExpires = new Date(Date.now() + 3600000) // 1 hour

    // Store token in database
    await sql`
      UPDATE users
      SET password_reset_token = ${resetToken},
          password_reset_expires = ${resetExpires.toISOString()}
      WHERE id = ${user.id}
    `

    // Create reset URL
    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${resetToken}`

    // Send email via SendGrid
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      console.error("SendGrid not configured")
      return NextResponse.json({
        error: "Email service not configured"
      }, { status: 500 })
    }

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'CleanSpace - Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #042d23 0%, #1bd076 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .logo { color: white; font-size: 24px; font-weight: bold; }
            .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; }
            .button { display: inline-block; padding: 14px 32px; background: #1bd076; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">CleanSpace Technology</div>
            </div>
            <div class="content">
              <h2 style="color: #042d23; margin-top: 0;">Password Reset Request</h2>
              <p>Hi ${user.name},</p>
              <p>We received a request to reset your password for your CleanSpace Tradeshow Portal account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
                ${resetUrl}
              </p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 CleanSpace Technology. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${user.name},

We received a request to reset your password for your CleanSpace Tradeshow Portal account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email.

© 2025 CleanSpace Technology. All rights reserved.
      `
    }

    await sgMail.send(msg)

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent."
    })

  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({
      error: "An error occurred. Please try again later."
    }, { status: 500 })
  }
}
