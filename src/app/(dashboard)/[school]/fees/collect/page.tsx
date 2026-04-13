"use client"

import { Fragment, useState } from "react"
import { useParams } from "next/navigation"

interface Student { id: number; fullName: string; studentUid: string; fatherName: string; classSectionId: number | null; classSection: { id: number; className: string; section: string } | null }
interface FeeType { id: number; name: string; amount: number }
interface FeeStructure { feeTypeId: number; classSectionId: number; amount: number; dueDate: string | null }
interface PaymentTx { id: number; amount: number; paymentMode: string; paidDate: string; receiptNumber: string | null }
interface FeeRecord {
  id: number
  amountDue: number
  amountPaid: number
  concessionAmt: number
  status: string
  feeType: { name: string }
  dueDate: string | null
  transactions: PaymentTx[]
}

export default function CollectFeePage() {
  const params = useParams<{ school: string }>()
  const [search, setSearch] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Student | null>(null)
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([])
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([])
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [searching, setSearching] = useState(false)
  const [payForm, setPayForm] = useState<{ recordId: number; amount: string; mode: string; balance: number } | null>(null)
  const [newFeeForm, setNewFeeForm] = useState<{ feeTypeId: string; dueDate: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  async function searchStudents() {
    if (!search.trim()) return
    setSearching(true)
    const r = await fetch(`/api/${params.school}/students?search=${encodeURIComponent(search)}&pageSize=10`)
    const d = await r.json()
    setStudents(d.data ?? [])
    setSearching(false)
  }

  async function selectStudent(student: Student) {
    setSelected(student)
    setStudents([])
    setSearch(student.fullName)
    setMessage("")
    const [feesRes, typesRes, infoRes] = await Promise.all([
      fetch(`/api/${params.school}/fees/records?studentId=${student.id}&pageSize=50`).then(r => r.json()),
      fetch(`/api/${params.school}/fees/types`).then(r => r.json()),
      fetch(`/api/${params.school}/settings/info`).then(r => r.json()),
    ])
    setFeeRecords(feesRes.data ?? [])
    setFeeTypes(typesRes.data ?? [])
    // Load fee structures for this student's class
    const currentSession = infoRes.data?.currentSession ?? ""
    if (currentSession) {
      const structRes = await fetch(`/api/${params.school}/fees/structure?session=${encodeURIComponent(currentSession)}`)
      const structData = await structRes.json()
      setFeeStructures(structData.data ?? [])
    }
  }

  async function collectPayment() {
    if (!payForm) return
    setSaving(true)
    setMessage("")
    const res = await fetch(`/api/${params.school}/fees/records/${payForm.recordId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountPaid: parseFloat(payForm.amount),
        paymentMode: payForm.mode,
        paidDate: new Date().toISOString().split("T")[0],
      }),
    })
    const d = await res.json()
    setSaving(false)
    setPayForm(null)
    setMessage(d.message)
    if (d.success && selected) selectStudent(selected)
  }

  function getAmountForClass(feeTypeId: number): number {
    const classId = selected?.classSectionId ?? selected?.classSection?.id
    if (classId) {
      const structure = feeStructures.find(s => s.feeTypeId === feeTypeId && s.classSectionId === classId)
      if (structure) return Number(structure.amount)
    }
    // Fall back to FeeType default amount
    const ft = feeTypes.find(f => f.id === feeTypeId)
    return Number(ft?.amount ?? 0)
  }

  function getDueDateForClass(feeTypeId: number): string | undefined {
    const classId = selected?.classSectionId ?? selected?.classSection?.id
    if (!classId) return undefined
    const structure = feeStructures.find(s => s.feeTypeId === feeTypeId && s.classSectionId === classId)
    return structure?.dueDate?.slice(0, 10) ?? undefined
  }

  async function createFeeRecord() {
    if (!newFeeForm || !selected) return
    setSaving(true)
    const feeTypeId = parseInt(newFeeForm.feeTypeId)
    const amountDue = getAmountForClass(feeTypeId)
    const structureDueDate = getDueDateForClass(feeTypeId)
    const res = await fetch(`/api/${params.school}/fees/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selected.id,
        feeTypeId,
        amountDue,
        dueDate: newFeeForm.dueDate || structureDueDate || undefined,
      }),
    })
    const d = await res.json()
    setSaving(false)
    setNewFeeForm(null)
    setMessage(d.message)
    if (d.success) selectStudent(selected)
  }

  const statusStyle: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PAID: "bg-green-100 text-green-800",
    PARTIAL: "bg-blue-100 text-blue-800",
    WAIVED: "bg-gray-100 text-gray-600",
  }

  // Summary totals
  const totalDue = feeRecords.reduce((s, r) => s + Number(r.amountDue) - Number(r.concessionAmt), 0)
  const totalPaid = feeRecords.reduce((s, r) => s + Number(r.amountPaid), 0)
  const totalBalance = totalDue - totalPaid

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Collect Fee</h1>
        <p className="text-gray-500 mt-1">Search for a student to view and collect fees</p>
      </div>

      {/* Student search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchStudents()}
            placeholder="Search by name, student ID, or father's name..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={searchStudents} disabled={searching}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
            {searching ? "Searching..." : "Search"}
          </button>
        </div>
        {students.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 shadow-sm">
            {students.map(s => (
              <button key={s.id} onClick={() => selectStudent(s)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{s.fullName}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-mono">{s.studentUid}</span>
                    <span className="mx-1.5 text-gray-300">·</span>
                    s/o {s.fatherName}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{s.classSection ? `${s.classSection.className}-${s.classSection.section}` : "—"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">
              {selected.fullName} <span className="text-gray-400 font-normal text-sm">({selected.studentUid})</span>
            </h2>
            <button onClick={() => setNewFeeForm({ feeTypeId: "", dueDate: "" })}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition">
              + Add Fee Record
            </button>
          </div>

          {/* Summary bar */}
          {feeRecords.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total Due", value: totalDue, color: "text-gray-900" },
                { label: "Total Paid", value: totalPaid, color: "text-green-700" },
                { label: "Balance", value: totalBalance, color: totalBalance > 0 ? "text-red-600 font-bold" : "text-green-700" },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className={`text-lg font-semibold ${item.color}`}>₹{item.value.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          )}

          {message && <div className="mb-3 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-sm">{message}</div>}

          {/* Add fee record form */}
          {newFeeForm && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
              <h3 className="font-medium text-gray-900 mb-3">New Fee Record</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fee Type</label>
                  <select value={newFeeForm.feeTypeId} onChange={e => setNewFeeForm({ ...newFeeForm, feeTypeId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="">Select fee type</option>
                    {feeTypes.map(ft => {
                      const amt = getAmountForClass(ft.id)
                      return <option key={ft.id} value={ft.id}>{ft.name} — ₹{amt.toLocaleString("en-IN")}</option>
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                  <input type="date" value={newFeeForm.dueDate} onChange={e => setNewFeeForm({ ...newFeeForm, dueDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={createFeeRecord} disabled={saving || !newFeeForm.feeTypeId}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Create"}
                </button>
                <button onClick={() => setNewFeeForm(null)} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {/* Fee records */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Fee Type</th>
                <th className="px-4 py-3 font-medium text-gray-600">Due</th>
                <th className="px-4 py-3 font-medium text-gray-600">Paid</th>
                <th className="px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {feeRecords.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No fee records. Add one above.</td></tr>
                ) : feeRecords.map(r => {
                  const balance = Number(r.amountDue) - Number(r.amountPaid) - Number(r.concessionAmt)
                  const isExpanded = expandedId === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{r.feeType.name}</div>
                          {r.transactions.length > 0 && (
                            <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                              className="text-xs text-indigo-500 hover:underline mt-0.5">
                              {isExpanded ? "Hide" : `${r.transactions.length} payment${r.transactions.length > 1 ? "s" : ""}`}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">₹{Number(r.amountDue).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 font-mono text-sm text-green-700">₹{Number(r.amountPaid).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-red-600">{balance > 0 ? `₹${balance.toLocaleString("en-IN")}` : "—"}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle[r.status]}`}>{r.status}</span></td>
                        <td className="px-4 py-3">
                          {r.status !== "PAID" && r.status !== "WAIVED" && (
                            <button onClick={() => setPayForm({ recordId: r.id, amount: String(balance), mode: "cash", balance })}
                              className="text-xs text-indigo-600 hover:underline font-medium">Collect</button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && r.transactions.length > 0 && (
                        <tr className="bg-indigo-50">
                          <td colSpan={6} className="px-6 pb-3 pt-1">
                            <p className="text-xs font-semibold text-indigo-700 mb-2">Payment History</p>
                            <div className="space-y-1">
                              {r.transactions.map(tx => (
                                <div key={tx.id} className="flex items-center gap-4 text-xs text-gray-700 bg-white rounded px-3 py-1.5 border border-indigo-100">
                                  <span className="font-mono font-semibold text-green-700">₹{Number(tx.amount).toLocaleString("en-IN")}</span>
                                  <span className="uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tx.paymentMode}</span>
                                  <span>{new Date(tx.paidDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                  {tx.receiptNumber && <span className="text-gray-400">#{tx.receiptNumber}</span>}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Payment modal */}
          {payForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
                <h3 className="font-semibold text-gray-900 mb-1">Record Payment</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Balance remaining: <span className="font-semibold text-red-600">₹{payForm.balance.toLocaleString("en-IN")}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">You can collect partial amount — remaining will stay as balance.</span>
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Collecting (₹)</label>
                    <input type="number" value={payForm.amount}
                      onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                      max={payForm.balance}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    {parseFloat(payForm.amount) < payForm.balance && parseFloat(payForm.amount) > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        ₹{(payForm.balance - parseFloat(payForm.amount)).toLocaleString("en-IN")} will remain as balance
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                    <select value={payForm.mode} onChange={e => setPayForm({ ...payForm, mode: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {["cash", "upi", "cheque", "dd", "online"].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={collectPayment} disabled={saving || !parseFloat(payForm.amount)}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Confirm Payment"}
                  </button>
                  <button onClick={() => setPayForm(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
