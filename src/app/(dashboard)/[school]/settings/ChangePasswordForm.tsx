"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

export function ChangePasswordForm() {
  const params = useParams<{ school: string }>()
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match.")
      return
    }

    setSaving(true)
    const res = await fetch(`/api/me/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    })
    const d = await res.json()
    setSaving(false)

    if (d.success) {
      setMessage("Password changed successfully.")
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } else {
      setError(d.message)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h2 className="font-semibold text-gray-900 mb-1">Change Password</h2>
      <p className="text-sm text-gray-500 mb-4">Update your login password. You must enter your current password to confirm.</p>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
            required
            minLength={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Change Password"}
        </button>
      </form>
    </div>
  )
}
