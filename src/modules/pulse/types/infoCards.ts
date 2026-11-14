import type { Placement } from '../components/widgets/WidgetPlacementPicker';
import type { Tier } from './widgets';

export interface InfoCard {
  id: string; store_id: string; name: string; active: boolean;
  title: string; tiers: Tier[]; footer: string; placement: Placement;
  style_id: string | null; created_at: string; updated_at: string;
}

export interface InfoCardInput {
  id?: string | null; name: string; active: boolean; title: string; tiers: Tier[];
  footer: string; placement: Placement; style_id: string | null;
}