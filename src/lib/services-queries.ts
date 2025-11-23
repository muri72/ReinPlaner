import { createClient } from "@/lib/supabase/client";

export interface ServiceQuery {
  id: string;
  key: string;
  title: string;
  short_description: string | null;
  description: string | null;
  category_id: string;
  base_price: number | null;
  default_hourly_rate: number | null;
  is_active: boolean;
  service_categories?: {
    id: string;
    key: string;
    title: string;
  };
}

export interface ServiceWithFeatures extends ServiceQuery {
  service_features?: {
    id: string;
    title: string;
    description: string | null;
  }[];
}

export async function getServices(supabase: any): Promise<ServiceWithFeatures[]> {
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      service_categories (
        id,
        key,
        title
      ),
      service_features (
        id,
        title,
        description
      )
    `)
    .eq('is_active', true)
    .order('title', { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Services:", error);
    throw error;
  }

  return (data || []).map((service: any) => ({
    ...service,
    category: service.service_categories,
    features: service.service_features,
  }));
}

export async function getServiceByKey(supabase: any, key: string): Promise<ServiceWithFeatures | null> {
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      service_categories (
        id,
        key,
        title
      ),
      service_features (
        id,
        title,
        description
      )
    `)
    .eq('key', key)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error("Fehler beim Laden des Services:", error);
    return null;
  }

  return data ? {
    ...data,
    category: data.service_categories,
    features: data.service_features,
  } : null;
}

export async function getServiceCategories(supabase: any) {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Service-Kategorien:", error);
    throw error;
  }

  return data || [];
}
