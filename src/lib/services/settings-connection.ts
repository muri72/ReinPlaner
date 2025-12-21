/**
 * Connection Management Utility
 *
 * Extracted from settings-service.ts to handle database connection
 * checking separately from business logic.
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Check if the database connection is healthy
 */
export async function checkConnection(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('app_settings')
      .select('key')
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { healthy: true };
  } catch (error: any) {
    console.error('SettingsService: Connection check failed:', error);
    return { healthy: false, error: error.message };
  }
}
