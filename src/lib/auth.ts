import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        schoolSlug: { label: "School", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const username = credentials.username as string
        const password = credentials.password as string
        const schoolSlug = credentials.schoolSlug as string | undefined

        // SUPER_ADMIN login — no school required, use "superadmin" slug
        if (!schoolSlug || schoolSlug === "superadmin") {
          const user = await prisma.user.findFirst({
            where: { username, role: Role.SUPER_ADMIN, isActive: true },
          })
          if (!user) return null
          const isValid = await bcrypt.compare(password, user.hashedPassword)
          if (!isValid) return null
          return {
            id: String(user.id),
            name: user.fullName,
            email: user.email,
            role: user.role,
            schoolId: 0, // no school for super admin
            schoolSlug: "superadmin",
          }
        }

        // Regular school user login
        const school = await prisma.school.findUnique({
          where: { slug: schoolSlug, isActive: true },
        })
        if (!school) return null

        // Try exact username first, then try schoolSlug_username (student login shorthand)
        // Students type their Student ID (e.g. DEMO-2025-001), stored as demo_DEMO-2025-001
        const user = await prisma.user.findFirst({
          where: {
            schoolId: school.id,
            isActive: true,
            OR: [
              { username },
              { username: `${schoolSlug}_${username}` },
            ],
          },
        })
        if (!user) return null

        const isValid = await bcrypt.compare(password, user.hashedPassword)
        if (!isValid) return null

        return {
          id: String(user.id),
          name: user.fullName,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          schoolSlug: school.slug,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string
        token.role = user.role as Role
        token.schoolId = user.schoolId as number
        token.schoolSlug = user.schoolSlug as string
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId
      session.user.role = token.role
      session.user.schoolId = token.schoolId
      session.user.schoolSlug = token.schoolSlug
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
})
