"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface ExamType {
  id: number
  name: string
  maxMarks: number
  passMarks: number
  weightPct: number
}

const emptyForm = { name: "", maxMarks: "100", passMarks: "33", weightPct: "100" }

export default function ExamTypesPage() {
  const params = useParams<{ school: string }>()
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadExamTypes() }, [])

  async function loadExamTypes() {
    setLoading(true)
    const r = await fetch(`/api/${params.school}/marks/exam-types`)
    const d = await r.json()
    setExamTypes(d.data ?? [])
    setLoading(false)
  }

  function startEdit(et: ExamType) {
    setEditingId(et.id)
    setForm({ name: et.name, maxMarks: String(et.maxMarks), passMarks: String(et.passMarks), weightPct: String(et.weightPct) })
    setShowForm(true)
    setMessage("")
  }

  function cancelForm() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(false)
    setMessage("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    const payload = {
      name: form.name,
      maxMarks: parseInt(form.maxMarks),
      passMarks: parseInt(form.passMarks),
      weightPct: parseInt(form.weightPct),
    }

    const url = editingId
      ? `/api/${params.school}/marks/exam-types/${editingId}`
      : `/api/${params.school}/marks/exam-types`

    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const d = await res.json()
    setSaving(false)

    if (d.success) {
      setMessage(d.message)
      cancelForm()
      loadExamTypes()
    } else {
      setMessage(d.message)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this exam type? Existing exams using it won't be affected.")) return
    const res = await fetch(`/api/${params.school}/marks/exam-types/${id}`, { method: "DELETE" })
    const d = await res.json()
    if (d.success) loadExamTypes()
    else alert(d.message)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${params.school}/marks`} className="text-gray-400 hover:text-gray-700 text-sm">← Marks</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Types</h1>
          <p className="text-gray-500 mt-1">Define exam categories available to teachers</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            + Add Exam Type
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-sm">{message}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editingId ? "Edit Exam Type" : "New Exam Type"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Unit Test 1"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
                <input type="number" min="1" value={form.maxMarks} onChange={e => setForm({ ...form, maxMarks: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pass Marks</label>
                <input type="number" min="0" value={form.passMarks} onChange={e => setForm({ ...form, passMarks: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight %</label>
                <input type="number" min="1" max="100" value={form.weightPct} onChange={e => setForm({ ...form, weightPct: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-gray-400 mt-1">Contribution to final grade</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={cancelForm} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : examTypes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No exam types yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Max Marks</th>
                <th className="px-4 py-3 font-medium text-gray-600">Pass Marks</th>
                <th className="px-4 py-3 font-medium text-gray-600">Weight</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {examTypes.map(et => (
                <tr key={et.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{et.name}</td>
                  <td className="px-4 py-3 text-gray-700">{et.maxMarks}</td>
                  <td className="px-4 py-3 text-gray-700">{et.passMarks}</td>
                  <td className="px-4 py-3 text-gray-700">{et.weightPct}%</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(et)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                      <button onClick={() => handleDelete(et.id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
