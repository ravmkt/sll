"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { SLLDatabaseService } from '@/services/SLLDatabaseService';
import { useLoja } from '@/contexts/LojaContext';
import {
  Loader2, Save, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import PlatformConnectCard from '@/components/configuracoes/PlatformConnectCard';
import DomainSettings from '@/components/domains/DomainSettings';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const LOGO_BUCKET = 'store-assets';

const PLATAFORMAS = [
  'Bagy', 'Cartpanda', 'Irroba', 'Loja Integrada', 'Nuvemshop',
  'Shopify', 'Tray', 'WooCommerce', 'Yampi', 'Outra',
];

interface FormState {
  store_name: string;
  reply_display_name: string;
  store_url: string;
  platform: string;
  contact_name: string;
  contact_email: string;
  owner_contact_email: string;
  owner_whatsapp: string;
  whatsapp_number: string;
  whatsapp_message_template: string;
  whatsapp_enabled: boolean;
  stories_enabled: boolean;
  logo_url: string | null;
  sector_id: string;
}

const DEFAULT_FORM: FormState = {
  store_name: '',
  reply_display_name: '',
  store_url: '',
  platform: '',
  contact_name: '',
  contact_email: '',
  owner_contact_email: '',
  owner_whatsapp: '',
  whatsapp_number: '',
  whatsapp_message_template: 'Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}',
  whatsapp_enabled: true,
  stories_enabled: true,
  logo_url: null,
  sector_id: '',
};

// Abrevia o nome da loja automaticamente (primeira palavra, máx 15 chars)
const abbreviateStoreName = (name: string): string => {
  if (!name) return 'Sua loja';
  const firstWord = name.trim().split(' ')[0];
  return firstWord.length > 15 ? firstWord.slice(0, 15) : firstWord;
};

const formatStoreUrl = (url: string): string => {
  let trimmed = url.trim();
  if (!trimmed) return '';
  trimmed = trimmed.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;
  if (trimmed.startsWith('http://')) trimmed = `https://${trimmed.slice(7)}`;
  return trimmed.toLowerCase();
};

const formatWhatsapp = (raw: string): string => {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  if (digits.length < 12) return digits;

  const country = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);
  const rest = digits.slice(4);

  let number = rest;
  if (rest.length === 9) {
    number = `${rest.slice(0, 5)}-${rest.slice(5)}`;
  } else if (rest.length === 8) {
    number = `${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return `+${country} (${ddd}) ${number}`;
};

const SettingsPage: React.FC = () => {
  const { store, storeId, loading: lojaLoading, refreshStore } = useLoja();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectors, setSectors] = useState<any[]>([]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const sllLogoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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
          reply_display_name:
            settingsRow?.reply_display_name ||
            store?.reply_display_name ||
            abbreviateStoreName(settingsRow?.store_name || store?.name || ''),
          store_url: settingsRow?.store_url || store?.url || '',
          platform: settingsRow?.platform || store?.platform || '',
          contact_name: store?.contact_name || '',
          contact_email: settingsRow?.contact_email || store?.contact_email || '',
          owner_contact_email: settingsRow?.owner_contact_email || store?.owner_contact_email || '',
          owner_whatsapp: formatWhatsapp(String((store as any)?.whatsapp || '')),
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
    if (!form.reply_display_name.trim()) return 'O nome de resposta é obrigatório.';
    if (!form.store_url.trim()) return 'A URL da loja é obrigatória.';
    if (!form.contact_name.trim()) return 'O nome do contato é obrigatório.';
    if (!form.contact_email.trim() || !form.contact_email.includes('@'))
      return 'Informe um e-mail de atendimento válido.';
    if (!form.owner_contact_email.trim() || !form.owner_contact_email.includes('@'))
      return 'Informe um e-mail de contato da loja válido.';
    if (!form.whatsapp_number.trim()) return 'O número de WhatsApp é obrigatório.';
    if (!form.whatsapp_message_template.trim()) return 'A mensagem padrão de WhatsApp é obrigatória.';
    if (!form.sector_id) return 'Selecione o setor da loja.';
    if (form.owner_whatsapp.trim() && formatWhatsapp(form.owner_whatsapp).replace(/\D/g, '').length < 12)
      return 'Informe um WhatsApp do dono valido, com DDD.';
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
      const replyDisplayName = form.reply_display_name.trim() || abbreviateStoreName(form.store_name.trim());

      // Atualiza store_settings (fonte usada por todos os módulos: Vidlytics, Live, futuros)
      await SLLDatabaseService.updateStoreSettings(storeId, {
        store_name: form.store_name.trim(),
        reply_display_name: replyDisplayName,
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

      // Espelha os campos-chave em stores (usados em listagens/painel master e contexto da loja)
      await SLLDatabaseService.updateStore(storeId, {
        name: form.store_name.trim(),
        reply_display_name: replyDisplayName,
        contact_name: form.contact_name.trim(),
        url: finalUrl,
        platform: form.platform,
        logo_url: finalLogoUrl || null,
        contact_email: form.contact_email.trim(),
        owner_contact_email: form.owner_contact_email.trim(),
        sector_id: form.sector_id || null,
        whatsapp: formatWhatsapp(form.owner_whatsapp).replace(/\D/g, '') || null,
        sector: selectedSector?.slug || null,
      });

      setForm((prev) => ({
        ...prev,
        store_url: finalUrl,
        logo_url: finalLogoUrl || null,
        reply_display_name: replyDisplayName,
      }));
      setLogoFile(null);

      await refreshStore();

      toast.success('Configurações salvas com sucesso!');
      navigate('/dashboard');
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

  const inputCls = 'w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094eb]';
  const labelCls = 'text-[10px] font-black uppercase tracking-widest text-slate-400';
  const cardCls = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f35]/80 shadow-sm p-6 space-y-5 h-full';
  const saveBtnCls = 'bg-[#0094eb] hover:bg-[#0082cf] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0';
  const previewMessage = (form.whatsapp_message_template || '').replace(/\{\{\s*story_title\s*\}\}/g, 'Vestido Floral Midi');

  const Switch = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${on ? 'bg-[#0094eb]' : 'bg-slate-300 dark:bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );

  const SaveContent = () => (
    saving ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
      </>
    ) : (
      <>
        <Save size={18} /> Salvar Alterações
      </>
    )
  );

  return (
    <DashboardLayout>
      {/* SLL-SETTINGS-V4 */}
      <div className="space-y-6 pb-20 font-sans">
        <form
          noValidate
          className="space-y-6"
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
                Gerencie a identidade da sua marca, integrações e canais de contato.
              </p>
            </div>
            <button type="submit" disabled={saving} className={`${saveBtnCls} self-start sm:self-auto`}>
              <SaveContent />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
            {/* IDENTIDADE DA LOJA */}
            <div className={cardCls}>
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Identidade da Loja</h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Informações públicas que representam a sua marca.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <span className={labelCls}>Logo da loja</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => sllLogoInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-black cursor-pointer"
                    >
                      {logoPreview ? 'Trocar logo' : 'Enviar logo'}
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-xs font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">JPG, PNG ou WEBP.</p>
                  <input
                    ref={sllLogoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      handleLogoChange(e);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelCls}>Nome da Loja *</label>
                  <input
                    type="text"
                    value={form.store_name}
                    onChange={(e) => setForm((p) => ({ ...p, store_name: e.target.value }))}
                    placeholder="Ex: Loja da Ana Moda Feminina"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Responder como *</label>
                  <input
                    type="text"
                    value={form.reply_display_name}
                    onChange={(e) => setForm((p) => ({ ...p, reply_display_name: e.target.value }))}
                    placeholder="Ex: Ana"
                    className={inputCls}
                  />
                  <p className="text-[10px] text-slate-400">Nome exibido nas respostas aos comentários dos clientes.</p>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>URL da Loja *</label>
                  <input
                    type="text"
                    value={form.store_url}
                    onChange={(e) => setForm((p) => ({ ...p, store_url: e.target.value }))}
                    onBlur={(e) => setForm((p) => ({ ...p, store_url: formatStoreUrl(e.target.value) }))}
                    placeholder="Ex: minhaloja.com.br"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Setor da Loja *</label>
                  <select
                    value={form.sector_id}
                    onChange={(e) => setForm((p) => ({ ...p, sector_id: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Selecione...</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* PLATAFORMA CONECTADA */}
            <div className="h-full [&>*]:h-full">
              <PlatformConnectCard
                storeId={storeId || ''}
                platform={form.platform}
                platforms={PLATAFORMAS}
                onChangePlatform={(p) => setForm((prev) => ({ ...prev, platform: p }))}
              />
            </div>

            {/* MEU DOMÍNIO */}
            {storeId && (
              <div className={cardCls}>
                <DomainSettings storeId={storeId} />
              </div>
            )}

            {/* WHATSAPP & ATENDIMENTO */}
            <div className={cardCls}>
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Atendimento</h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    Canal que o cliente final usa para falar com a loja.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">{form.whatsapp_enabled ? 'Ativo' : 'Inativo'}</span>
                  <Switch
                    on={form.whatsapp_enabled}
                    label="Ativar WhatsApp"
                    onToggle={() => setForm((p) => ({ ...p, whatsapp_enabled: !p.whatsapp_enabled }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelCls}>WhatsApp de atendimento *</label>
                  <input
                    type="tel"
                    value={form.whatsapp_number}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, whatsapp_number: e.target.value.replace(/[^\d+\-() ]/g, '') }))
                    }
                    onBlur={(e) => setForm((p) => ({ ...p, whatsapp_number: formatWhatsapp(e.target.value) }))}
                    placeholder="Ex: (41) 99999-9999"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>E-mail de atendimento *</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                    placeholder="Ex: atendimento@minhaloja.com.br"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Mensagem padrão de contato *</label>
                <textarea
                  rows={3}
                  value={form.whatsapp_message_template}
                  onChange={(e) => setForm((p) => ({ ...p, whatsapp_message_template: e.target.value }))}
                  placeholder="Ex: Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}"
                  className={`${inputCls} resize-none`}
                />
                <p className="text-[10px] text-slate-400">
                  Use {'{{story_title}}'} para inserir o título do vídeo automaticamente.
                </p>
              </div>

              <div className="space-y-2">
                <span className={labelCls}>Como o cliente envia</span>
                <div className="rounded-2xl bg-[#e7ded3] dark:bg-[#0b141a] p-4">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] dark:bg-[#005c4b] px-3.5 py-2.5 shadow-sm">
                    <p className="text-xs font-medium text-slate-800 dark:text-white whitespace-pre-wrap break-words">
                      {previewMessage || 'Sua mensagem aparecerá aqui.'}
                    </p>
                    <p className="mt-1 text-right text-[9px] text-slate-500 dark:text-slate-300">agora</p>
                  </div>
                </div>
              </div>
            </div>

            {/* DADOS ADMINISTRATIVOS */}
            <div className={cardCls}>
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Dados Administrativos &amp; Operação</h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Visível só para o SLL Hub. Seus clientes não veem estes dados.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelCls}>Nome do responsável *</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                    placeholder="Ex: Ana Silva"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>E-mail de contato da loja *</label>
                  <input
                    type="email"
                    value={form.owner_contact_email}
                    onChange={(e) => setForm((p) => ({ ...p, owner_contact_email: e.target.value }))}
                    placeholder="Ex: dono@minhaloja.com.br"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className={labelCls}>WhatsApp de contato da loja</label>
                  <input
                    type="tel"
                    value={form.owner_whatsapp}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, owner_whatsapp: e.target.value.replace(/[^\d+\-() ]/g, '') }))
                    }
                    onBlur={(e) => setForm((p) => ({ ...p, owner_whatsapp: formatWhatsapp(e.target.value) }))}
                    placeholder="Ex: (41) 99999-9999"
                    className={inputCls}
                  />
                  <p className="text-[10px] text-slate-400">
                    Usado para avisos do sistema. Não é o número do botão de WhatsApp dos vídeos.
                  </p>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#111524]/60 border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-800 dark:text-white block">Ativar métricas e analytics</span>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    Coleta visualizações, retenção e cliques em tempo real na loja.
                  </p>
                </div>
                <Switch
                  on={form.stories_enabled}
                  label="Ativar métricas e analytics"
                  onToggle={() => setForm((p) => ({ ...p, stories_enabled: !p.stories_enabled }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className={saveBtnCls}>
              <SaveContent />
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
