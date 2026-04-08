import { Role } from "@prisma/client"
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email?: string | null
      image?: string | null
      role: Role
      schoolId: number
      schoolSlug: string
    }
  }

  interface User {
    role: Role
    schoolId: number
    schoolSlug: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role
    schoolId: number
    schoolSlug: string
    userId: string
  }
}
