"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SLLDatabaseService } from '@/services/SLLDatabaseService';
import { useLoja } from '@/context/LojaContext';
import {
  Loader2, Save, Image as ImageIcon, X, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const LOGO_BUCKET = 'store-assets';

const PLATAFORMAS = [
  'Bagy', 'Cartpanda', 'Irroba', 'Loja Integrada', 'Nuvemshop',
  'Shopify', 'Tray', 'WooCommerce', 'Yampi', 'Outra',
];

interface FormState {
  store_name: string;
  store_url: string;
  platform: string;
  contact_name: string;
  contact_email: string;
  owner_contact_email: string;
  whatsapp_number: string;
  whatsapp_message_template: string;
  whatsapp_enabled: boolean;
  stories_enabled: boolean;
  logo_url: string | null;
  sector_id: string;
}

const DEFAULT_FORM: FormState = {
  store_name: '',
  store_url: '',
  platform: 'Bagy',
  contact_name: '',
  contact_email: '',
  owner_contact_email: '',
  whatsapp_number: '',
  whatsapp_message_template: 'Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}',
  whatsapp_enabled: true,
  stories_enabled: true,
  logo_url: null,
  sector_id: '',
};

const formatStoreUrl = (url: string): string => {
  let trimmed = url.trim();
  if (!trimmed) return '';
  trimmed = trimmed.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;
  if (trimmed.startsWith('http://')) trimmed = `https://${trimmed.slice(7)}`;
  return trimmed.toLowerCase();
};

const SettingsPage: React.FC = () => {
  const { store, storeId, loading: lojaLoading, refreshStore } = useLoja();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectors, setSectors] = useState<any[]>([]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (lojaLoading || !storeId) return;
      setLoading(true);
      try {
        const [settingsRow, sectorList] = await Promise.all([
          SLLDatabaseService.getStoreSettings(storeId),
          SLLDatabaseService.getSectors(),
        ]);

        setSectors(sectorList);

        setForm({
          store_name: settingsRow?.store_name || store?.name || '',
          store_url: settingsRow?.store_url || store?.url || '',
          platform: settingsRow?.platform || store?.platform || 'Bagy',
          contact_name: store?.contact_name || '',
          contact_email: settingsRow?.contact_email || store?.contact_email || '',
          owner_contact_email: settingsRow?.owner_contact_email || store?.owner_contact_email || '',
          whatsapp_number: settingsRow?.whatsapp_number || '',
          whatsapp_message_template:
            settingsRow?.whatsapp_message_template || DEFAULT_FORM.whatsapp_message_template,
          whatsapp_enabled: settingsRow?.whatsapp_enabled ?? true,
          stories_enabled: settingsRow?.stories_enabled ?? true,
          logo_url: settingsRow?.logo_url || store?.logo_url || null,
          sector_id: store?.sector_id || '',
        });
        setLogoPreview(settingsRow?.logo_url || store?.logo_url || '');
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
        toast.error('Erro ao carregar configurações da loja.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId, lojaLoading, store]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setForm((prev) => ({ ...prev, logo_url: null }));
  };

  const validate = (): string => {
    if (!form.store_name.trim()) return 'O nome da loja é obrigatório.';
    if (!form.store_url.trim()) return 'A URL da loja é obrigatória.';
    if (!form.contact_name.trim()) return 'O nome do contato é obrigatório.';
    if (!form.contact_email.trim() || !form.contact_email.includes('@'))
      return 'Informe um e-mail de atendimento válido.';
    if (!form.owner_contact_email.trim() || !form.owner_contact_email.includes('@'))
      return 'Informe um e-mail do dono da loja válido.';
    if (!form.whatsapp_number.trim()) return 'O número de WhatsApp é obrigatório.';
    if (!form.whatsapp_message_template.trim()) return 'A mensagem padrão de WhatsApp é obrigatória.';
    if (!form.sector_id) return 'Selecione o setor da loja.';
    return '';
  };

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Loja não identificada. Recarregue a página.');
      return;
    }

    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);
    try {
      let finalLogoUrl = form.logo_url || '';

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logos/logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(LOGO_BUCKET)
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: logoFile.type,
          });

        if (uploadError) {
          toast.error(`Erro ao enviar o logotipo: ${uploadError.message}`);
          setSaving(false);
          return;
        }

        const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(fileName);
        finalLogoUrl = data.publicUrl;
      }

      const finalUrl = formatStoreUrl(form.store_url);
      const selectedSector = sectors.find((s) => s.id === form.sector_id);

      // Atualiza store_settings (fonte usada por todos os módulos: Vidlytics, Live, futuros)
      await SLLDatabaseService.updateStoreSettings(storeId, {
        store_name: form.store_name.trim(),
        store_url: finalUrl,
        platform: form.platform,
        contact_email: form.contact_email.trim(),
        owner_contact_email: form.owner_contact_email.trim(),
        logo_url: finalLogoUrl || null,
        whatsapp_number: form.whatsapp_number.trim(),
        whatsapp_message_template: form.whatsapp_message_template.trim(),
        whatsapp_default_message: form.whatsapp_message_template.trim(),
        whatsapp_enabled: form.whatsapp_enabled,
        stories_enabled: form.stories_enabled,
      });

      // Espelha os campos-chave em stores (usados em listagens/painel master)
      await SLLDatabaseService.updateStore(storeId, {
        name: form.store_name.trim(),
        contact_name: form.contact_name.trim(),
        url: finalUrl,
        platform: form.platform,
        logo_url: finalLogoUrl || null,
        contact_email: form.contact_email.trim(),
        owner_contact_email: form.owner_contact_email.trim(),
        sector_id: form.sector_id || null,
        sector: selectedSector?.slug || null,
      });

      setForm((prev) => ({ ...prev, store_url: finalUrl, logo_url: finalLogoUrl || null }));
      setLogoFile(null);

      await refreshStore();

      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Falha ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || lojaLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0094eb]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-8 pb-20 font-sans">
      <form
        noValidate
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Configurações da Loja
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Esses dados são usados por todos os módulos contratados.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-[#0094eb] hover:bg-[#0082cf] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save size={18} /> Salvar Configurações
              </>
            )}
          </button>
        </div>

        {/* 1. DADOS DA LOJA */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f35]/80 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              1. Dados da Loja
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Informações cadastrais e identidade da sua marca.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Nome da Loja *
              </label>
              <input
                type="text"
                value={form.store_name}
                onChange={(e) => setForm((p) => ({ ...p, store_name: e.target.value }))}
                placeholder="Ex: Loja da Ana Moda Feminina"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                URL da Loja *
              </label>
              <input
                type="text"
                value={form.store_url}
                onChange={(e) => setForm((p) => ({ ...p, store_url: e.target.value }))}
                onBlur={(e) => setForm((p) => ({ ...p, store_url: formatStoreUrl(e.target.value) }))}
                placeholder="Ex: minhaloja.com.br"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Plataforma de E-commerce
              </label>
              <select
                value={form.platform}
                onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb]"
              >
                {PLATAFORMAS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Setor da Loja *
              </label>
              <select
                value={form.sector_id}
                onChange={(e) => setForm((p) => ({ ...p, sector_id: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb]"
              >
                <option value="">Selecione...</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Logo da Loja (opcional)
              </label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="flex-1 text-xs font-bold text-slate-600 dark:text-slate-300 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-[#0094eb] file:text-white file:font-black file:text-xs file:cursor-pointer cursor-pointer"
                  />
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111524] hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                    >
                      <X size={16} className="text-rose-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Nome do Contato *
              </label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                placeholder="Ex: Ana Silva"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                E-mail do Dono da Loja *
              </label>
              <input
                type="email"
                value={form.owner_contact_email}
                onChange={(e) => setForm((p) => ({ ...p, owner_contact_email: e.target.value }))}
                placeholder="Ex: dono@minhaloja.com.br"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                E-mail de Atendimento *
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                placeholder="Ex: atendimento@minhaloja.com.br"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb]"
              />
            </div>
          </div>
        </div>

        {/* 2. WHATSAPP */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f35]/80 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                2. Integração WhatsApp
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Número receptor e mensagem automática enviada pelos clientes nos vídeos.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.whatsapp_enabled}
                onChange={(e) => setForm((p) => ({ ...p, whatsapp_enabled: e.target.checked }))}
                className="h-4 w-4 accent-[#0094eb]"
              />
              <span className="text-[10px] font-black uppercase text-slate-400">Ativo</span>
            </label>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Número do WhatsApp *
              </label>
              <input
                type="tel"
                value={form.whatsapp_number}
                onChange={(e) =>
                  setForm((p) => ({ ...p, whatsapp_number: e.target.value.replace(/[^\d+\-() ]/g, '') }))
                }
                placeholder="Ex: (41) 99999-9999"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Mensagem Padrão de Contato *
              </label>
              <textarea
                rows={3}
                value={form.whatsapp_message_template}
                onChange={(e) => setForm((p) => ({ ...p, whatsapp_message_template: e.target.value }))}
                placeholder="Ex: Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb] resize-none"
              />
            </div>
          </div>
        </div>

        {/* 3. MÉTRICAS */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f35]/80 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              3. Métricas
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Monitore o comportamento do cliente final e as interações com seus vídeos.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-[#111524]/60 border border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5">
              <label className="text-xs font-black text-slate-800 dark:text-white block">
                Ativar métricas e analytics
              </label>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                Coleta métricas de visualização, retenção e cliques em tempo real na loja.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.stories_enabled}
              onChange={(e) => setForm((p) => ({ ...p, stories_enabled: e.target.checked }))}
              className="h-5 w-5 accent-[#0094eb] mt-0.5"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#0094eb] hover:bg-[#0082cf] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save size={18} /> Salvar Configurações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
    </DashboardLayout>
  );
};

export default SettingsPage;



