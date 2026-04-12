-- Performance indexes for common query patterns

-- Time entries: frequently filtered by employee and date range
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date 
ON time_entries(employee_id, start_time DESC);

-- Time entries: order lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_order 
ON time_entries(order_id);

-- Shifts: date-based queries for planning calendar
CREATE INDEX IF NOT EXISTS idx_shifts_date 
ON shifts(shift_date);

-- Shifts: assignment lookups
CREATE INDEX IF NOT EXISTS idx_shifts_assignment 
ON shifts(assignment_id);

-- Shift employees: quick employee shift lookup
CREATE INDEX IF NOT EXISTS idx_shift_employees_employee 
ON shift_employees(employee_id);

-- Shift employees: quick shift team lookup
CREATE INDEX IF NOT EXISTS idx_shift_employees_shift 
ON shift_employees(shift_id);

-- Orders: status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

-- Orders: customer lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer 
ON orders(customer_id);

-- Employees: user association
CREATE INDEX IF NOT EXISTS idx_employees_user 
ON employees(user_id);

-- Employees: status filtering for active employees
CREATE INDEX IF NOT EXISTS idx_employees_status 
ON employees(status);

-- Customer contacts: customer association
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer 
ON customer_contacts(customer_id);

-- Order employee assignments: order lookups
CREATE INDEX IF NOT EXISTS idx_order_employee_assignments_order 
ON order_employee_assignments(order_id);

-- Order employee assignments: employee lookups
CREATE INDEX IF NOT EXISTS idx_order_employee_assignments_employee 
ON order_employee_assignments(employee_id);

-- Notifications: user and unread status
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, created_at DESC) 
WHERE read_at IS NULL;

-- Shift overrides: assignment and date lookups
CREATE INDEX IF NOT EXISTS idx_shift_overrides_assignment_date 
ON shift_overrides(assignment_id, shift_date);

-- Analysis: Check if indexes already exist before creating (idempotent)
-- The above statements use IF NOT EXISTS so they're safe to re-run
