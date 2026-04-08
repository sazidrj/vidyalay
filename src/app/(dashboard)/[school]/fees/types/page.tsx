"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface FeeType {
  id: number
  name: string
  description: string | null
  amount: number
  isMonthly: boolean
}

const emptyForm = { name: "", description: "", amount: "", isMonthly: false }

export default function FeeTypesPage() {
  const params = useParams<{ school: string }>()
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadFeeTypes() }, [])

  async function loadFeeTypes() {
    setLoading(true)
    const r = await fetch(`/api/${params.school}/fees/types`)
    const d = await r.json()
    setFeeTypes(d.data ?? [])
    setLoading(false)
  }

  function startEdit(ft: FeeType) {
    setEditingId(ft.id)
    setForm({ name: ft.name, description: ft.description ?? "", amount: String(ft.amount), isMonthly: ft.isMonthly })
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
      description: form.description || undefined,
      amount: parseFloat(form.amount),
      isMonthly: form.isMonthly,
    }

    const url = editingId
      ? `/api/${params.school}/fees/types/${editingId}`
      : `/api/${params.school}/fees/types`

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
      loadFeeTypes()
    } else {
      setMessage(d.message)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this fee type? It won't appear in new records.")) return
    const res = await fetch(`/api/${params.school}/fees/types/${id}`, { method: "DELETE" })
    const d = await res.json()
    if (d.success) loadFeeTypes()
    else alert(d.message)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${params.school}/fees`} className="text-gray-400 hover:text-gray-700 text-sm">← Fees</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Types</h1>
          <p className="text-gray-500 mt-1">Manage fee categories available for your school</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            + Add Fee Type
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-sm">{message}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editingId ? "Edit Fee Type" : "New Fee Type"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Tuition Fee"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 2500"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMonthly"
                checked={form.isMonthly}
                onChange={e => setForm({ ...form, isMonthly: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
              />
              <label htmlFor="isMonthly" className="text-sm text-gray-700">Monthly fee (charged every month)</label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
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
        ) : feeTypes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No fee types yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {feeTypes.map(ft => (
                <tr key={ft.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{ft.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-900">₹{Number(ft.amount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ft.isMonthly ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>
                      {ft.isMonthly ? "Monthly" : "One-time"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{ft.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(ft)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                      <button onClick={() => handleDelete(ft.id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
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
