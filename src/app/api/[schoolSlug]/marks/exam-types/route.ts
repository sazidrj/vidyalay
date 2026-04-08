import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { examTypeSchema } from "@/lib/validations/marks"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"

interface Params {
  params: Promise<{ schoolSlug: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const { schoolSlug } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const examTypes = await prisma.examType.findMany({
    where: { schoolId: session.user.schoolId, isActive: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ success: true, data: examTypes, message: "OK" })
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
  const parsed = examTypeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const examType = await prisma.examType.create({
    data: { ...parsed.data, schoolId: session.user.schoolId },
  })

  return NextResponse.json({ success: true, data: examType, message: "Exam type created" }, { status: 201 })
}
