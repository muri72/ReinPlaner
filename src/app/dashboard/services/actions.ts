"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Service {
    id: string;
    name: string; // Mapped from "title" in DB
    color: string;
    key: string;
    default_hourly_rate?: number;
}

export async function getServices(): Promise<Service[]> {
    const supabase = await createClient();

    // Select all active services
    const { data, error } = await supabase
        .from('services')
        .select('id, title, color, key, default_hourly_rate')
        .eq('is_active', true)
        .order('title');

    if (error) {
        console.error("Error fetching services:", error);
        return [];
    }

    return data.map((s: any) => ({
        id: s.id,
        name: s.title,
        color: s.color || "#6b7280", // Default gray if no color
        key: s.key,
        default_hourly_rate: s.default_hourly_rate
    }));
}

export async function getServicesList(): Promise<string[]> {
    const services = await getServices();
    return services.map(s => s.name);
}

// Fixed hex colors for default services to maintain existing visual identity
const DEFAULT_COLORS: Record<string, string> = {
    "Unterhaltsreinigung": "#22c55e", // green-500
    "Glasreinigung": "#06b6d4", // cyan-500
    "Grundreinigung": "#3b82f6", // blue-500
    "Graffitientfernung": "#f97316", // orange-500
    "Sonderreinigung": "#a855f7", // purple-500
};

export async function seedDefaultServices() {
    const supabase = createAdminClient();

    const defaultServices = [
        "Unterhaltsreinigung",
        "Glasreinigung",
        "Grundreinigung",
        "Graffitientfernung",
        "Sonderreinigung",
    ];

    for (const title of defaultServices) {
        // Check if exists
        const { data: existing } = await supabase
            .from('services')
            .select('id, color')
            .eq('title', title)
            .maybeSingle();

        if (!existing) {
            // Create new service
            const key = title.toLowerCase()
                .replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue')
                .replace(/ß/g, 'ss')
                .replace(/[^a-z0-9]/g, '_');

            await supabase.from('services').insert({
                title,
                key,
                color: DEFAULT_COLORS[title] || "#6b7280",
                is_active: true
            });
        } else if (!existing.color) {
            // Update color if missing
            await supabase.from('services').update({
                color: DEFAULT_COLORS[title] || "#6b7280"
            }).eq('id', existing.id);
        }
    }

    revalidatePath('/dashboard/services');
}
