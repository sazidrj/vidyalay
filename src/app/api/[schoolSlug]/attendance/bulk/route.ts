import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { bulkAttendanceSchema } from "@/lib/validations/attendance"
import { hasPermission } from "@/lib/permissions"
import { getTeacherAssignments, canTeacherActOnClass } from "@/lib/utils/teacher-assignments"
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
  const parsed = bulkAttendanceSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { date, classSectionId, records } = parsed.data
  const schoolId = session.user.schoolId

  // Teachers can only mark attendance for their assigned classes
  if (session.user.role === Role.TEACHER) {
    const assignments = await getTeacherAssignments(parseInt(session.user.id), schoolId)
    if (!canTeacherActOnClass(assignments, classSectionId)) {
      return NextResponse.json(
        { success: false, message: "You can only mark attendance for your assigned classes" },
        { status: 403 }
      )
    }
  }

  const attendanceDate = new Date(date)

  const results = await prisma.$transaction(
    records.map((record) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: record.studentId, date: attendanceDate } },
        create: {
          schoolId,
          studentId: record.studentId,
          date: attendanceDate,
          status: record.status,
          remarks: record.remarks,
          markedById: parseInt(session.user.id),
        },
        update: {
          status: record.status,
          remarks: record.remarks,
          markedById: parseInt(session.user.id),
        },
      })
    )
  )

  return NextResponse.json({
    success: true,
    data: { count: results.length },
    message: `Attendance marked for ${results.length} students`,
  })
}
