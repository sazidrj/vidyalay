"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

interface Student { id: number; fullName: string; rollNumber: number | null }
interface Exam { id: number; examType: { name: string; maxMarks: number; passMarks: number }; classSection: { className: string; section: string } | null; subject: { name: string } | null; isPublished: boolean }
interface ExistingMark { studentId: number; marksObtained: number }

export default function MarksEntryPage() {
  const params = useParams<{ school: string; id: string }>()
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [marks, setMarks] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const examRes = await fetch(`/api/${params.school}/marks/exams/${params.id}`)
    const examData = await examRes.json()
    const exam: Exam = examData.data
    setExam(exam)

    if (exam?.classSection) {
      const [studRes, marksRes] = await Promise.all([
        fetch(`/api/${params.school}/students?classSectionId=${exam.classSection ? (exam as unknown as { classSectionId: number }).classSectionId : ""}&pageSize=100`).then((r) => r.json()),
        fetch(`/api/${params.school}/marks/exam/${params.id}`).then((r) => r.json()),
      ])

      const studentList: Student[] = studRes.data ?? []
      studentList.sort((a, b) => (a.rollNumber ?? 999) - (b.rollNumber ?? 999))
      setStudents(studentList)

      const existingMarks: ExistingMark[] = marksRes.data ?? []
      const markMap: Record<number, string> = {}
      existingMarks.forEach((m) => { markMap[m.studentId] = String(m.marksObtained) })
      setMarks(markMap)
    }
  }

  async function saveMarks() {
    if (!exam) return
    setSaving(true)
    setMessage("")

    const entries = students
      .filter((s) => marks[s.id] !== undefined && marks[s.id] !== "")
      .map((s) => ({ studentId: s.id, marksObtained: parseFloat(marks[s.id]) }))

    const res = await fetch(`/api/${params.school}/marks/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: parseInt(params.id), entries }),
    })

    const data = await res.json()
    setSaving(false)
    setMessage(data.message)
  }

  if (!exam) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Enter Marks</h1>
      </div>
      <p className="text-gray-500 mb-6">
        {exam.examType.name} · {exam.classSection ? `${exam.classSection.className} — ${exam.classSection.section}` : "All Classes"}
        {exam.subject && ` · ${exam.subject.name}`} · Max: {exam.examType.maxMarks} · Pass: {exam.examType.passMarks}
      </p>

      {students.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-5 text-sm">
          No students found for this class.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Roll No.</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Student Name</th>
                  <th className="px-4 py-3 font-medium text-gray-600 w-40">Marks (/{exam.examType.maxMarks})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500">{s.rollNumber ?? "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{s.fullName}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={exam.examType.maxMarks}
                        step={0.5}
                        value={marks[s.id] ?? ""}
                        onChange={(e) => setMarks((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="—"
                        className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={saveMarks}
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Marks"}
            </button>
            {message && <p className="text-sm text-green-700 font-medium">{message}</p>}
          </div>
        </>
      )}
    </div>
  )
}
