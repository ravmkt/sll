export type Provider = 'gsc' | 'ga4' | 'gbp' | 'meta' | 'widget';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';
export type Priority = 'alta' | 'media' | 'baixa';
export type TaskStatus = 'open' | 'done' | 'ignored';

export interface RadarSettings {
  store_id: string;
  category: string | null;
  regions: string[];
  competitors: string[];
  health_score: number | null;
  onboarding_done: boolean;
}

export interface RadarConnection {
  id: string;
  store_id: string;
  provider: Provider;
  status: ConnectionStatus;
  account_ref: string | null;
  last_sync_at: string | null;
}

export interface RadarKeyword {
  id: string;
  store_id: string;
  term: string;
  region: string | null;
  source: 'manual' | 'ai' | 'gsc';
  approved: boolean;
}

export interface RadarTask {
  id: string;
  store_id: string;
  title: string;
  category: string;
  priority: Priority;
  status: TaskStatus;
  action_type: string | null;
  created_at: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  sku: string | null;
  image: string | null;
  price: number | null;
  description: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
}