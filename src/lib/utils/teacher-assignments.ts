import { prisma } from "@/lib/prisma"
import { TeacherAssignment } from "@prisma/client"

export async function getTeacherAssignments(teacherId: number, schoolId: number) {
  return prisma.teacherAssignment.findMany({
    where: { teacherId, schoolId },
    include: { classSection: true, subject: true },
  })
}

export function canTeacherActOnClass(
  assignments: TeacherAssignment[],
  classSectionId: number | null | undefined
): boolean {
  if (!classSectionId) return false
  return assignments.some((a) => a.classSectionId === classSectionId)
}

export function canTeacherActOnExam(
  assignments: TeacherAssignment[],
  classSectionId: number | null | undefined,
  subjectId: number | null | undefined
): boolean {
  if (!classSectionId) return false
  return assignments.some((a) => {
    if (a.classSectionId !== classSectionId) return false
    // Class teacher can act on any subject in their class
    if (a.isClassTeacher) return true
    // Subject teacher can only act on their subject
    if (!subjectId) return false
    return a.subjectId === subjectId
  })
}
