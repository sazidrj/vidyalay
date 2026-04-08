import { Role } from "@prisma/client"

const ROLE_HIERARCHY: Role[] = [
  Role.PARENT,
  Role.STUDENT,
  Role.TEACHER,
  Role.ADMIN,
  Role.SUPER_ADMIN,
]

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole)
}

export function requireRole(userRole: Role, requiredRole: Role): void {
  if (!hasPermission(userRole, requiredRole)) {
    throw new Error("Forbidden: insufficient role")
  }
}
