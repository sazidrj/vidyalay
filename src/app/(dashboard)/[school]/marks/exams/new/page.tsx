"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

interface ClassSection { id: number; className: string; section: string }
interface Subject { id: number; name: string }
interface ExamType { id: number; name: string; maxMarks: number }
interface Assignment { classSectionId: number; subjectId: number | null; isClassTeacher: boolean; classSection: ClassSection; subject: Subject | null }

export default function NewExamPage() {
  const params = useParams<{ school: string }>()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassSection[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isTeacher, setIsTeacher] = useState(false)
  const [form, setForm] = useState({ examTypeId: "", classSectionId: "", subjectId: "", examDate: "", session: "2025-26", isQuiz: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [classRes, subjectRes, examTypeRes, assignRes] = await Promise.all([
      fetch(`/api/${params.school}/classes`).then((r) => r.json()),
      fetch(`/api/${params.school}/subjects`).then((r) => r.json()),
      fetch(`/api/${params.school}/marks/exam-types`).then((r) => r.json()),
      fetch(`/api/${params.school}/teachers/assignments`).then((r) => r.json()),
    ])
    const assignData: Assignment[] = assignRes.data ?? []
    setIsTeacher(assignData.length > 0) // if has assignments, they are a teacher
    setAssignments(assignData)

    // If teacher, only show their assigned classes
    if (assignData.length > 0) {
      const allowedClassIds = [...new Set(assignData.map((a) => a.classSectionId))]
      const allClasses: ClassSection[] = classRes.data ?? []
      setClasses(allClasses.filter((c) => allowedClassIds.includes(c.id)))
    } else {
      setClasses(classRes.data ?? [])
    }

    setSubjects(subjectRes.data ?? [])
    setExamTypes(examTypeRes.data ?? [])
  }

  // Filter subjects for a teacher based on selected class
  function getAvailableSubjects(): Subject[] {
    if (!isTeacher || !form.classSectionId) return subjects
    const classId = parseInt(form.classSectionId)
    const classAssignments = assignments.filter((a) => a.classSectionId === classId)
    const isClassTeacher = classAssignments.some((a) => a.isClassTeacher)
    if (isClassTeacher) return subjects // class teacher sees all subjects
    const subjectIds = classAssignments.map((a) => a.subjectId).filter(Boolean) as number[]
    return subjects.filter((s) => subjectIds.includes(s.id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const res = await fetch(`/api/${params.school}/marks/exams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examTypeId: parseInt(form.examTypeId),
        classSectionId: form.classSectionId ? parseInt(form.classSectionId) : null,
        subjectId: form.subjectId ? parseInt(form.subjectId) : null,
        examDate: form.examDate || undefined,
        session: form.session,
        isQuiz: form.isQuiz,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (data.success) {
      router.push(`/${params.school}/marks`)
    } else {
      setError(data.message)
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Create Exam</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type <span className="text-red-500">*</span></label>
          <select
            value={form.examTypeId}
            onChange={(e) => setForm({ ...form, examTypeId: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select exam type</option>
            {examTypes.map((et) => (
              <option key={et.id} value={et.id}>{et.name} (Max: {et.maxMarks})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class <span className="text-red-500">*</span></label>
          <select
            value={form.classSectionId}
            onChange={(e) => setForm({ ...form, classSectionId: e.target.value, subjectId: "" })}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.className} — {c.section}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select
            value={form.subjectId}
            onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All subjects</option>
            {getAvailableSubjects().map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
          <input
            type="date"
            value={form.examDate}
            onChange={(e) => setForm({ ...form, examDate: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <input
            type="checkbox"
            id="isQuiz"
            checked={form.isQuiz}
            onChange={(e) => setForm({ ...form, isQuiz: e.target.checked })}
            className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded"
          />
          <div>
            <label htmlFor="isQuiz" className="text-sm font-medium text-gray-800 cursor-pointer">Private Quiz</label>
            <p className="text-xs text-gray-500 mt-0.5">Only you can see this exam and student scores. Not visible to other teachers or admin in their exam lists.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Exam"}
          </button>
          <button type="button" onClick={() => router.back()} className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
