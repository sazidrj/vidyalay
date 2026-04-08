import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Params {
  params: Promise<{ schoolSlug: string; id: string }>
}

// Get all mark entries for a specific exam
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const { schoolSlug, id } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const entries = await prisma.markEntry.findMany({
    where: { examId: parseInt(id), schoolId: session.user.schoolId },
    include: { student: { select: { id: true, fullName: true, rollNumber: true } } },
    orderBy: { student: { rollNumber: "asc" } },
  })

  return NextResponse.json({ success: true, data: entries, message: "OK" })
}
