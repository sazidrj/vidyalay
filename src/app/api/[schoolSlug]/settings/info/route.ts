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

  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: { id: true, name: true, slug: true, currentSession: true },
  })

  return NextResponse.json({ success: true, data: school, message: "OK" })
}
