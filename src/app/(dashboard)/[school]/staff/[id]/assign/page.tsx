"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

interface ClassSection { id: number; className: string; section: string }
interface Subject { id: number; name: string }
interface Assignment {
  id: number
  isClassTeacher: boolean
  classSection: ClassSection
  subject: Subject | null
}

export default function AssignTeacherPage() {
  const params = useParams<{ school: string; id: string }>()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassSection[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [form, setForm] = useState({ classSectionId: "", subjectId: "", isClassTeacher: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [classRes, subjectRes, assignRes] = await Promise.all([
      fetch(`/api/${params.school}/classes`).then((r) => r.json()),
      fetch(`/api/${params.school}/subjects`).then((r) => r.json()),
      fetch(`/api/${params.school}/teachers/assignments?teacherId=${params.id}`).then((r) => r.json()),
    ])
    setClasses(classRes.data ?? [])
    setSubjects(subjectRes.data ?? [])
    setAssignments(assignRes.data ?? [])
  }

  async function addAssignment(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const res = await fetch(`/api/${params.school}/teachers/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: parseInt(params.id),
        classSectionId: parseInt(form.classSectionId),
        subjectId: form.isClassTeacher || !form.subjectId ? null : parseInt(form.subjectId),
        isClassTeacher: form.isClassTeacher,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (data.success) {
      setForm({ classSectionId: "", subjectId: "", isClassTeacher: false })
      loadData()
    } else {
      setError(data.message)
    }
  }

  async function removeAssignment(id: number) {
    await fetch(`/api/${params.school}/teachers/assignments/${id}`, { method: "DELETE" })
    loadData()
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Manage Class Assignments</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Add Assignment</h2>
        <form onSubmit={addAssignment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class <span className="text-red-500">*</span></label>
            <select
              value={form.classSectionId}
              onChange={(e) => setForm({ ...form, classSectionId: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.className} — {c.section}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isClassTeacher"
              checked={form.isClassTeacher}
              onChange={(e) => setForm({ ...form, isClassTeacher: e.target.checked, subjectId: "" })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <label htmlFor="isClassTeacher" className="text-sm font-medium text-gray-700">
              Assign as Class Teacher (can see all subjects for this class)
            </label>
          </div>

          {!form.isClassTeacher && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
              <select
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                required={!form.isClassTeacher}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add Assignment"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Current Assignments</h2>
        {assignments.length === 0 ? (
          <p className="text-gray-400 text-sm">No assignments yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{a.classSection.className} — {a.classSection.section}</span>
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="text-gray-600">{a.subject?.name ?? "All Subjects"}</span>
                  {a.isClassTeacher && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">Class Teacher</span>
                  )}
                </div>
                <button
                  onClick={() => removeAssignment(a.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
