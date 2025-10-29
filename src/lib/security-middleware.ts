import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export class SecurityMiddleware {
  static async validateApiRequest(request: NextRequest, requiredPermissions: string[]) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userRole = session.user.user_metadata?.role as string;
    
    // Check if user has required permissions
    const hasPermission = (permission: string) => {
      // This would integrate with your permission system
      // For now, basic role-based checks
      switch (userRole) {
        case 'admin':
          return true;
        case 'manager':
          return !permission.includes('system') && !permission.includes('user:delete');
        case 'employee':
          return permission.includes('read') || permission.includes('update:own');
        case 'customer':
          return permission.includes('read') && permission.includes('own');
        default:
          return false;
      }
    };

    const hasAllPermissions = requiredPermissions.every(hasPermission);
    
    if (!hasAllPermissions) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return null; // No error, continue
  }

  static async rateLimit(request: NextRequest, limit: number = 100, window: number = 60000) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    
    // This would integrate with your rate limiting solution
    // For example, Redis or in-memory store
    
    return null; // No error, continue
  }

  static async validateCsrf(request: NextRequest) {
    if (request.method === 'GET') {
      return null; // CSRF not needed for GET requests
    }

    const token = request.headers.get('x-csrf-token');
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!token || !session?.user?.user_metadata?.csrfToken || token !== session.user.user_metadata.csrfToken) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    return null;
  }

  static async auditLog(action: string, userId: string, details: any) {
    // This would integrate with your audit logging system
    console.log(`AUDIT: ${action} by ${userId}`, details);
    
    // Example implementation:
    // const supabase = await createAdminClient();
    // await supabase
    //   .from('audit_logs')
    //   .insert({
    //     action,
    //     user_id: userId,
    //     details,
    //     timestamp: new Date(),
    //     ip_address: request.headers.get('x-forwarded-for'),
    //     user_agent: request.headers.get('user-agent'),
    //   });
  }
}

// Higher-order function for API route protection
export function withApiProtection(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: {
    permissions?: string[];
    rateLimit?: { limit: number; window: number };
    audit?: string;
  } = {}
) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      // Validate permissions
      if (options.permissions) {
        const permissionError = await SecurityMiddleware.validateApiRequest(
          request,
          options.permissions
        );
        if (permissionError) return permissionError;
      }

      // Rate limiting
      if (options.rateLimit) {
        const rateLimitError = await SecurityMiddleware.rateLimit(
          request,
          options.rateLimit.limit,
          options.rateLimit.window
        );
        if (rateLimitError) return rateLimitError;
      }

      // CSRF protection
      const csrfError = await SecurityMiddleware.validateCsrf(request);
      if (csrfError) return csrfError;

      // Execute handler
      const response = await handler(request, ...args);

      // Audit logging
      if (options.audit) {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        await SecurityMiddleware.auditLog(
          options.audit,
          session?.user?.id || 'unknown',
          {
            method: request.method,
            url: request.url,
            status: response.status,
          }
        );
      }

      return response;
    } catch (error) {
      console.error('API Protection Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}