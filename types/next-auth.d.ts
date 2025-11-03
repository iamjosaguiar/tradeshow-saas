import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: "admin" | "rep"
      repCode?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: "admin" | "rep"
    repCode?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "admin" | "rep"
    repCode?: string | null
  }
}
