import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { feeRecordSchema } from "@/lib/validations/fee"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"

interface Params {
  params: Promise<{ schoolSlug: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const studentId = searchParams.get("studentId")
  const classSectionId = searchParams.get("classSectionId")
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")

  const where = {
    schoolId: session.user.schoolId,
    ...(status && { status: status as "PENDING" | "PAID" | "PARTIAL" | "WAIVED" }),
    ...(studentId && { studentId: parseInt(studentId) }),
    ...(classSectionId && { student: { classSectionId: parseInt(classSectionId) } }),
  }

  const [records, total] = await Promise.all([
    prisma.feeRecord.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, studentUid: true } },
        feeType: true,
        transactions: { orderBy: { paidDate: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feeRecord.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: records,
    message: "OK",
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  })
}

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
  const parsed = feeRecordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const record = await prisma.feeRecord.create({
    data: {
      ...parsed.data,
      schoolId: session.user.schoolId,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
    include: { student: true, feeType: true },
  })

  return NextResponse.json({ success: true, data: record, message: "Fee record created" }, { status: 201 })
}
