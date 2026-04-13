"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface FeeType { id: number; name: string; isMonthly: boolean }
interface ClassSection { id: number; className: string; section: string }
interface FeeStructure {
  id: number
  feeTypeId: number
  classSectionId: number
  amount: number
  dueDate: string | null
  session: string
}

export default function FeeStructurePage() {
  const params = useParams<{ school: string }>()
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([])
  const [classes, setClasses] = useState<ClassSection[]>([])
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [session, setSession] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null) // "feeTypeId-classSectionId"
  const [editCell, setEditCell] = useState<{ feeTypeId: number; classSectionId: number; amount: string; dueDate: string } | null>(null)

  useEffect(() => {
    async function init() {
      const schoolRes = await fetch(`/api/${params.school}/settings/info`)
      const schoolData = await schoolRes.json()
      const currentSession = schoolData.data?.currentSession ?? new Date().getFullYear() + "-" + (new Date().getFullYear() + 1).toString().slice(2)
      setSession(currentSession)

      const [ftRes, clRes] = await Promise.all([
        fetch(`/api/${params.school}/fees/types`),
        fetch(`/api/${params.school}/classes`),
      ])
      const [ftData, clData] = await Promise.all([ftRes.json(), clRes.json()])
      setFeeTypes(ftData.data ?? [])
      setClasses(clData.data ?? [])
      setLoading(false)
    }
    init()
  }, [params.school])

  const loadStructures = useCallback(async () => {
    if (!session) return
    const res = await fetch(`/api/${params.school}/fees/structure?session=${encodeURIComponent(session)}`)
    const d = await res.json()
    setStructures(d.data ?? [])
  }, [params.school, session])

  useEffect(() => { loadStructures() }, [loadStructures])

  function getStructure(feeTypeId: number, classSectionId: number) {
    return structures.find(s => s.feeTypeId === feeTypeId && s.classSectionId === classSectionId)
  }

  function startEdit(feeTypeId: number, classSectionId: number) {
    const existing = getStructure(feeTypeId, classSectionId)
    setEditCell({
      feeTypeId,
      classSectionId,
      amount: existing ? String(existing.amount) : "",
      dueDate: existing?.dueDate?.slice(0, 10) ?? "",
    })
  }

  async function saveCell() {
    if (!editCell) return
    const key = `${editCell.feeTypeId}-${editCell.classSectionId}`
    setSaving(key)

    await fetch(`/api/${params.school}/fees/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeTypeId: editCell.feeTypeId,
        classSectionId: editCell.classSectionId,
        amount: parseFloat(editCell.amount) || 0,
        dueDate: editCell.dueDate || null,
        session,
      }),
    })

    await loadStructures()
    setSaving(null)
    setEditCell(null)
  }

  async function deleteStructure(feeTypeId: number, classSectionId: number) {
    const existing = getStructure(feeTypeId, classSectionId)
    if (!existing) return
    await fetch(`/api/${params.school}/fees/structure?id=${existing.id}`, { method: "DELETE" })
    await loadStructures()
  }

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="mb-1">
            <Link href={`/${params.school}/fees`} className="text-gray-400 hover:text-gray-700 text-sm">← Fees</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Structure</h1>
          <p className="text-gray-500 mt-1 text-sm">Set fee amounts per class for session <span className="font-medium text-gray-700">{session}</span></p>
        </div>
      </div>

      {feeTypes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6">
          No fee types found. <Link href={`/${params.school}/fees/types`} className="underline font-medium">Add fee types first →</Link>
        </div>
      )}

      {classes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6">
          No classes found. Add classes first from your school setup.
        </div>
      )}

      {feeTypes.length > 0 && classes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 font-medium text-gray-600 text-left whitespace-nowrap sticky left-0 bg-gray-50 z-10 min-w-[140px]">
                  Fee Type
                </th>
                {classes.map(c => (
                  <th key={c.id} className="px-3 py-3 font-medium text-gray-600 text-center whitespace-nowrap min-w-[120px]">
                    {c.className}{c.section !== "A" ? `-${c.section}` : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {feeTypes.map(ft => (
                <tr key={ft.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 sticky left-0 bg-white hover:bg-gray-50 z-10 border-r border-gray-100">
                    <p className="font-medium text-gray-900">{ft.name}</p>
                    <p className="text-xs text-gray-400">{ft.isMonthly ? "Monthly" : "One-time"}</p>
                  </td>
                  {classes.map(c => {
                    const structure = getStructure(ft.id, c.id)
                    const cellKey = `${ft.id}-${c.id}`
                    const isEditing = editCell?.feeTypeId === ft.id && editCell?.classSectionId === c.id
                    const isSaving = saving === cellKey

                    if (isEditing) {
                      return (
                        <td key={c.id} className="px-2 py-2 text-center">
                          <div className="space-y-1">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editCell.amount}
                              onChange={e => setEditCell(prev => prev ? { ...prev, amount: e.target.value } : null)}
                              placeholder="Amount ₹"
                              className="w-full border border-indigo-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <input
                              type="date"
                              value={editCell.dueDate}
                              onChange={e => setEditCell(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={saveCell}
                                disabled={isSaving}
                                className="flex-1 bg-indigo-600 text-white rounded px-2 py-1 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {isSaving ? "..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditCell(null)}
                                className="flex-1 border border-gray-300 text-gray-600 rounded px-2 py-1 text-xs hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      )
                    }

                    return (
                      <td
                        key={c.id}
                        className="px-3 py-3 text-center cursor-pointer group"
                        onClick={() => startEdit(ft.id, c.id)}
                      >
                        {structure ? (
                          <div>
                            <p className="font-medium text-gray-900">₹{Number(structure.amount).toLocaleString("en-IN")}</p>
                            {structure.dueDate && (
                              <p className="text-xs text-gray-400">Due: {new Date(structure.dueDate).toLocaleDateString("en-IN")}</p>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteStructure(ft.id, c.id) }}
                              className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 mt-0.5"
                            >
                              remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300 group-hover:text-indigo-400 text-xs">+ set amount</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">Click any cell to set or edit the fee amount for that class. Due date is optional.</p>
    </div>
  )
}
