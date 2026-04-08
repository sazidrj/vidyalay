import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { generateTCNumber } from "@/lib/utils/uid"
import { z } from "zod"
import { Role } from "@prisma/client"

const tcSchema = z.object({
  leavingDate: z.string(),
  issueDate: z.string().optional(),
  reason: z.string().optional(),
  conduct: z.string().default("Good"),
  remarks: z.string().optional(),
})

interface Params {
  params: Promise<{ schoolSlug: string; id: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
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
  const parsed = tcSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const student = await prisma.student.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
    include: { classSection: true },
  })

  if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })

  const count = await prisma.transferCertificate.count({
    where: { schoolId: session.user.schoolId },
  })

  const tcNumber = generateTCNumber(schoolSlug, count + 1)

  const tc = await prisma.transferCertificate.create({
    data: {
      schoolId: session.user.schoolId,
      studentId: student.id,
      tcNumber,
      leavingDate: new Date(parsed.data.leavingDate),
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : new Date(),
      reason: parsed.data.reason,
      conduct: parsed.data.conduct,
      remarks: parsed.data.remarks,
      issuedById: parseInt(session.user.id),
    },
    include: { student: { include: { classSection: true } }, issuedBy: true },
  })

  // Deactivate student after TC
  await prisma.student.update({
    where: { id: student.id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true, data: tc, message: "Transfer Certificate issued" }, { status: 201 })
}
