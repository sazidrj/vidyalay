import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { feeTypeSchema } from "@/lib/validations/fee"
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

  const feeTypes = await prisma.feeType.findMany({
    where: { schoolId: session.user.schoolId, isActive: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ success: true, data: feeTypes, message: "OK" })
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
  const parsed = feeTypeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { applicableClasses, ...rest } = parsed.data
  const feeType = await prisma.feeType.create({
    data: {
      ...rest,
      schoolId: session.user.schoolId,
      ...(applicableClasses !== undefined && applicableClasses !== null
        ? { applicableClasses }
        : {}),
    },
  })

  return NextResponse.json({ success: true, data: feeType, message: "Fee type created" }, { status: 201 })
}
