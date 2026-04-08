import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTeacherAssignments } from "@/lib/utils/teacher-assignments"
import { Role } from "@prisma/client"

interface Props {
  params: Promise<{ school: string }>
}

export default async function MarksPage({ params }: Props) {
  const { school } = await params
  const session = await auth()
  if (!session || session.user.schoolSlug !== school) redirect("/login")

  const schoolId = session.user.schoolId
  const role = session.user.role as Role
  const userId = parseInt(session.user.id)

  // Teachers only see exams for their assigned classes
  let classSectionIds: number[] | null = null
  if (role === Role.TEACHER) {
    const assignments = await getTeacherAssignments(userId, schoolId)
    classSectionIds = [...new Set(assignments.map((a) => a.classSectionId))]
  }

  const exams = await prisma.exam.findMany({
    where: {
      schoolId,
      session: "2025-26",
      ...(classSectionIds && { classSectionId: { in: classSectionIds } }),
      // Teachers only see their own quizzes; admins see all
      ...(role === Role.TEACHER && {
        OR: [
          { isQuiz: false },
          { isQuiz: true, createdById: userId },
        ],
      }),
    },
    include: { examType: true, classSection: true, subject: true },
    orderBy: { examDate: "desc" },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks & Exams</h1>
          <p className="text-gray-500 mt-1">Session 2025-26</p>
        </div>
        <div className="flex gap-2">
          {role === Role.ADMIN && (
            <Link
              href={`/${school}/marks/exam-types`}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Exam Types
            </Link>
          )}
          <Link
            href={`/${school}/marks/exams/new`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            + Create Exam
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-600">Exam Type</th>
              <th className="px-4 py-3 font-medium text-gray-600">Class</th>
              <th className="px-4 py-3 font-medium text-gray-600">Subject</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {exams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No exams created yet.{" "}
                  <Link href={`/${school}/marks/exams/new`} className="text-indigo-600 hover:underline">Create one</Link>
                </td>
              </tr>
            ) : (
              exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {exam.examType.name}
                    {exam.isQuiz && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Quiz</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {exam.classSection ? `${exam.classSection.className} - ${exam.classSection.section}` : "All"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{exam.subject?.name ?? "All"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {exam.examDate ? new Date(exam.examDate).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${exam.isPublished ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {exam.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/${school}/marks/exams/${exam.id}`} className="text-indigo-600 hover:underline text-xs font-medium">
                      Enter Marks
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
