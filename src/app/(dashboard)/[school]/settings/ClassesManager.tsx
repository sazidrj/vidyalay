"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

interface ClassSection { id: number; className: string; section: string; isActive: boolean }

export function ClassesManager() {
  const params = useParams<{ school: string }>()
  const [classes, setClasses] = useState<ClassSection[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ className: "", section: "A" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadClasses() }, [])

  async function loadClasses() {
    setLoading(true)
    const r = await fetch(`/api/${params.school}/classes`)
    const d = await r.json()
    setClasses(d.data ?? [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch(`/api/${params.school}/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ className: form.className.trim(), section: form.section.trim() || "A" }),
    })
    const d = await res.json()
    setSaving(false)
    if (d.success) {
      setForm({ className: "", section: "A" })
      setShowForm(false)
      loadClasses()
    } else {
      setError(d.message)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Classes</h2>
          <p className="text-sm text-gray-500 mt-0.5">Add all classes in your school. These are used in Fee Structure, Students, Attendance, and Marks.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setError("") }}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            + Add Class
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Class Name <span className="text-red-500">*</span></label>
              <input
                value={form.className}
                onChange={e => setForm(f => ({ ...f, className: e.target.value }))}
                placeholder="e.g. 1, 2, 3 ... 10, 11, 12"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
              <input
                value={form.section}
                onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                placeholder="A"
                maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">Leave A if only one section</p>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Adding..." : "Add Class"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError("") }}
              className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-gray-400">No classes added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {classes.map(c => (
            <span key={c.id} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-medium text-indigo-800">
              Class {c.className}{c.section !== "A" ? `-${c.section}` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
