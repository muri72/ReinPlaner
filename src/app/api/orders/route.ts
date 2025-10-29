import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requirePermission, getCurrentUser } from '@/lib/auth-helpers';
import { PERMISSIONS } from '@/lib/permissions';

const createOrderSchema = z.object({
  customerId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ORDER_READ);
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    
    // Build query based on user role
    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, email),
        assignedTo:employees(id, first_name, last_name, email)
      `);
    
    if (user.role === 'customer') {
      query = query.eq('customer_id', user.id);
    } else if (user.role === 'employee') {
      query = query.or(`assigned_to_id.eq.${user.id},assigned_to_id.is.null`);
    }
    // Admin and Manager can see all orders
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (customerId && (user.role === 'admin' || user.role === 'manager')) {
      query = query.eq('customer_id', customerId);
    }
    
    const { data: orders, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }
    
    // Get total count for pagination
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ORDER_CREATE);
    const supabase = await createClient();
    
    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);
    
    // Additional validation based on role
    if (user.role === 'customer') {
      validatedData.customerId = user.id;
    } else if (user.role === 'employee') {
      delete validatedData.assignedToId;
    }
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        title: validatedData.title,
        description: validatedData.description,
        status: validatedData.status,
        priority: validatedData.priority,
        customer_id: validatedData.customerId,
        assigned_to_id: validatedData.assignedToId,
        due_date: validatedData.dueDate ? new Date(validatedData.dueDate).toISOString() : null,
      })
      .select(`
        *,
        customer:customers(id, name, email),
        assignedTo:employees(id, first_name, last_name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating order:', error);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}