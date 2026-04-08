"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

export default function NewStaffPage() {
  const params = useParams<{ school: string }>()
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    password: "",
    role: "TEACHER",
    email: "",
    phone: "",
    employeeId: "",
    subjectSpecialty: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const res = await fetch(`/api/${params.school}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    setSaving(false)

    if (d.success) {
      setCreated({ username: form.username, password: form.password })
    } else {
      setError(d.message)
    }
  }

  if (created) {
    return (
      <div className="p-6 max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Staff Account Created</h1>
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-green-900 mb-3">Share these credentials with the new staff member:</p>
          <div className="space-y-2">
            <div className="flex gap-3">
              <span className="text-sm text-green-700 w-28 shrink-0">School ID:</span>
              <code className="font-mono text-sm bg-green-100 px-2 py-0.5 rounded">{params.school}</code>
            </div>
            <div className="flex gap-3">
              <span className="text-sm text-green-700 w-28 shrink-0">Username:</span>
              <code className="font-mono text-sm bg-green-100 px-2 py-0.5 rounded">{created.username}</code>
            </div>
            <div className="flex gap-3">
              <span className="text-sm text-green-700 w-28 shrink-0">Password:</span>
              <code className="font-mono text-sm bg-green-100 px-2 py-0.5 rounded">{created.password}</code>
            </div>
          </div>
          <p className="text-xs text-green-600 mt-3">Ask them to change the password after first login.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setCreated(null); setForm({ fullName: "", username: "", password: "", role: "TEACHER", email: "", phone: "", employeeId: "", subjectSpecialty: "" }) }}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Add Another
          </button>
          <button
            onClick={() => router.push(`/${params.school}/staff`)}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Go to Staff List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Staff</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
            <input
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
              placeholder="e.g. ramesh_k"
              required
              minLength={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">Letters, numbers, underscore only</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
            <input
              value={form.employeeId}
              onChange={e => setForm({ ...form, employeeId: e.target.value })}
              placeholder="e.g. EMP002"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="email@school.edu"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="9876543210"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {form.role === "TEACHER" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Specialty</label>
              <input
                value={form.subjectSpecialty}
                onChange={e => setForm({ ...form, subjectSpecialty: e.target.value })}
                placeholder="e.g. Mathematics"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
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
            {saving ? "Creating..." : "Create Account"}
          </button>
          <button type="button" onClick={() => router.back()} className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
