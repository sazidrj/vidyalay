import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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

  const exam = await prisma.exam.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
    include: { examType: true, classSection: true, subject: true },
  })

  if (!exam) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: exam, message: "OK" })
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

  const exam = await prisma.exam.update({
    where: { id: parseInt(id) },
    data: { isPublished: body.isPublished },
  })

  return NextResponse.json({ success: true, data: exam, message: "Exam updated" })
}
