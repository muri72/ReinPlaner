import { describe, it, expect, vi } from 'vitest'
import { getRoleDefaultRedirect } from '../services-rbac'

describe('RBAC Service', () => {
  describe('getRoleDefaultRedirect', () => {
    it('returns /dashboard for admin', () => {
      expect(getRoleDefaultRedirect('admin')).toBe('/dashboard')
    })

    it('returns /dashboard for platform_admin', () => {
      expect(getRoleDefaultRedirect('platform_admin')).toBe('/dashboard')
    })

    it('returns /dashboard/planning for manager', () => {
      expect(getRoleDefaultRedirect('manager')).toBe('/dashboard/planning')
    })

    it('returns /employee/dashboard for employee', () => {
      expect(getRoleDefaultRedirect('employee')).toBe('/employee/dashboard')
    })

    it('returns /portal/dashboard for customer', () => {
      expect(getRoleDefaultRedirect('customer')).toBe('/portal/dashboard')
    })

    it('returns /role-pending for unknown role', () => {
      expect(getRoleDefaultRedirect('unknown')).toBe('/role-pending')
    })

    it('returns /login for unrecognized strings', () => {
      expect(getRoleDefaultRedirect('something-else')).toBe('/login')
    })

    it('returns /login for null role', () => {
      expect(getRoleDefaultRedirect(null)).toBe('/login')
    })

    it('returns /login for undefined role', () => {
      expect(getRoleDefaultRedirect(undefined as unknown as string)).toBe('/login')
    })
  })
})

// Mock Supabase for tests that need it
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}))
