export interface APIResponse<T> {
  success: boolean
  data: T | null
  message: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  message: string
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
