import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  const classSectionId = searchParams.get("classSectionId")
  const studentId = searchParams.get("studentId")

  const where = {
    schoolId: session.user.schoolId,
    ...(date && { date: new Date(date) }),
    ...(classSectionId && {
      student: { classSectionId: parseInt(classSectionId) },
    }),
    ...(studentId && { studentId: parseInt(studentId) }),
  }

  const records = await prisma.attendance.findMany({
    where,
    include: { student: { select: { id: true, fullName: true, studentUid: true, rollNumber: true } } },
    orderBy: { student: { rollNumber: "asc" } },
  })

  return NextResponse.json({ success: true, data: records, message: "OK" })
}
