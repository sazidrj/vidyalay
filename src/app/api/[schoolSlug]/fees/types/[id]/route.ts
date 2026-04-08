import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { feeTypeSchema } from "@/lib/validations/fee"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"

interface Params {
  params: Promise<{ schoolSlug: string; id: string }>
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
  const parsed = feeTypeSchema.partial().safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existing = await prisma.feeType.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
  })
  if (!existing) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  const { applicableClasses, ...rest } = parsed.data
  const updated = await prisma.feeType.update({
    where: { id: parseInt(id) },
    data: {
      ...rest,
      ...(applicableClasses !== undefined && applicableClasses !== null
        ? { applicableClasses }
        : {}),
    },
  })

  return NextResponse.json({ success: true, data: updated, message: "Fee type updated" })
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

  const existing = await prisma.feeType.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
  })
  if (!existing) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  await prisma.feeType.update({ where: { id: parseInt(id) }, data: { isActive: false } })

  return NextResponse.json({ success: true, data: null, message: "Fee type deleted" })
}
