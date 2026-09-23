import React, { useState, useEffect, useCallback } from 'react';
import { 
  Palette, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Star 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  AparenciaModal, 
  ExtendedAppearance, 
  defaultFloatingDevice, 
  defaultCarouselDevice, 
  defaultGridDevice, 
  defaultModalConfig 
} from '../components/AparenciaModal';

export const AparenciaTab: React.FC = () => {
  const [storeId, setStoreId] = useState<string>('');
  const [appearances, setAppearances] = useState<ExtendedAppearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAppearance, setSelectedAppearance] = useState<ExtendedAppearance | null>(null);

  const fetchStoreAndAppearances = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: storeData } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_user_id', user.id)
        .single();

      if (!storeData?.id) return;
      setStoreId(storeData.id);

      const { data: appData, error } = await supabase
        .schema('vidlytics')
        .from('appearances')
        .select('*')
        .eq('store_id', storeData.id)
        .order('is_default', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar aparências:', error);
        return;
      }

      if (appData) {
        const formatted: ExtendedAppearance[] = appData.map(item => ({
          id: item.id,
          store_id: item.store_id,
          name: item.name || 'Estilo sem nome',
          is_default: !!item.is_default,
          primary_color: item.primary_color || '#0094eb',
          useGlobalAppearance: !!item.use_global_appearance,
          floating_config: item.floating_config || { desktop: { ...defaultFloatingDevice }, mobile: { ...defaultFloatingDevice } },
          carousel_config: item.carousel_config || { desktop: { ...defaultCarouselDevice }, mobile: { ...defaultCarouselDevice } },
          dynamic_carousel_config: item.dynamic_carousel_config || { desktop: { ...defaultCarouselDevice }, mobile: { ...defaultCarouselDevice } },
          grid_config: item.grid_config || { desktop: { ...defaultGridDevice }, mobile: { ...defaultGridDevice } },
          modal_config: item.modal_config || { ...defaultModalConfig },
        }));
        setAppearances(formatted);
      }
    } catch (err) {
      console.error('Falha geral ao carregar aparências:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreAndAppearances();
  }, [fetchStoreAndAppearances]);

  const handleOpenCreate = () => {
    setSelectedAppearance(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ExtendedAppearance) => {
    setSelectedAppearance(item);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Tem certeza que deseja excluir este estilo de aparência?')) return;

    try {
      const { error } = await supabase.schema('vidlytics').from('appearances').delete().eq('id', id);
      if (error) throw error;
      fetchStoreAndAppearances();
    } catch (err: any) {
      alert('Erro ao excluir: ' + (err?.message || 'Falha na comunicação'));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Aparência</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Customize a identidade visual, widgets, carrosséis, grades e player da sua loja.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-blue-600 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm transition"
        >
          <Plus size={16} /> NOVO ESTILO
        </button>
      </div>

      {/* LISTA DE ESTILOS */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0094eb] text-white flex items-center justify-center shadow-sm">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Estilos Cadastrados</h3>
              <p className="text-xs text-slate-400">Templates e temas ativos configurados para a sua vitrine.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-blue-50 text-[#0094eb] rounded-full text-xs font-bold tracking-wider uppercase">
            {appearances.length} {appearances.length === 1 ? 'ESTILO' : 'ESTILOS'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0094eb]" />
            <span className="text-xs font-medium">Carregando estilos configurados...</span>
          </div>
        ) : appearances.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-600">Nenhum estilo customizado encontrado.</p>
            <p className="text-xs text-slate-400">Crie seu primeiro estilo visual para dar personalidade aos seus vídeos.</p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#0094eb] hover:bg-blue-100 rounded-xl text-xs font-bold transition"
            >
              <Plus size={14} /> Começar Agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-4 px-2 w-[40%]">TEMPLATE</th>
                  <th className="py-4 px-4 w-[25%]">COR PRINCIPAL</th>
                  <th className="py-4 px-4 w-[20%]">STATUS</th>
                  <th className="py-4 px-4 w-[15%] text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {appearances.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg shadow-xs border border-slate-200"
                          style={{ backgroundColor: item.primary_color }}
                        />
                        <div>
                          <p className="font-bold text-slate-800 text-sm normal-case">{item.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">
                            {item.useGlobalAppearance ? 'Sincronizado (Desktop + Mobile)' : 'Layouts Independentes'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: item.primary_color }} />
                        <span className="font-mono text-slate-600 text-xs">{item.primary_color}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {item.is_default ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-[#0094eb] rounded-full text-[11px] font-bold">
                          <Star size={12} className="fill-current" /> PADRÃO
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-medium normal-case">Secundário</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2 text-slate-400">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition"
                          title="Editar Estilo"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir Estilo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DESACOPLADO */}
      <AparenciaModal
        isOpen={isModalOpen}
        mode={modalMode}
        storeId={storeId}
        initialData={selectedAppearance}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchStoreAndAppearances}
      />
    </div>
  );
};

export default AparenciaTab;