import { supabase } from '@/integrations/supabase/client';

export interface TryOnAppearance {
  bg: string;
  color: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  height: number;
  width: number;
  fontSize: number;
  fontWeight: number;
  align: 'left' | 'center' | 'right';
  marginTop: number;
  marginBottom: number;
  icon: string;
  hoverBg: string;
  hoverColor: string;
}

export const DEFAULT_APPEARANCE: TryOnAppearance = {
  bg: '#000000',
  color: '#ffffff',
  borderColor: '#000000',
  borderWidth: 0,
  radius: 0,
  height: 50,
  width: 100,
  fontSize: 20,
  fontWeight: 600,
  align: 'center',
  marginTop: 10,
  marginBottom: 10,
  icon: '',
  hoverBg: '#222222',
  hoverColor: '#ffffff',
};

export const DEFAULT_BUTTON_TEXT = 'Provar agora';

export interface LoadedAppearance {
  buttonText: string;
  appearance: TryOnAppearance;
}

export async function getAppearance(storeId: string): Promise<LoadedAppearance> {
  const { data, error } = await (supabase as any).rpc('tryon_admin_get_settings', { p_store_id: storeId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    buttonText: row?.button_text || DEFAULT_BUTTON_TEXT,
    appearance: { ...DEFAULT_APPEARANCE, ...(row?.appearance || {}) },
  };
}

export async function saveAppearance(storeId: string, buttonText: string, appearance: TryOnAppearance) {
  const { error } = await (supabase as any).rpc('tryon_admin_save_settings', {
    p_store_id: storeId,
    p_settings: { button_text: buttonText, appearance },
  });
  if (error) throw error;
}