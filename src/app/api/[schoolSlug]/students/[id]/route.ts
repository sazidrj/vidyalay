import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { studentSchema } from "@/lib/validations/student"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"

interface Params {
  params: Promise<{ schoolSlug: string; id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const { schoolSlug, id } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const student = await prisma.student.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
    include: {
      classSection: true,
      feeRecords: { include: { feeType: true }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  })

  if (!student) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: student, message: "OK" })
}

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
  const parsed = studentSchema.partial().safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existing = await prisma.student.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
  })

  if (!existing) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  const updated = await prisma.student.update({
    where: { id: parseInt(id) },
    data: {
      ...parsed.data,
      dob: parsed.data.dob ? new Date(parsed.data.dob) : undefined,
      admissionDate: parsed.data.admissionDate ? new Date(parsed.data.admissionDate) : undefined,
    },
  })

  return NextResponse.json({ success: true, data: updated, message: "Student updated" })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug, id } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  // Soft delete
  await prisma.student.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true, data: null, message: "Student deactivated" })
}
