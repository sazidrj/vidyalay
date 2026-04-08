import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { z } from "zod"

interface Params {
  params: Promise<{ schoolSlug: string }>
}

const createStaffSchema = z.object({
  fullName: z.string().min(2),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "TEACHER"]),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  subjectSpecialty: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createStaffSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // Check username is unique
  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } })
  if (existing) {
    return NextResponse.json({ success: false, message: "Username already taken" }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

  const user = await prisma.user.create({
    data: {
      schoolId: session.user.schoolId,
      username: parsed.data.username,
      fullName: parsed.data.fullName,
      role: parsed.data.role as Role,
      hashedPassword,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      employeeId: parsed.data.employeeId || null,
      subjectSpecialty: parsed.data.subjectSpecialty || null,
    },
    select: { id: true, fullName: true, username: true, role: true, email: true, employeeId: true },
  })

  return NextResponse.json({ success: true, data: user, message: "Staff account created" }, { status: 201 })
}
