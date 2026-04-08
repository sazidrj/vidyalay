export function calculateGrade(marks: number, maxMarks: number): string {
  const pct = (marks / maxMarks) * 100
  if (pct >= 91) return "A+"
  if (pct >= 81) return "A"
  if (pct >= 71) return "B+"
  if (pct >= 61) return "B"
  if (pct >= 51) return "C+"
  if (pct >= 41) return "C"
  if (pct >= 33) return "D"
  return "F"
}

export function gradeToPoint(grade: string): number {
  const map: Record<string, number> = {
    "A+": 10, A: 9, "B+": 8, B: 7, "C+": 6, C: 5, D: 4, F: 0,
  }
  return map[grade] ?? 0
}
