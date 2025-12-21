import { createClient } from '@/lib/supabase/client';
import { SettingsCache } from './settings-cache';
import { withRetry, defaultRetryConfig } from './settings-retry';
import { checkConnection } from './settings-connection';

export interface PlatformSetting {
  key: string;
  value: string;
  category: string;
  description?: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  scope: 'global' | 'organization' | 'tenant' | 'user';
}

export interface GermanHoliday {
  id: string;
  date: string;
  name: string;
  bundesland: string[];
  holiday_type: 'fixed' | 'movable' | 'regional' | 'custom';
  is_nationwide: boolean;
}

export interface Bundesland {
  code: string;
  name: string;
  full_name: string;
}

export interface EmployeeHolidayPreference {
  id: string;
  employee_id: string;
  holiday_date: string;
  willingness_to_work: boolean;
  premium_pay_required: boolean;
  notes?: string;
}

class SettingsService {
  private cache = new SettingsCache(5 * 60 * 1000); // 5 minutes TTL

  /**
   * Check if the database connection is healthy
   */
  async checkConnection(): Promise<{ healthy: boolean; error?: string }> {
    return await checkConnection();
  }

  /**
   * Get a platform setting by key
   */
  async getSetting(key: string, scope: string = 'global', scopeId?: string): Promise<string | null> {
    const cacheKey = this.cache.getCacheKey(key, scope, scopeId);
    const cached = this.cache.get(cacheKey);

    if (cached !== null) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const supabase = createClient();

          let query = supabase
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .eq('scope', scope)
            .eq('is_active', true);

          if (scopeId) {
            query = query.eq('scope_id', scopeId);
          } else {
            query = query.is('scope_id', null);
          }

          const { data, error } = await query.single();

          if (error || !data) {
            console.warn(`Setting ${key} not found:`, error?.message);
            return null;
          }

          return data.value;
        },
        defaultRetryConfig,
        `getSetting(${key})`
      );

      this.cache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      console.error(`SettingsService: Failed to get setting ${key}:`, error);
      // Return null instead of throwing to allow graceful degradation
      return null;
    }
  }

  /**
   * Get multiple settings by category
   */
  async getSettingsByCategory(category: string): Promise<PlatformSetting[]> {
    try {
      const result = await withRetry(
        async () => {
          const supabase = createClient();

          const { data, error } = await supabase
            .from('app_settings')
            .select('key, value, category, description, setting_type, scope')
            .eq('category', category)
            .eq('is_active', true)
            .order('key');

          if (error) {
            console.error('Error fetching settings by category:', error);
            throw error;
          }

          return data || [];
        },
        defaultRetryConfig,
        `getSettingsByCategory(${category})`
      );

      return result;
    } catch (error: any) {
      console.error(`SettingsService: Failed to get settings for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Update a platform setting
   */
  async updateSetting(
    key: string,
    value: string,
    userId: string,
    scope: string = 'global',
    scopeId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // Get current setting to preserve category and other fields
      const { data: current, error: fetchError } = await supabase
        .from('app_settings')
        .select('id, category, description, setting_type')
        .eq('key', key)
        .eq('scope', scope)
        .is('scope_id', scopeId || null)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching current setting:', fetchError);
      }

      const category = current?.category || 'general';
      const description = current?.description || null;
      const settingType = current?.setting_type || 'string';
      const existingId = current?.id;

      let error;
      let result;
      if (existingId) {
        // Update existing setting
        result = await supabase
          .from('app_settings')
          .update({
            value,
            updated_by: userId,
            updated_at: new Date().toISOString(),
            category,
            description,
            setting_type: settingType,
            is_active: true,
          })
          .eq('id', existingId)
          .select();
        error = result.error;
      } else {
        // Insert new setting
        result = await supabase
          .from('app_settings')
          .insert({
            key,
            value,
            scope,
            scope_id: scopeId || null,
            updated_by: userId,
            category,
            description,
            setting_type: settingType,
            is_active: true,
          })
          .select();
        error = result.error;
      }

      if (error) throw error;

      // Invalidate cache
      const cacheKey = this.cache.getCacheKey(key, scope, scopeId);
      this.cache.delete(cacheKey);

      return { success: true };
    } catch (error: any) {
      console.error('Error updating setting:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all Bundesländer
   */
  async getBundeslaender(): Promise<Bundesland[]> {
    try {
      const result = await withRetry(
        async () => {
          const supabase = createClient();

          const { data, error } = await supabase
            .from('bundeslaender')
            .select('*')
            .order('name');

          if (error) {
            console.error('Error fetching Bundesländer:', error);
            throw error;
          }

          return data || [];
        },
        defaultRetryConfig,
        'getBundeslaender'
      );

      return result;
    } catch (error: any) {
      console.error('SettingsService: Failed to get Bundesländer:', error);
      return [];
    }
  }

  /**
   * Get holidays for a specific Bundesland and year
   * Uses caching to avoid multiple database calls
   */
  async getHolidays(
    bundeslandCode: string,
    year: number
  ): Promise<GermanHoliday[]> {
    const cacheKey = `holidays:${bundeslandCode}:${year}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached.value;
    }

    const supabase = createClient();

    // Fetch all holidays for the year without bundesland filter
    const { data, error } = await supabase
      .from('german_holidays')
      .select('*')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date');

    if (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }

    // Filter in JavaScript to include holidays that apply to this Bundesland
    const allHolidays = data || [];
    console.log(`[SETTINGS] Fetched ${allHolidays.length} holidays for ${year}`);
    console.log(`[SETTINGS] All holidays:`, allHolidays.map(h => `${h.date} - ${h.name} - ${h.bundesland.join(', ')}`));

    const filtered = allHolidays.filter(holiday =>
      holiday.bundesland.includes(bundeslandCode) || holiday.is_nationwide
    );

    console.log(`[SETTINGS] Filtered for ${bundeslandCode}:`, filtered.length);
    console.log(`[SETTINGS] Filtered holidays:`, filtered.map(h => `${h.date} - ${h.name}`));

    // Cache the result
    this.cache.set(cacheKey, { value: filtered, timestamp: Date.now() });

    return filtered;
  }

  /**
   * Check if a specific date is a holiday
   */
  async isHoliday(
    date: string,
    bundeslandCode: string
  ): Promise<GermanHoliday | null> {
    // Ensure date is in YYYY-MM-DD format
    let formattedDate: string;
    if (date.includes('.')) {
      // Convert DD.MM.YYYY to YYYY-MM-DD
      const [day, month, year] = date.split('.');
      formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else if (date.includes('/')) {
      // Convert MM/DD/YYYY or DD/MM/YYYY to YYYY-MM-DD
      const parts = date.split('/');
      if (parts[0].length === 4) {
        // Already in YYYY-MM-DD format
        formattedDate = date;
      } else {
        // Assume DD/MM/YYYY
        formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else {
      // Assume already in YYYY-MM-DD or similar
      formattedDate = date;
    }

    const year = parseInt(formattedDate.split('-')[0]);
    const holidays = await this.getHolidays(bundeslandCode, year);

    // Find holiday matching the date - using strict equality
    const holiday = holidays.find(h => h.date === formattedDate);

    if (holiday) {
      console.log(`[SETTINGS] ✓ isHoliday: ${date} (formatted: ${formattedDate}) = ${holiday.name}`);
    } else {
      console.log(`[SETTINGS] ✗ isHoliday: ${date} (formatted: ${formattedDate}) = No holiday found`);
      console.log(`[SETTINGS] Checking ${holidays.length} holidays for ${bundeslandCode} ${year}:`, holidays.map(h => `${h.date}: ${h.name}`));
    }

    return holiday || null;
  }

  /**
   * Get work multiplier for a date (1.0 = normal, 1.5 = holiday, 1.4 = weekend)
   */
  async getWorkMultiplier(
    date: Date,
    bundeslandCode: string
  ): Promise<number> {
    // Check if it's a holiday
    const holiday = await this.isHoliday(date.toISOString().split('T')[0], bundeslandCode);
    if (holiday) {
      const multiplier = await this.getSetting('holiday_premium_pay_multiplier');
      return parseFloat(multiplier || '1.5');
    }

    // Check if it's a weekend (Saturday = 6, Sunday = 0)
    const day = date.getDay();
    if (day === 0 || day === 6) {
      const multiplier = await this.getSetting('weekend_premium_pay_multiplier');
      return parseFloat(multiplier || '1.4');
    }

    return 1.0;
  }

  /**
   * Get employee holiday preferences
   */
  async getEmployeeHolidayPreferences(employeeId: string): Promise<EmployeeHolidayPreference[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('employee_holiday_preferences')
      .select('*')
      .eq('employee_id', employeeId)
      .order('holiday_date');

    if (error) {
      console.error('Error fetching employee holiday preferences:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update employee holiday preference
   */
  async updateEmployeeHolidayPreference(
    employeeId: string,
    holidayDate: string,
    willingnessToWork: boolean,
    premiumPayRequired: boolean = true,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('employee_holiday_preferences')
        .upsert({
          employee_id: employeeId,
          holiday_date: holidayDate,
          willingness_to_work: willingnessToWork,
          premium_pay_required: premiumPayRequired,
          notes,
        }, {
          onConflict: 'employee_id,holiday_date',
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating employee holiday preference:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check multiple dates for holidays at once (efficient batch operation)
   */
  async checkMultipleHolidays(
    dates: string[],
    bundeslandCode: string
  ): Promise<{ [date: string]: GermanHoliday | null }> {
    if (dates.length === 0) return {};

    // Group dates by year to minimize database calls
    const datesByYear: { [year: number]: string[] } = {};

    dates.forEach(date => {
      // Ensure date is in YYYY-MM-DD format
      let formattedDate: string;
      if (date.includes('.')) {
        const [day, month, year] = date.split('.');
        formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        formattedDate = date;
      }

      const year = parseInt(formattedDate.split('-')[0]);
      if (!datesByYear[year]) {
        datesByYear[year] = [];
      }
      datesByYear[year].push(formattedDate);
    });

    const results: { [date: string]: GermanHoliday | null } = {};

    // Fetch holidays for each year and match dates
    for (const [yearStr, datesInYear] of Object.entries(datesByYear)) {
      const year = parseInt(yearStr);
      const holidays = await this.getHolidays(bundeslandCode, year);

      datesInYear.forEach(date => {
        const holiday = holidays.find(h => h.date === date);
        results[date] = holiday || null;

        if (holiday) {
          console.log(`[SETTINGS] Batch check: ${date} = ${holiday.name}`);
        }
      });
    }

    return results;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get invoice settings
   */
  async getInvoiceSettings(userId?: string): Promise<any> {
    const supabase = createClient();

    // If no userId provided, get current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching invoice settings:', error);
      throw error;
    }

    return data || null;
  }

  /**
   * Update invoice settings
   */
  async updateInvoiceSettings(
    settings: any,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // If no userId provided, get current user
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      const { error } = await supabase
        .from('invoice_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating invoice settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tax settings
   */
  async getTaxSettings(userId?: string): Promise<any> {
    const supabase = createClient();

    // If no userId provided, get current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('tax_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching tax settings:', error);
      throw error;
    }

    return data || null;
  }

  /**
   * Update tax settings
   */
  async updateTaxSettings(
    settings: any,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // If no userId provided, get current user
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      const { error } = await supabase
        .from('tax_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating tax settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get bank connection
   */
  async getBankConnection(userId?: string): Promise<any> {
    const supabase = createClient();

    // If no userId provided, get current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching bank connection:', error);
      throw error;
    }

    return data || null;
  }

  /**
   * Update bank connection
   */
  async updateBankConnection(
    settings: any,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // If no userId provided, get current user
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      const { error } = await supabase
        .from('bank_connections')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating bank connection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all products/services
   */
  async getProducts(userId?: string): Promise<any[]> {
    const supabase = createClient();

    // If no userId provided, get current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create or update a product
   */
  async saveProduct(
    product: any,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // If no userId provided, get current user
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      const productData = {
        user_id: userId,
        ...product,
        updated_at: new Date().toISOString(),
      };

      if (product.id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            ...productData,
            created_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error saving product:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(
    productId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // If no userId provided, get current user
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting product:', error);
      return { success: false, error: error.message };
    }
  }
}

export const settingsService = new SettingsService();
