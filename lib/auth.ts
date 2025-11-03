import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { neon } from "@neondatabase/serverless"

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "rep"
  repCode?: string | null
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const sql = neon(process.env.DATABASE_URL!)

          // Fetch user from database
          const users = await sql`
            SELECT id, email, name, password_hash, role, rep_code
            FROM users
            WHERE email = ${credentials.email}
            LIMIT 1
          `

          if (users.length === 0) {
            return null
          }

          const user = users[0]

          // Verify password
          const isPasswordValid = await compare(credentials.password, user.password_hash)

          if (!isPasswordValid) {
            return null
          }

          // Update last login
          await sql`
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = ${user.id}
          `

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as "admin" | "rep",
            repCode: user.rep_code,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as User).role
        token.repCode = (user as User).repCode
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as "admin" | "rep"
        session.user.repCode = token.repCode as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
