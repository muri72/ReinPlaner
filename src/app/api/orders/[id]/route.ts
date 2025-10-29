import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requirePermission, getCurrentUser } from '@/lib/auth-helpers';
import { PERMISSIONS } from '@/lib/permissions';

const updateOrderSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedToId: z.string().nullable().optional(),
  dueDate: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(PERMISSIONS.ORDER_READ);
    const orderId = params.id;
    const supabase = await createClient();
    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, email),
        assignedTo:employees(id, first_name, last_name, email),
        createdBy:profiles(id, first_name, last_name, email)
      `)
      .eq('id', orderId)
      .single();
    
    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Check access permissions
    if (user.role === 'customer' && order.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    if (user.role === 'employee' && order.assigned_to_id && order.assigned_to_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(PERMISSIONS.ORDER_UPDATE);
    const orderId = params.id;
    const supabase = await createClient();
    
    // First check if order exists and user has access
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('customer_id, assigned_to_id')
      .eq('id', orderId)
      .single();
    
    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Check access permissions
    if (user.role === 'customer' && existingOrder.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    if (user.role === 'employee' && existingOrder.assigned_to_id && existingOrder.assigned_to_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = updateOrderSchema.parse(body);
    
    // Role-based field restrictions
    let updateData: any = {
      ...validatedData,
      due_date: validatedData.dueDate ? new Date(validatedData.dueDate).toISOString() : null,
    };
    
    if (user.role === 'customer') {
      // Customers can only update certain fields
      const allowedFields = ['title', 'description'];
      const filteredData: any = {};
      
      allowedFields.forEach(field => {
        if (validatedData[field as keyof typeof validatedData] !== undefined) {
          filteredData[field] = validatedData[field as keyof typeof validatedData];
        }
      });
      
      updateData = filteredData;
    } else if (user.role === 'employee') {
      // Employees cannot reassign orders
      delete updateData.assignedToId;
    }
    
    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        customer:customers(id, name, email),
        assignedTo:employees(id, first_name, last_name, email)
      `)
      .single();
    
    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(PERMISSIONS.ORDER_DELETE);
    const orderId = params.id;
    const supabase = await createClient();
    
    // First check if order exists and user has access
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .single();
    
    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Check access permissions
    if (user.role === 'customer' && existingOrder.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
    
    if (error) {
      console.error('Error deleting order:', error);
      return NextResponse.json(
        { error: 'Failed to delete order' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}