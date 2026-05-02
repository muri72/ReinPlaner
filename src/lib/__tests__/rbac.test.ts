import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRoleDefaultRedirect } from '../services-rbac'

describe('RBAC Service', () => {
  describe('getRoleDefaultRedirect', () => {
    it('should return /dashboard for admin role', () => {
      expect(getRoleDefaultRedirect('admin')).toBe('/dashboard')
    })

    it('should return /dashboard/planning for manager role', () => {
      expect(getRoleDefaultRedirect('manager')).toBe('/dashboard/planning')
    })

    it('should return /dashboard/time-tracking for employee role', () => {
      expect(getRoleDefaultRedirect('employee')).toBe('/dashboard/time-tracking')
    })

    it('should return /dashboard for customer role', () => {
      expect(getRoleDefaultRedirect('customer')).toBe('/dashboard')
    })

    it('should return /login for unknown role', () => {
      expect(getRoleDefaultRedirect('unknown')).toBe('/login')
    })

    it('should return /login for null role', () => {
      expect(getRoleDefaultRedirect(null)).toBe('/login')
    })

    it('should return /login for undefined role', () => {
      expect(getRoleDefaultRedirect(undefined)).toBe('/login')
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
