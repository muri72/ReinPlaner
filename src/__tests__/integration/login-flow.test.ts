/**
 * Integration tests for login flow and RBAC redirects
 * 
 * Tests the role-based redirect logic and authentication flow
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRoleDefaultRedirect } from '@/lib/services-rbac'

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null
      })
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}))

describe('Login Flow - RBAC Redirects', () => {
  describe('getRoleDefaultRedirect', () => {
    it('redirects admin to /dashboard', () => {
      expect(getRoleDefaultRedirect('admin')).toBe('/dashboard')
    })

    it('redirects platform_admin to /dashboard', () => {
      expect(getRoleDefaultRedirect('platform_admin')).toBe('/dashboard')
    })

    it('redirects manager to /dashboard/planning', () => {
      expect(getRoleDefaultRedirect('manager')).toBe('/dashboard/planning')
    })

    it('redirects employee to /employee/dashboard', () => {
      expect(getRoleDefaultRedirect('employee')).toBe('/employee/dashboard')
    })

    it('redirects customer to /portal/dashboard', () => {
      expect(getRoleDefaultRedirect('customer')).toBe('/portal/dashboard')
    })

    it('redirects unknown role to /role-pending', () => {
      expect(getRoleDefaultRedirect('unknown')).toBe('/role-pending')
    })

    it('redirects null role to /login', () => {
      expect(getRoleDefaultRedirect(null)).toBe('/login')
    })

    it('redirects undefined role to /login', () => {
      expect(getRoleDefaultRedirect(undefined as unknown as string)).toBe('/login')
    })

    it('redirects unrecognized string to /login', () => {
      expect(getRoleDefaultRedirect('random_string')).toBe('/login')
    })
  })

  describe('Auth Flow Integration', () => {
    it('handles complete admin redirect chain', () => {
      const roles = ['admin', 'platform_admin']
      roles.forEach(role => {
        const redirect = getRoleDefaultRedirect(role)
        expect(redirect).toBe('/dashboard')
        expect(redirect).not.toBe('/login')
        expect(redirect).not.toBe('/role-pending')
      })
    })

    it('handles complete non-admin redirect chain', () => {
      const roleRedirects: Record<string, string> = {
        manager: '/dashboard/planning',
        employee: '/employee/dashboard',
        customer: '/portal/dashboard',
      }

      Object.entries(roleRedirects).forEach(([role, expected]) => {
        const redirect = getRoleDefaultRedirect(role)
        expect(redirect).toBe(expected)
      })
    })

    it('validates redirect paths are absolute', () => {
      const allRoles = ['admin', 'platform_admin', 'manager', 'employee', 'customer', 'unknown', null, undefined as unknown as string]
      
      allRoles.forEach(role => {
        const redirect = getRoleDefaultRedirect(role)
        expect(redirect).toMatch(/^\//)
      })
    })
  })
})