import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { Role } from "@prisma/client"

const schoolSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(["basic", "pro", "enterprise"]).default("basic"),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: schools, message: "OK" })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schoolSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existing = await prisma.school.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) {
    return NextResponse.json({ success: false, message: "School slug already taken" }, { status: 409 })
  }

  const school = await prisma.school.create({ data: parsed.data })

  // Auto-create first admin account
  const tempPassword = Math.random().toString(36).slice(2, 10)
  const hashed = await bcrypt.hash(tempPassword, 12)

  const adminUser = await prisma.user.create({
    data: {
      schoolId: school.id,
      username: `${school.slug}_admin`,
      fullName: `${school.name} Admin`,
      hashedPassword: hashed,
      role: Role.ADMIN,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      school,
      adminCredentials: {
        username: adminUser.username,
        password: tempPassword,
      },
    },
    message: "School created. Share admin credentials with the school.",
  }, { status: 201 })
}
