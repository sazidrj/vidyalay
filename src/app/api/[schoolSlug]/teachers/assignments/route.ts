import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { z } from "zod"
import { Role } from "@prisma/client"

const assignmentSchema = z.object({
  teacherId: z.number().int().positive(),
  classSectionId: z.number().int().positive(),
  subjectId: z.number().int().positive().optional().nullable(),
  isClassTeacher: z.boolean().default(false),
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

  const { searchParams } = new URL(req.url)
  let teacherId = searchParams.get("teacherId") ? parseInt(searchParams.get("teacherId")!) : null

  // Teachers can only see their own assignments
  if (session.user.role === Role.TEACHER) {
    teacherId = parseInt(session.user.id)
  }

  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(teacherId && { teacherId }),
    },
    include: {
      teacher: { select: { id: true, fullName: true, username: true } },
      classSection: true,
      subject: true,
    },
    orderBy: [{ classSection: { className: "asc" } }],
  })

  return NextResponse.json({ success: true, data: assignments, message: "OK" })
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
  const parsed = assignmentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { teacherId, classSectionId, subjectId, isClassTeacher } = parsed.data
  const schoolId = session.user.schoolId

  // Validate class teacher rules
  if (isClassTeacher) {
    if (subjectId) {
      return NextResponse.json(
        { success: false, message: "Class teacher assignment must not have a subject" },
        { status: 400 }
      )
    }
    // Check only one class teacher per class
    const existing = await prisma.teacherAssignment.findFirst({
      where: { schoolId, classSectionId, isClassTeacher: true },
      include: { teacher: { select: { fullName: true } } },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, message: `${existing.teacher.fullName} is already the class teacher for this class` },
        { status: 409 }
      )
    }
  }

  const assignment = await prisma.teacherAssignment.create({
    data: { schoolId, teacherId, classSectionId, subjectId: subjectId ?? null, isClassTeacher },
    include: { classSection: true, subject: true },
  })

  return NextResponse.json({ success: true, data: assignment, message: "Assignment created" }, { status: 201 })
}
