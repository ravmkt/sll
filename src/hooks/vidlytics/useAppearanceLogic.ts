import { useState, useEffect, useCallback } from 'react';
import { useLoja } from '@/context/LojaContext';
import { VidlyticsDatabaseService, VidlyticsAppearance } from '@/services/vidlytics/VidlyticsDatabaseService';
import { useToast } from '@/components/ui/use-toast';

export function useAppearanceLogic() {
  const { lojaAtiva } = useLoja(); // Obtém a loja do contexto
  const storeId = lojaAtiva?.id;
  const { toast } = useToast();

  const [appearances, setAppearances] = useState<VidlyticsAppearance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAppearances = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await VidlyticsDatabaseService.getAppearances(storeId);
      setAppearances(data);
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar aparências',
        description: err.message || 'Ocorreu um erro ao buscar os estilos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [storeId, toast]);

  useEffect(() => {
    fetchAppearances();
  }, [fetchAppearances]);

  const handleSave = async (appearanceData: Omit<VidlyticsAppearance, 'store_id'>) => {
    if (!storeId) {
      toast({
        title: 'Loja não selecionada',
        description: 'Selecione uma loja ativa antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await VidlyticsDatabaseService.saveAppearance(storeId, appearanceData);
      toast({
        title: 'Sucesso',
        description: 'Aparência salva com sucesso!',
      });
      fetchAppearances();
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Falha ao salvar a aparência.',
        variant: 'destructive',
      });
    }
  };

  return {
    storeId,
    appearances,
    loading,
    refetch: fetchAppearances,
    handleSave,
  };
}
