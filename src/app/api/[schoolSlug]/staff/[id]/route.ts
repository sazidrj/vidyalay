import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { z } from "zod"

interface Params {
  params: Promise<{ schoolSlug: string; id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug, id } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const staff = await prisma.user.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
    select: {
      id: true, fullName: true, username: true, role: true, email: true,
      phone: true, employeeId: true, subjectSpecialty: true, isActive: true,
      teacherAssignments: {
        include: { classSection: true, subject: true },
        orderBy: { classSection: { className: "asc" } },
      },
    },
  })

  if (!staff) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: staff, message: "OK" })
}

const updateStaffSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  subjectSpecialty: z.string().optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(6).optional().or(z.literal("")),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug, id } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateStaffSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
  })
  if (!existing) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  const { newPassword, ...rest } = parsed.data
  const updateData: Record<string, unknown> = {
    ...rest,
    email: rest.email || null,
    phone: rest.phone || null,
    employeeId: rest.employeeId || null,
    subjectSpecialty: rest.subjectSpecialty || null,
  }

  if (newPassword) {
    updateData.hashedPassword = await bcrypt.hash(newPassword, 12)
  }

  const updated = await prisma.user.update({
    where: { id: parseInt(id) },
    data: updateData,
    select: { id: true, fullName: true, username: true, role: true, email: true, phone: true, employeeId: true, subjectSpecialty: true, isActive: true },
  })

  return NextResponse.json({ success: true, data: updated, message: "Staff updated" })
}
