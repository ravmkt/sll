import { supabasePublic } from "./supabaseClients";
import type { CommercialDate } from "@/lib/commercialDates";

export const CommercialDatesService = {
  async getForSector(sectorId: string | null | undefined): Promise<CommercialDate[]> {
    const { data, error } = await supabasePublic
      .from("commercial_dates")
      .select("*, commercial_date_sectors(sector_id)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;

    return ((data || []) as any[])
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        tip: row.tip,
        rule_type: row.rule_type,
        month: row.month,
        day: row.day,
        weekday: row.weekday,
        nth: row.nth,
        lead_days: row.lead_days,
        sort_order: row.sort_order,
        sector_ids: (row.commercial_date_sectors || []).map((s: any) => s.sector_id as string),
      }) as CommercialDate)
      .filter((d) => d.sector_ids.length === 0 || (!!sectorId && d.sector_ids.includes(sectorId)));
  },
};