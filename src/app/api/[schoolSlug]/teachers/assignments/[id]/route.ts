import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"

interface Params {
  params: Promise<{ schoolSlug: string; id: string }>
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

  const existing = await prisma.teacherAssignment.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
  })

  if (!existing) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  await prisma.teacherAssignment.delete({ where: { id: parseInt(id) } })

  return NextResponse.json({ success: true, data: null, message: "Assignment removed" })
}
