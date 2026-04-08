"use client"

import { useState, useEffect } from "react"

interface School { id: number; name: string; slug: string; plan: string; isActive: boolean; createdAt: string }

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", slug: "", email: "", phone: "", plan: "basic" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { loadSchools() }, [])

  async function loadSchools() {
    const r = await fetch("/api/schools")
    const d = await r.json()
    setSchools(d.data ?? [])
  }

  async function createSchool(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (data.success) {
      setShowForm(false)
      setForm({ name: "", slug: "", email: "", phone: "", plan: "basic" })
      loadSchools()
    } else {
      setError(data.message)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Schools</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
          + Onboard School
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">New School</h2>
          <form onSubmit={createSchool} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "School Name", field: "name", required: true },
              { label: "Slug (login ID)", field: "slug", required: true },
              { label: "Email", field: "email" },
              { label: "Phone", field: "phone" },
            ].map(({ label, field, required }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
                <input
                  value={form[field as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  required={required}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            {error && <div className="sm:col-span-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                {saving ? "Creating..." : "Create School"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200 text-left">
            <th className="px-4 py-3 font-medium text-gray-600">School</th>
            <th className="px-4 py-3 font-medium text-gray-600">Login Slug</th>
            <th className="px-4 py-3 font-medium text-gray-600">Plan</th>
            <th className="px-4 py-3 font-medium text-gray-600">Created</th>
            <th className="px-4 py-3 font-medium text-gray-600">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {schools.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.slug}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{s.plan}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(s.createdAt).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${s.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
