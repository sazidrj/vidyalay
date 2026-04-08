"use client"

import { useState, useEffect } from "react"

interface School { id: number; name: string; slug: string; plan: string; isActive: boolean; email: string | null; phone: string | null; createdAt: string }
interface Credentials { username: string; password: string; schoolSlug: string }

const emptyForm = { name: "", slug: "", email: "", phone: "", plan: "basic" }

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [newCredentials, setNewCredentials] = useState<Credentials | null>(null)

  // Credentials modal state
  const [credModal, setCredModal] = useState<{ school: School; currentUsername: string } | null>(null)
  const [credForm, setCredForm] = useState({ username: "", password: "" })
  const [credSaving, setCredSaving] = useState(false)
  const [credError, setCredError] = useState("")
  const [credSuccess, setCredSuccess] = useState("")

  useEffect(() => { loadSchools() }, [])

  async function loadSchools() {
    const r = await fetch("/api/schools")
    const d = await r.json()
    setSchools(d.data ?? [])
  }

  async function openCredModal(school: School) {
    setCredError("")
    setCredSuccess("")
    const r = await fetch(`/api/schools/${school.id}/admin`)
    const d = await r.json()
    const currentUsername = d.data?.username ?? `${school.slug}_admin`
    setCredForm({ username: currentUsername, password: "" })
    setCredModal({ school, currentUsername })
  }

  async function resetPassword() {
    if (!credModal) return
    // Generate a random password — super admin never knows what it is, only sees it once to share
    const random = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase()
    setCredSaving(true)
    setCredError("")
    setCredSuccess("")

    const res = await fetch(`/api/schools/${credModal.school.id}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: random }),
    })
    const d = await res.json()
    setCredSaving(false)

    if (d.success) {
      setCredSuccess(`Password reset. Share this with the school admin (shown once): ${random}`)
    } else {
      setCredError(d.message)
    }
  }

  async function saveUsername() {
    if (!credModal || credForm.username === credModal.currentUsername) {
      setCredError("Username is unchanged.")
      return
    }
    setCredSaving(true)
    setCredError("")
    setCredSuccess("")

    const res = await fetch(`/api/schools/${credModal.school.id}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: credForm.username }),
    })
    const d = await res.json()
    setCredSaving(false)

    if (d.success) {
      setCredSuccess("Username updated.")
      setCredModal(prev => prev ? { ...prev, currentUsername: credForm.username } : null)
    } else {
      setCredError(d.message)
    }
  }

  function startEdit(s: School) {
    setEditingId(s.id)
    setForm({ name: s.name, slug: s.slug, email: s.email ?? "", phone: s.phone ?? "", plan: s.plan })
    setShowForm(true)
    setError("")
    setNewCredentials(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const res = await fetch(editingId ? `/api/schools/${editingId}` : "/api/schools", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)

    if (data.success) {
      cancelForm()
      loadSchools()
      if (data.data?.adminCredentials) {
        setNewCredentials({ ...data.data.adminCredentials, schoolSlug: data.data.school.slug })
      }
    } else {
      setError(data.message)
    }
  }

  async function toggleActive(school: School) {
    await fetch(`/api/schools/${school.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !school.isActive }),
    })
    loadSchools()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Schools</h1>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Onboard School
          </button>
        )}
      </div>

      {/* Credentials banner after creation */}
      {newCredentials && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-green-900 mb-3">School created! Share these login credentials with the school admin:</p>
              <div className="space-y-2">
                {[
                  { label: "School ID", value: newCredentials.schoolSlug },
                  { label: "Username", value: newCredentials.username },
                  { label: "Password", value: newCredentials.password },
                ].map(item => (
                  <div key={item.label} className="flex gap-3 items-center">
                    <span className="text-sm text-green-700 w-24">{item.label}:</span>
                    <code className="font-mono text-sm bg-green-100 px-2 py-0.5 rounded">{item.value}</code>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-3">Password is shown only once. You can always reset it using the "Credentials" button.</p>
            </div>
            <button onClick={() => setNewCredentials(null)} className="text-green-400 hover:text-green-700 text-xl font-bold leading-none">×</button>
          </div>
        </div>
      )}

      {/* School form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editingId ? "Edit School" : "New School"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "School Name", field: "name", required: true },
              { label: "School ID (slug)", field: "slug", required: !editingId, disabled: !!editingId, hint: editingId ? "Cannot change after creation" : "Lowercase letters/numbers/hyphens. e.g. mhi-school" },
              { label: "Email", field: "email" },
              { label: "Phone", field: "phone" },
            ].map(({ label, field, required, disabled, hint }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
                <input
                  value={form[field as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  required={required}
                  disabled={disabled}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            {error && <div className="sm:col-span-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create School"}
              </button>
              <button type="button" onClick={cancelForm}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schools table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200 text-left">
            <th className="px-4 py-3 font-medium text-gray-600">School</th>
            <th className="px-4 py-3 font-medium text-gray-600">Login ID</th>
            <th className="px-4 py-3 font-medium text-gray-600">Plan</th>
            <th className="px-4 py-3 font-medium text-gray-600">Created</th>
            <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {schools.filter(s => s.slug !== "platform").map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{s.name}</p>
                  {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.slug}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{s.plan}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(s.createdAt).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${s.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(s)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                    <button onClick={() => openCredModal(s)} className="text-amber-600 hover:underline text-xs font-medium">Credentials</button>
                    <button onClick={() => toggleActive(s)} className={`text-xs font-medium hover:underline ${s.isActive ? "text-red-500" : "text-green-600"}`}>
                      {s.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credentials modal */}
      {credModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Admin Credentials</h3>
              <button onClick={() => setCredModal(null)} className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              School: <span className="font-medium text-gray-800">{credModal.school.name}</span>
            </p>

            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="flex gap-2">
                  <input
                    value={credForm.username}
                    onChange={e => setCredForm(f => ({ ...f, username: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button onClick={saveUsername} disabled={credSaving}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
                    Save
                  </button>
                </div>
              </div>

              {/* Password reset */}
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-900 mb-1">Reset Password</p>
                <p className="text-xs text-amber-700 mb-3">
                  Generates a random password and shows it once — you share it with the school. Super admin cannot set a known password.
                </p>
                <button onClick={resetPassword} disabled={credSaving}
                  className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                  {credSaving ? "Resetting..." : "Generate New Password"}
                </button>
              </div>
            </div>

            {credError && <p className="text-sm text-red-600 mt-3">{credError}</p>}
            {credSuccess && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <p className="text-sm text-green-800 font-medium">{credSuccess}</p>
              </div>
            )}

            <div className="mt-5">
              <button onClick={() => { setCredModal(null); setCredSuccess("") }}
                className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
