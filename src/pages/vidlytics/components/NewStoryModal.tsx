'use client';

import { useState } from 'react';
import { Plus, Trash2, X, MousePointerClick, Eye } from 'lucide-react';
import {
  DisplayLocation,
  PageRuleType,
  DisplayPosition,
  PAGE_RULE_LABELS,
  DISPLAY_POSITION_LABELS,
} from '@/types/vidlytics';
import { VidlyticsDatabaseService } from '@/services/vidlytics/VidlyticsDatabaseService';

interface NewStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  storeId: string;
}

function createEmptyLocation(): DisplayLocation {
  return {
    id: crypto.randomUUID(),
    page: 'all',
    pageValue: null,
    cssSelector: '',
    position: 'afterend',
  };
}

export default function NewStoryModal({
  isOpen,
  onClose,
  onSaved,
  storeId,
}: NewStoryModalProps) {
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState('circle');
  const [scrollDirection, setScrollDirection] = useState('horizontal');
  const [visualStyle, setVisualStyle] = useState('modern');
  const [locations, setLocations] = useState<DisplayLocation[]>([
    createEmptyLocation(),
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function addLocation() {
    setLocations((prev) => [...prev, createEmptyLocation()]);
  }

  function removeLocation(id: string) {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
  }

  function updateLocation(id: string, patch: Partial<DisplayLocation>) {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, ...patch } : loc))
    );
  }

  function handlePickSelector(locationId: string) {
    const url = window.prompt('Informe a URL completa da sua loja (ex: https://minhaloja.com.br):');
    if (!url) return;

    const token = 'sel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const separator = url.includes('?') ? '&' : '?';
    const finalUrl = url + separator + 'widgetSelectToken=' + token + '&widgetSelectStoryId=' + 'new';

    window.open(finalUrl, '_blank');

    let tentativas = 0;
    const polling = setInterval(async () => {
      tentativas++;
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL.replace(/\/rest\/v1.*/, '')}/functions/v1/widget-selector?token=${encodeURIComponent(token)}`
        );
        const result = await response.json();
        const data = result.data;
        const selectorCss =
          (data && typeof data === 'object' && !Array.isArray(data)) ? data.selector
          : (Array.isArray(data) && data[0]) ? data[0].selector
          : null;

        if (result.success && selectorCss) {
          clearInterval(polling);
          updateLocation(locationId, { cssSelector: selectorCss });
        }
      } catch (err) {
        // ignora falhas de rede no polling
      }

      if (tentativas > 150) {
        clearInterval(polling);
      }
    }, 2000);
  }

  function handlePreviewLocation(loc: DisplayLocation) {
    const defaultUrl = window.prompt(
      'Informe a URL base da sua loja para visualizar (ex: https://minhaloja.com.br):',
      window.location.origin
    );
    if (!defaultUrl) return;

    let targetPath = '/';
    if (loc.page === 'product' || loc.page === 'produto') {
      targetPath = '/produtos';
    } else if (loc.page === 'cart' || loc.page === 'carrinho') {
      targetPath = '/carrinho';
    } else if (loc.page === 'url_contains' && loc.pageValue) {
      targetPath = loc.pageValue.startsWith('/') ? loc.pageValue : '/' + loc.pageValue;
    }

    try {
      const parsedUrl = new URL(targetPath, defaultUrl.trim());
      parsedUrl.searchParams.set('vidlytics_preview_story_id', 'new');
      window.open(parsedUrl.toString(), '_blank');
    } catch {
      const glue = defaultUrl.includes('?') ? '&' : '?';
      window.open(defaultUrl + glue + 'vidlytics_preview_story_id=new', '_blank');
    }
  }

  async function handleSave() {
    setError(null);

    if (!title.trim()) {
      setError('Informe um título para o Story.');
      return;
    }

    const invalidUrlRule = locations.find(
      (loc) =>
        (loc.page === 'url_contains' || loc.page === 'url_not_contains') &&
        !loc.pageValue?.trim()
    );
    if (invalidUrlRule) {
      setError('Preencha o valor da URL para as regras "URL contém" / "URL não contém".');
      return;
    }

    if (locations.length === 0) {
      setError('Adicione ao menos uma localização de exibição.');
      return;
    }

    setIsSaving(true);
    try {
      await VidlyticsDatabaseService.saveStory(storeId, {
        name: title.trim(),
        status: 'ATIVO',
        coverUrl: null,
        layout,
        scrollDirection,
        visualStyle,
        displayLocations: locations.map((loc) => ({
          id: loc.id,
          page: loc.page,
          pageValue: loc.pageValue,
          cssSelector: loc.cssSelector.trim(),
          position: loc.position,
        })),
        videoUrls: [],
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar o Story. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Novo Story</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Título */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Lançamento Coleção Verão"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Layout / Direção / Estilo */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Layout</label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="circle">Círculo</option>
              <option value="rectangle">Retângulo</option>
              <option value="fullscreen">Tela cheia</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Direção</label>
            <select
              value={scrollDirection}
              onChange={(e) => setScrollDirection(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Estilo</label>
            <select
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="modern">Moderno</option>
              <option value="minimal">Minimalista</option>
              <option value="bold">Impactante</option>
            </select>
          </div>
        </div>

        {/* Localizações de exibição */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Onde este Story deve aparecer
            </label>
            <button
              type="button"
              onClick={addLocation}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" /> Adicionar localização
            </button>
          </div>

          <div className="space-y-3">
            {locations.map((loc, index) => (
              <div
                key={loc.id}
                className="rounded-md border border-gray-200 bg-gray-50 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">
                    Localização {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreviewLocation(loc)}
                      title="Visualizar widget nesta página da loja"
                      className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      Visualizar
                    </button>
                    {locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLocation(loc.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Página */}
                <div className="mb-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Página
                  </label>
                  <select
                    value={loc.page}
                    onChange={(e) =>
                      updateLocation(loc.id, {
                        page: e.target.value as PageRuleType,
                        pageValue:
                          e.target.value === 'url_contains' ||
                          e.target.value === 'url_not_contains'
                            ? loc.pageValue
                            : null,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {Object.entries(PAGE_RULE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor da URL (condicional) */}
                {(loc.page === 'url_contains' || loc.page === 'url_not_contains') && (
                  <div className="mb-2">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Trecho da URL
                    </label>
                    <input
                      type="text"
                      value={loc.pageValue ?? ''}
                      onChange={(e) =>
                        updateLocation(loc.id, { pageValue: e.target.value })
                      }
                      placeholder="Ex: /promocao"
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                )}

                {/* Seletor CSS */}
                <div className="mb-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Seletor CSS
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={loc.cssSelector}
                      onChange={(e) =>
                        updateLocation(loc.id, { cssSelector: e.target.value })
                      }
                      placeholder=".breadcrumbs"
                      className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handlePickSelector(loc.id)}
                      title="Selecionar elemento visualmente na loja"
                      className="flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      <MousePointerClick className="h-3.5 w-3.5" />
                      Selecionar
                    </button>
                  </div>
                  {!loc.cssSelector && (
                    <p className="mt-1 text-xs text-amber-600">
                      Seletor ainda não definido. Use o botão "Selecionar" ou digite manualmente.
                    </p>
                  )}
                </div>

                {/* Posição */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Posição
                  </label>
                  <select
                    value={loc.position}
                    onChange={(e) =>
                      updateLocation(loc.id, {
                        position: e.target.value as DisplayPosition,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {Object.entries(DISPLAY_POSITION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Story'}
          </button>
        </div>
      </div>
    </div>
  );
}
