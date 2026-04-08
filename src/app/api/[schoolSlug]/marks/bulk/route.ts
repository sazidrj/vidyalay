import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { bulkMarksSchema } from "@/lib/validations/marks"
import { hasPermission } from "@/lib/permissions"
import { calculateGrade } from "@/lib/utils/grade"
import { getTeacherAssignments, canTeacherActOnExam } from "@/lib/utils/teacher-assignments"
import { Role } from "@prisma/client"

interface Params {
  params: Promise<{ schoolSlug: string }>
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
  const parsed = bulkMarksSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { examId, entries } = parsed.data
  const schoolId = session.user.schoolId

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    include: { examType: true },
  })

  if (!exam) return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 })

  // Teachers can only enter marks for their assigned class/subject
  if (session.user.role === Role.TEACHER) {
    const assignments = await getTeacherAssignments(parseInt(session.user.id), schoolId)
    const allowed = canTeacherActOnExam(assignments, exam.classSectionId, exam.subjectId)
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "You can only enter marks for your assigned class and subject" },
        { status: 403 }
      )
    }
  }

  const results = await prisma.$transaction(
    entries.map((entry) =>
      prisma.markEntry.upsert({
        where: { studentId_examId: { studentId: entry.studentId, examId } },
        create: {
          schoolId,
          studentId: entry.studentId,
          examId,
          marksObtained: entry.marksObtained,
          grade: calculateGrade(entry.marksObtained, exam.examType.maxMarks),
          remarks: entry.remarks,
          enteredById: parseInt(session.user.id),
        },
        update: {
          marksObtained: entry.marksObtained,
          grade: calculateGrade(entry.marksObtained, exam.examType.maxMarks),
          remarks: entry.remarks,
          enteredById: parseInt(session.user.id),
        },
      })
    )
  )

  return NextResponse.json({
    success: true,
    data: { count: results.length },
    message: `Marks saved for ${results.length} students`,
  })
}
