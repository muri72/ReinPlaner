# Manager-Berechtigungen - Erweiterte Architektur

## 🎯 Anforderung

**Manager können nur auf zugewiesene Kunden und deren Mitarbeiter zugreifen**

Ein Manager sieht nur:
- Kunden, für die er verantwortlich ist
- Mitarbeiter, die diesen Kunden zugeordnet sind
- Aufträge dieser Kunden
- Objekte dieser Kunden

---

## 📊 Neue Datenbank-Struktur

### Manager-Customer Assignment Table

```sql
-- Tabelle für Manager-Kunden-Zuordnung
CREATE TABLE manager_customer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  UNIQUE(manager_id, customer_id)
);

CREATE INDEX idx_manager_customer_manager ON manager_customer_assignments(manager_id, is_active);
CREATE INDEX idx_manager_customer_customer ON manager_customer_assignments(customer_id);

-- RLS für manager_customer_assignments
ALTER TABLE manager_customer_assignments ENABLE ROW LEVEL SECURITY;

-- Manager sehen ihre Zuordnungen
CREATE POLICY "manager_assignments_select_own"
  ON manager_customer_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN employees e ON e.user_id = p.id
      WHERE p.id = auth.uid() 
        AND p.role = 'manager'
        AND e.id = manager_customer_assignments.manager_id
    )
  );

-- Admins sehen alle Zuordnungen
CREATE POLICY "manager_assignments_select_admin"
  ON manager_customer_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Nur Admins können Zuordnungen erstellen/ändern
CREATE POLICY "manager_assignments_modify_admin"
  ON manager_customer_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 🔒 Aktualisierte RLS-Policies für Manager

### Customers Table - Manager sehen nur zugewiesene Kunden

```sql
-- ERSETZE die bestehende Manager-Policy:
DROP POLICY IF EXISTS "customers_select_admin_manager" ON customers;

-- Admin sieht alle Kunden
CREATE POLICY "customers_select_admin"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Manager sehen nur zugewiesene Kunden
CREATE POLICY "customers_select_manager"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN employees e ON e.user_id = p.id
      JOIN manager_customer_assignments mca ON mca.manager_id = e.id
      WHERE p.id = auth.uid() 
        AND p.role = 'manager'
        AND mca.customer_id = customers.id
        AND mca.is_active = TRUE
    )
  );
```

### Orders Table - Manager sehen nur Aufträge zugewiesener Kunden

```sql
-- ERSETZE die bestehende Manager-Policy:
DROP POLICY IF EXISTS "orders_select_admin_manager" ON orders;

-- Admin sieht alle Aufträge
CREATE POLICY "orders_select_admin"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Manager sehen nur Aufträge ihrer zugewiesenen Kunden
CREATE POLICY "orders_select_manager"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN employees e ON e.user_id = p.id
      JOIN manager_customer_assignments mca ON mca.manager_id = e.id
      WHERE p.id = auth.uid() 
        AND p.role = 'manager'
        AND mca.customer_id = orders.customer_id
        AND mca.is_active = TRUE
    )
  );
```

### Employees Table - Manager sehen nur Mitarbeiter ihrer Kunden

```sql
-- ERSETZE die bestehende Manager-Policy:
DROP POLICY IF EXISTS "employees_select_admin_manager" ON employees;

-- Admin sieht alle Mitarbeiter
CREATE POLICY "employees_select_admin"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Manager sehen nur Mitarbeiter, die ihren zugewiesenen Kunden zugeordnet sind
CREATE POLICY "employees_select_manager"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN employees e ON e.user_id = p.id
      JOIN manager_customer_assignments mca ON mca.manager_id = e.id
      WHERE p.id = auth.uid() 
        AND p.role = 'manager'
        AND mca.is_active = TRUE
        AND EXISTS (
          -- Mitarbeiter ist einem Auftrag des zugewiesenen Kunden zugeordnet
          SELECT 1 FROM order_employee_assignments oea
          JOIN orders o ON o.id = oea.order_id
          WHERE oea.employee_id = employees.id
            AND o.customer_id = mca.customer_id
        )
    )
  );
```

### Objects Table - Manager sehen nur Objekte zugewiesener Kunden

```sql
-- ERSETZE die bestehende Manager-Policy:
DROP POLICY IF EXISTS "objects_select_admin_manager" ON objects;

-- Admin sieht alle Objekte
CREATE POLICY "objects_select_admin"
  ON objects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Manager sehen nur Objekte ihrer zugewiesenen Kunden
CREATE POLICY "objects_select_manager"
  ON objects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN employees e ON e.user_id = p.id
      JOIN manager_customer_assignments mca ON mca.manager_id = e.id
      WHERE p.id = auth.uid() 
        AND p.role = 'manager'
        AND mca.is_active = TRUE
        AND EXISTS (
          -- Objekt gehört zu einem Auftrag des zugewiesenen Kunden
          SELECT 1 FROM orders o
          WHERE o.object_id = objects.id
            AND o.customer_id = mca.customer_id
        )
    )
  );
```

### Time Entries - Manager sehen nur Zeiteinträge ihrer Mitarbeiter

```sql
-- ERSETZE die bestehende Manager-Policy:
DROP POLICY IF EXISTS "time_entries_select_admin_manager" ON time_entries;

-- Admin sieht alle Zeiteinträge
CREATE POLICY "time_entries_select_admin"
  ON time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Manager sehen nur Zeiteinträge von Mitarbeitern ihrer zugewiesenen Kunden
CREATE POLICY "time_entries_select_manager"
  ON time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN employees e ON e.user_id = p.id
      JOIN manager_customer_assignments mca ON mca.manager_id = e.id
      WHERE p.id = auth.uid() 
        AND p.role = 'manager'
        AND mca.is_active = TRUE
        AND EXISTS (
          -- Zeiteintrag gehört zu einem Mitarbeiter eines zugewiesenen Kunden
          SELECT 1 FROM employees emp
          JOIN order_employee_assignments oea ON oea.employee_id = emp.id
          JOIN orders o ON o.id = oea.order_id
          WHERE emp.user_id = time_entries.user_id
            AND o.customer_id = mca.customer_id
        )
    )
  );
```

---

## 🔧 UI für Manager-Zuordnungen

### Admin-Interface für Zuordnungsverwaltung

**Neue Komponente:** `src/components/manager-customer-assignment-dialog.tsx`

```typescript
"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Manager {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
}

interface Customer {
  id: string;
  name: string;
  assigned: boolean;
}

export function ManagerCustomerAssignmentDialog({ 
  manager, 
  open, 
  onOpenChange 
}: { 
  manager: Manager; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCustomers();
    }
  }, [open, manager.id]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/managers/${manager.id}/customers`);
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      toast.error("Fehler beim Laden der Kunden");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAssignment = async (customerId: string, assigned: boolean) => {
    try {
      const method = assigned ? 'DELETE' : 'POST';
      const response = await fetch(`/api/admin/managers/${manager.id}/customers/${customerId}`, {
        method,
      });

      if (!response.ok) throw new Error("Fehler beim Aktualisieren");

      toast.success(assigned ? "Zuordnung entfernt" : "Zuordnung erstellt");
      loadCustomers();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren der Zuordnung");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Kunden-Zuordnungen für {manager.first_name} {manager.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8">Lädt...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Kunden verfügbar
            </div>
          ) : (
            customers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={customer.assigned}
                    onCheckedChange={() => handleToggleAssignment(customer.id, customer.assigned)}
                  />
                  <span>{customer.name}</span>
                </div>
                {customer.assigned && (
                  <Badge variant="secondary">Zugeordnet</Badge>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 📋 API Routes für Manager-Zuordnungen

**Neue Datei:** `src/app/api/admin/managers/[managerId]/customers/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { managerId: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all customers with assignment status
  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id,
      name,
      manager_customer_assignments!left(id, is_active)
    `)
    .order('name');

  const customersWithStatus = customers?.map(customer => ({
    id: customer.id,
    name: customer.name,
    assigned: customer.manager_customer_assignments?.some(
      (a: any) => a.is_active
    ) || false
  }));

  return NextResponse.json({ customers: customersWithStatus });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { managerId: string; customerId: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create assignment
  const { error } = await supabase
    .from('manager_customer_assignments')
    .insert({
      manager_id: params.managerId,
      customer_id: params.customerId,
      assigned_by: user.id,
      is_active: true
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { managerId: string; customerId: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Deactivate assignment
  const { error } = await supabase
    .from('manager_customer_assignments')
    .update({ is_active: false })
    .eq('manager_id', params.managerId)
    .eq('customer_id', params.customerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

---

## 🎯 Zusammenfassung der Manager-Berechtigungen

### Manager kann:
✅ Nur zugewiesene Kunden sehen und verwalten  
✅ Mitarbeiter nur diesen Kunden zuordnen  
✅ Aufträge nur für zugewiesene Kunden erstellen/bearbeiten  
✅ Zeiteinträge nur von Mitarbeitern ihrer Kunden sehen  
✅ Objekte nur von zugewiesenen Kunden sehen  

### Manager kann NICHT:
❌ Andere Kunden oder deren Daten sehen  
❌ Mitarbeiter sehen, die keinem seiner Kunden zugeordnet sind  
❌ Aufträge von nicht-zugewiesenen Kunden sehen  
❌ Admin-Funktionen ausführen  
❌ Andere Manager oder deren Zuordnungen sehen  

### Admin kann:
✅ Alle Kunden, Mitarbeiter, Aufträge sehen  
✅ Manager-Kunden-Zuordnungen verwalten  
✅ Manager-Berechtigungen jederzeit ändern  

---

## 📊 Migration Path

1. **Tabelle erstellen:** `manager_customer_assignments`
2. **Initial-Zuordnungen:** Admin weist Manager ihre Kunden zu
3. **RLS-Policies aktualisieren:** Alle Manager-Policies anpassen
4. **UI erstellen:** Admin-Interface für Zuordnungsverwaltung
5. **Testing:** Alle Manager-Zugriffe testen

Diese Architektur gewährleistet strikte Datentrennung zwischen verschiedenen Manager-Bereichen!