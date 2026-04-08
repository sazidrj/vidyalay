import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"

interface Props {
  params: Promise<{ school: string }>
}

export default async function StudentMarksPage({ params }: Props) {
  const { school } = await params
  const session = await auth()
  if (!session || session.user.schoolSlug !== school) redirect("/login")

  if (session.user.role !== Role.STUDENT) redirect(`/${school}/marks`)

  const student = await prisma.student.findFirst({
    where: { userId: parseInt(session.user.id), schoolId: session.user.schoolId },
  })

  if (!student) redirect("/login")

  const marks = await prisma.markEntry.findMany({
    where: { studentId: student.id, schoolId: session.user.schoolId },
    include: { exam: { include: { examType: true, subject: true } } },
    orderBy: { createdAt: "desc" },
  })

  // Group by exam type
  const grouped: Record<string, typeof marks> = {}
  marks.forEach((m) => {
    const key = m.exam.examType.name
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Marks</h1>
        <p className="text-gray-500 mt-1">{student.fullName}</p>
      </div>

      {marks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          No marks recorded yet.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([examTypeName, entries]) => (
            <div key={examTypeName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">{examTypeName}</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="px-4 py-3 font-medium text-gray-600">Subject</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Marks</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Grade</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((m) => {
                    const pct = (Number(m.marksObtained) / m.exam.examType.maxMarks) * 100
                    const passed = Number(m.marksObtained) >= m.exam.examType.passMarks
                    return (
                      <tr key={m.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{m.exam.subject?.name ?? "General"}</td>
                        <td className="px-4 py-3 font-mono">{Number(m.marksObtained)} / {m.exam.examType.maxMarks} <span className="text-gray-400 text-xs">({pct.toFixed(0)}%)</span></td>
                        <td className="px-4 py-3 font-bold text-indigo-700">{m.grade ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {passed ? "Pass" : "Fail"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
