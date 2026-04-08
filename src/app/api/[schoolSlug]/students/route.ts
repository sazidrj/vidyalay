import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { studentSchema } from "@/lib/validations/student"
import { hasPermission } from "@/lib/permissions"
import { generateStudentUid } from "@/lib/utils/uid"
import { getTeacherAssignments } from "@/lib/utils/teacher-assignments"
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
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")
  const search = searchParams.get("search") ?? ""
  const classSectionId = searchParams.get("classSectionId")
  const isActive = searchParams.get("isActive") !== "false"
  const schoolId = session.user.schoolId

  // Teachers: scope to assigned classes only
  let allowedClassIds: number[] | null = null
  if (session.user.role === Role.TEACHER) {
    const assignments = await getTeacherAssignments(parseInt(session.user.id), schoolId)
    allowedClassIds = [...new Set(assignments.map((a) => a.classSectionId))]
  }

  const where = {
    schoolId,
    isActive,
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { studentUid: { contains: search, mode: "insensitive" as const } },
        { fatherName: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
      ],
    }),
    // Class filter: respect both teacher scope and explicit query param
    ...(allowedClassIds
      ? {
          classSectionId: classSectionId
            ? (allowedClassIds.includes(parseInt(classSectionId)) ? parseInt(classSectionId) : -1)
            : { in: allowedClassIds },
        }
      : classSectionId
      ? { classSectionId: parseInt(classSectionId) }
      : {}),
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { classSection: true },
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.student.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: students,
    message: "OK",
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  })
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
  const parsed = studentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const schoolId = session.user.schoolId
  const year = new Date().getFullYear()
  const count = await prisma.student.count({ where: { schoolId } })
  const studentUid = generateStudentUid(schoolSlug, year, count + 1)

  const student = await prisma.student.create({
    data: {
      ...parsed.data,
      schoolId,
      studentUid,
      dob: parsed.data.dob ? new Date(parsed.data.dob) : null,
      admissionDate: parsed.data.admissionDate ? new Date(parsed.data.admissionDate) : null,
    },
  })

  return NextResponse.json({ success: true, data: student, message: "Student admitted successfully" }, { status: 201 })
}
