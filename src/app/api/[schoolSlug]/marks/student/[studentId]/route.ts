import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Params {
  params: Promise<{ schoolSlug: string; studentId: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const { schoolSlug, studentId } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const marks = await prisma.markEntry.findMany({
    where: { studentId: parseInt(studentId), schoolId: session.user.schoolId },
    include: { exam: { include: { examType: true, subject: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: marks, message: "OK" })
}
