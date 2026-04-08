import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { z } from "zod"

interface Params {
  params: Promise<{ id: string }>
}

const schema = z.object({
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscore only").optional(),
  password: z.string().min(6).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const school = await prisma.school.findUnique({ where: { id: parseInt(id) } })
  if (!school) return NextResponse.json({ success: false, message: "School not found" }, { status: 404 })

  // Find the school's admin user
  const admin = await prisma.user.findFirst({
    where: { schoolId: school.id, role: Role.ADMIN },
    orderBy: { createdAt: "asc" },
  })
  if (!admin) return NextResponse.json({ success: false, message: "No admin user found for this school" }, { status: 404 })

  // Check new username isn't taken by another user
  if (parsed.data.username && parsed.data.username !== admin.username) {
    const taken = await prisma.user.findUnique({ where: { username: parsed.data.username } })
    if (taken) return NextResponse.json({ success: false, message: "Username already taken" }, { status: 409 })
  }

  const updateData: Record<string, string> = {}
  if (parsed.data.username) updateData.username = parsed.data.username
  if (parsed.data.password) updateData.hashedPassword = await bcrypt.hash(parsed.data.password, 12)

  const updated = await prisma.user.update({
    where: { id: admin.id },
    data: updateData,
    select: { id: true, username: true, fullName: true },
  })

  return NextResponse.json({ success: true, data: updated, message: "Admin credentials updated" })
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const school = await prisma.school.findUnique({ where: { id: parseInt(id) } })
  if (!school) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  const admin = await prisma.user.findFirst({
    where: { schoolId: school.id, role: Role.ADMIN },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, fullName: true },
  })

  return NextResponse.json({ success: true, data: admin, message: "OK" })
}
