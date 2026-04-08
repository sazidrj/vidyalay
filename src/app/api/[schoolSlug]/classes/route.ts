import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { z } from "zod"
import { Role } from "@prisma/client"

const classSectionSchema = z.object({
  className: z.string().min(1),
  section: z.string().min(1).max(5),
})

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

  const classes = await prisma.classSection.findMany({
    where: { schoolId: session.user.schoolId, isActive: true },
    orderBy: [{ className: "asc" }, { section: "asc" }],
  })

  return NextResponse.json({ success: true, data: classes, message: "OK" })
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
  const parsed = classSectionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existing = await prisma.classSection.findFirst({
    where: {
      schoolId: session.user.schoolId,
      className: parsed.data.className,
      section: parsed.data.section,
    },
  })

  if (existing) {
    return NextResponse.json({ success: false, message: "Class section already exists" }, { status: 409 })
  }

  const classSection = await prisma.classSection.create({
    data: { ...parsed.data, schoolId: session.user.schoolId },
  })

  return NextResponse.json({ success: true, data: classSection, message: "Class created" }, { status: 201 })
}
