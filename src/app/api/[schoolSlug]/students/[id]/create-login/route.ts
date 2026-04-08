import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

interface Params {
  params: Promise<{ schoolSlug: string; id: string }>
}

function generatePassword(length = 10): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug, id } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const student = await prisma.student.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
  })

  if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })

  if (student.userId) {
    return NextResponse.json({ success: false, message: "Student already has login access" }, { status: 409 })
  }

  const plainPassword = generatePassword()
  const hashedPassword = await bcrypt.hash(plainPassword, 12)

  // Use schoolSlug prefix to avoid username collisions across schools
  const username = `${schoolSlug}_${student.studentUid}`

  const user = await prisma.user.create({
    data: {
      schoolId: session.user.schoolId,
      username,
      fullName: student.fullName,
      hashedPassword,
      role: Role.STUDENT,
      isActive: true,
    },
  })

  await prisma.student.update({
    where: { id: student.id },
    data: { userId: user.id },
  })

  return NextResponse.json({
    success: true,
    data: {
      username,
      initialPassword: plainPassword, // shown once, not stored
    },
    message: "Login created. Share these credentials with the student.",
  }, { status: 201 })
}
