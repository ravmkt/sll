export interface Store {
  id: string
  owner_user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface StoreMember {
  id: string
  store_id: string
  user_id: string
  role: string
  created_at: string | null
  updated_at: string | null
}

export interface Plan {
  id: string
  name: string
  modules: Record<string, boolean>
  [key: string]: unknown
}

export interface Subscription {
  id: string
  store_id: string
  plan_id: string
  status: string
  billing_cycle: string
  current_period_start: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  is_current: boolean
}
