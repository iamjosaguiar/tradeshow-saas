import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/lookup-account
 * Look up tenant account by user email and send account name via email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Look up user and their tenant
    const results = await sql`
      SELECT
        u.email,
        u.name as user_name,
        t.name as tenant_name,
        t.subdomain,
        t.logo_url
      FROM users u
      INNER JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = ${email.toLowerCase()}
        AND t.is_active = TRUE
        AND t.deleted_at IS NULL
      LIMIT 1
    `;

    if (results.length === 0) {
      // For security, don't reveal whether email exists or not
      return NextResponse.json({ success: true });
    }

    const userData = results[0];

    // TODO: In production, send actual email here using a service like:
    // - SendGrid
    // - AWS SES
    // - Resend
    // - Postmark

    // For now, log to console (in production, this would send an email)
    console.log('=== Account Lookup Email ===');
    console.log(`To: ${userData.email}`);
    console.log(`Subject: Your ${userData.tenant_name} Account Information`);
    console.log('---');
    console.log(`Hi ${userData.user_name},`);
    console.log('');
    console.log(`Your account name is: ${userData.subdomain}`);
    console.log('');
    console.log(`You can log in at:`);

    // Determine the base URL
    const hostname = request.headers.get('host') || '';
    let loginUrl = '';

    if (hostname.includes('localhost')) {
      loginUrl = `http://${userData.subdomain}.localhost:${hostname.split(':')[1] || '3000'}/login`;
    } else if (hostname.includes('vercel.app')) {
      loginUrl = `https://${userData.subdomain}.tradeshow-saas.vercel.app/login`;
    } else {
      // Custom domain
      const baseDomain = hostname.split('.').slice(-2).join('.');
      loginUrl = `https://${userData.subdomain}.${baseDomain}/login`;
    }

    console.log(loginUrl);
    console.log('');
    console.log('If you need assistance, please contact your administrator.');
    console.log('===========================');

    // In production, you would send the email here:
    /*
    await sendEmail({
      to: userData.email,
      subject: `Your ${userData.tenant_name} Account Information`,
      html: `
        <h2>Hi ${userData.user_name},</h2>
        <p>Your account name is: <strong>${userData.subdomain}</strong></p>
        <p>You can log in at: <a href="${loginUrl}">${loginUrl}</a></p>
        <p>If you need assistance, please contact your administrator.</p>
      `
    });
    */

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error looking up account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
