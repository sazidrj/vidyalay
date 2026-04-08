export function generateStudentUid(schoolSlug: string, year: number, sequence: number): string {
  const slug = schoolSlug.toUpperCase().slice(0, 6)
  const seq = String(sequence).padStart(4, "0")
  return `${slug}-${year}-${seq}`
}

export function generateReceiptNumber(schoolSlug: string, sequence: number): string {
  const slug = schoolSlug.toUpperCase().slice(0, 6)
  const seq = String(sequence).padStart(5, "0")
  const now = new Date()
  return `${slug}-RCP-${now.getFullYear()}-${seq}`
}

export function generateTCNumber(schoolSlug: string, sequence: number): string {
  const slug = schoolSlug.toUpperCase().slice(0, 6)
  const seq = String(sequence).padStart(4, "0")
  const now = new Date()
  return `${slug}-TC-${now.getFullYear()}-${seq}`
}
