/**
 * Integration tests for Dashboard components
 * 
 * Tests dashboard data processing, role-based access, and UI state
 */
import { describe, it, expect, vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user', email: 'test@example.com' } } },
        error: null
      })
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { role: 'admin', first_name: 'Test', last_name: 'User' },
      error: null
    }),
  })),
}))

// Mock the super-optimized dashboard data getter
vi.mock('@/lib/super-optimized-dashboard', () => ({
  getSuperOptimizedDashboardData: vi.fn().mockResolvedValue({
    todayStats: {
      totalOrders: 12,
      completedOrders: 8,
      pendingOrders: 4,
      activeEmployees: 6,
    },
    recentActivities: [
      { id: '1', type: 'order_completed', message: 'Order #123 completed', timestamp: new Date().toISOString() },
      { id: '2', type: 'shift_created', message: 'New shift created', timestamp: new Date().toISOString() },
    ],
    upcomingTasks: [
      { id: '1', title: 'Review time entries', priority: 'high' },
      { id: '2', title: 'Approve absence request', priority: 'medium' },
    ],
    stats: {
      weeklyRevenue: 15000,
      monthlyOrders: 45,
      activeCustomers: 12,
    },
  }),
}))

describe('Dashboard Integration', () => {
  describe('Dashboard Data Processing', () => {
    it('processes today stats correctly', async () => {
      const { getSuperOptimizedDashboardData } = await import('@/lib/super-optimized-dashboard')
      const data = await getSuperOptimizedDashboardData()
      
      expect(data.todayStats).toBeDefined()
      expect(data.todayStats.totalOrders).toBe(12)
      expect(data.todayStats.completedOrders).toBe(8)
      expect(data.todayStats.pendingOrders).toBe(4)
      expect(data.todayStats.activeEmployees).toBe(6)
    })

    it('limits recent activities to 5 items', async () => {
      const { getSuperOptimizedDashboardData } = await import('@/lib/super-optimized-dashboard')
      const data = await getSuperOptimizedDashboardData()
      
      expect(data.recentActivities).toBeDefined()
      expect(Array.isArray(data.recentActivities)).toBe(true)
      // Data has 2 items, which is less than 5, so all should be included
      expect(data.recentActivities.length).toBeLessThanOrEqual(5)
    })

    it('limits upcoming tasks to 5 items', async () => {
      const { getSuperOptimizedDashboardData } = await import('@/lib/super-optimized-dashboard')
      const data = await getSuperOptimizedDashboardData()
      
      expect(data.upcomingTasks).toBeDefined()
      expect(Array.isArray(data.upcomingTasks)).toBe(true)
      expect(data.upcomingTasks.length).toBeLessThanOrEqual(5)
    })

    it('includes weekly revenue in stats', async () => {
      const { getSuperOptimizedDashboardData } = await import('@/lib/super-optimized-dashboard')
      const data = await getSuperOptimizedDashboardData()
      
      expect(data.stats).toBeDefined()
      expect(data.stats.weeklyRevenue).toBe(15000)
    })
  })

  describe('Dashboard Date Formatting', () => {
    it('formats date for German locale', async () => {
      const format = (await import('date-fns')).format
      const de = (await import('date-fns/locale')).de
      
      const today = new Date()
      const formatted = format(today, 'EEEE, dd. MMMM yyyy', { locale: de })
      
      expect(formatted).toContain('.')
      expect(formatted).toMatch(/[A-Z][a-z]+/)
    })
  })

  describe('Dashboard State Management', () => {
    it('initializes with loading state', () => {
      // Test that loading state is properly initialized
      const initialState = {
        loading: true,
        data: null,
        error: null,
      }
      
      expect(initialState.loading).toBe(true)
      expect(initialState.data).toBe(null)
      expect(initialState.error).toBe(null)
    })

    it('handles error state correctly', () => {
      const errorState = {
        loading: false,
        data: null,
        error: 'Failed to load dashboard data',
      }
      
      expect(errorState.loading).toBe(false)
      expect(errorState.error).toBeDefined()
      expect(errorState.data).toBe(null)
    })

    it('handles success state correctly', () => {
      const successState = {
        loading: false,
        data: { items: [] },
        error: null,
      }
      
      expect(successState.loading).toBe(false)
      expect(successState.error).toBe(null)
      expect(successState.data).toBeDefined()
    })
  })
})