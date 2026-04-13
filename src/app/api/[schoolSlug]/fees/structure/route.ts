import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"
import { z } from "zod"

interface Params {
  params: Promise<{ schoolSlug: string }>
}

const upsertSchema = z.object({
  feeTypeId: z.number().int().positive(),
  classSectionId: z.number().int().positive(),
  amount: z.number().min(0),
  dueDate: z.string().optional().nullable(),
  session: z.string().min(1),
})

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const { schoolSlug } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const academicSession = searchParams.get("session") ?? session.user.schoolSlug

  // Get current school session from school record
  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: { currentSession: true },
  })

  const structures = await prisma.feeStructure.findMany({
    where: {
      schoolId: session.user.schoolId,
      session: searchParams.get("session") ?? school?.currentSession ?? "",
    },
    include: {
      feeType: { select: { id: true, name: true, isMonthly: true } },
      classSection: { select: { id: true, className: true, section: true } },
    },
    orderBy: [{ classSection: { className: "asc" } }, { feeType: { name: "asc" } }],
  })

  return NextResponse.json({ success: true, data: structures, message: "OK" })
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
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Validation error" }, { status: 400 })
  }

  const { feeTypeId, classSectionId, amount, dueDate, session: academicSession } = parsed.data

  const structure = await prisma.feeStructure.upsert({
    where: {
      schoolId_feeTypeId_classSectionId_session: {
        schoolId: session.user.schoolId,
        feeTypeId,
        classSectionId,
        session: academicSession,
      },
    },
    update: { amount, dueDate: dueDate ? new Date(dueDate) : null },
    create: {
      schoolId: session.user.schoolId,
      feeTypeId,
      classSectionId,
      amount,
      dueDate: dueDate ? new Date(dueDate) : null,
      session: academicSession,
    },
  })

  return NextResponse.json({ success: true, data: structure, message: "Fee structure saved" })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get("id") ?? "0")
  if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 })

  await prisma.feeStructure.delete({ where: { id, schoolId: session.user.schoolId } })
  return NextResponse.json({ success: true, data: null, message: "Deleted" })
}
