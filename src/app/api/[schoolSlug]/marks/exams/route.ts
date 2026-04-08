import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { examSchema } from "@/lib/validations/marks"
import { hasPermission } from "@/lib/permissions"
import { getTeacherAssignments, canTeacherActOnExam } from "@/lib/utils/teacher-assignments"
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

  const { searchParams } = new URL(req.url)
  const sessionParam = searchParams.get("session") ?? "2025-26"
  const schoolId = session.user.schoolId

  let classSectionIds: number[] | null = null

  // Teachers only see exams for their assigned classes
  if (session.user.role === Role.TEACHER) {
    const assignments = await getTeacherAssignments(parseInt(session.user.id), schoolId)
    classSectionIds = [...new Set(assignments.map((a) => a.classSectionId))]
    if (classSectionIds.length === 0) {
      return NextResponse.json({ success: true, data: [], message: "No class assignments found" })
    }
  }

  const teacherId = session.user.role === Role.TEACHER ? parseInt(session.user.id) : null

  const exams = await prisma.exam.findMany({
    where: {
      schoolId,
      session: sessionParam,
      ...(classSectionIds && { classSectionId: { in: classSectionIds } }),
      // Quizzes are private — teachers only see their own; admins see all
      ...(teacherId && {
        OR: [
          { isQuiz: false },
          { isQuiz: true, createdById: teacherId },
        ],
      }),
    },
    include: { examType: true, classSection: true, subject: true },
    orderBy: { examDate: "desc" },
  })

  return NextResponse.json({ success: true, data: exams, message: "OK" })
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.TEACHER)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = examSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const schoolId = session.user.schoolId

  // Teachers can only create exams for their assigned classes/subjects
  if (session.user.role === Role.TEACHER) {
    const assignments = await getTeacherAssignments(parseInt(session.user.id), schoolId)
    const allowed = canTeacherActOnExam(assignments, parsed.data.classSectionId, parsed.data.subjectId)
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "You can only create exams for your assigned class and subject" },
        { status: 403 }
      )
    }
  }

  const exam = await prisma.exam.create({
    data: {
      ...parsed.data,
      schoolId,
      examDate: parsed.data.examDate ? new Date(parsed.data.examDate) : null,
      createdById: parseInt(session.user.id),
    },
    include: { examType: true, classSection: true, subject: true },
  })

  return NextResponse.json({ success: true, data: exam, message: "Exam created" }, { status: 201 })
}
