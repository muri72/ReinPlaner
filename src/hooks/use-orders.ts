import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { trackSupabaseError } from '@/lib/sentry';

export interface Order {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  customer_id: string | null;
  object_id: string | null;
  priority: 'low' | 'medium' | 'high';
  total_estimated_hours: number | null;
  notes: string | null;
  start_date: string | null;
  order_type: 'one_time' | 'recurring' | 'substitution' | 'permanent';
  request_status: 'pending' | 'approved' | 'rejected';
  service_type: string | null;
  customer_contact_id: string | null;
  fixed_monthly_price: number | null;
  end_date: string | null;
  service_key: string | null;
  markup_percentage: number | null;
  custom_hourly_rate: number | null;
  // Joined fields (from Supabase)
  customer?: {
    id: string;
    name: string;
  };
  object?: {
    id: string;
    name: string;
  };
}

export function useOrders() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, name),
          object:objects(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        trackSupabaseError(error, 'SELECT * FROM orders', 'orders');
        throw error;
      }

      return data as Order[];
    },
  });
}

export function useOrder(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, name),
          object:objects(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        trackSupabaseError(error, `SELECT * FROM orders WHERE id = ${id}`, 'orders');
        throw error;
      }

      return data as Order;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (order: Partial<Order>) => {
      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select(`
          *,
          customer:customers(id, name),
          object:objects(id, name)
        `)
        .single();

      if (error) {
        trackSupabaseError(error, 'INSERT INTO orders', 'orders');
        throw error;
      }

      return data as Order;
    },
    onSuccess: (data) => {
      // Update cache with new order
      queryClient.setQueryData(['orders'], (old: Order[] | undefined) => {
        return old ? [data, ...old] : [data];
      });
      toast.success('Auftrag erfolgreich erstellt');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Erstellen: ${error.message}`);
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Order> & { id: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          customer:customers(id, name),
          object:objects(id, name)
        `)
        .single();

      if (error) {
        trackSupabaseError(error, `UPDATE orders WHERE id = ${id}`, 'orders');
        throw error;
      }

      return data as Order;
    },
    onSuccess: (data) => {
      // Update specific order in cache
      queryClient.setQueryData(['orders', data.id], data);

      // Update orders list
      queryClient.setQueryData(['orders'], (old: Order[] | undefined) => {
        if (!old) return old;
        return old.map((order) => (order.id === data.id ? data : order));
      });

      toast.success('Auftrag erfolgreich aktualisiert');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) {
        trackSupabaseError(error, `DELETE FROM orders WHERE id = ${id}`, 'orders');
        throw error;
      }

      return id;
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['orders', id] });
      queryClient.setQueryData(['orders'], (old: Order[] | undefined) => {
        return old ? old.filter((order) => order.id !== id) : old;
      });

      toast.success('Auftrag erfolgreich gelöscht');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Löschen: ${error.message}`);
    },
  });
}

export function useOptimisticUpdate() {
  const queryClient = useQueryClient();

  return {
    optimisticUpdate: (orderId: string, updates: Partial<Order>) => {
      // Get current data
      const previousData = queryClient.getQueryData(['orders']);

      // Optimistically update
      queryClient.setQueryData(['orders'], (old: Order[] | undefined) => {
        if (!old) return old;
        return old.map((order) =>
          order.id === orderId ? { ...order, ...updates } : order
        );
      });

      queryClient.setQueryData(['orders', orderId], (old: Order | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      return {
        previousData,
        rollback: () => {
          queryClient.setQueryData(['orders'], previousData);
          queryClient.setQueryData(['orders', orderId], previousData);
        },
      };
    },
  };
}
