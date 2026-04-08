import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.flatten().fieldErrors.newPassword?.[0] ?? "Validation error" },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } })
  if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.hashedPassword)
  if (!isValid) {
    return NextResponse.json({ success: false, message: "Current password is incorrect" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: hashed } })

  return NextResponse.json({ success: true, data: null, message: "Password changed successfully" })
}
