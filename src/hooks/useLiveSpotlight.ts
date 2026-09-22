import { useState, useEffect, useCallback } from "react";
import { supabaseLiveCommerce } from "@/services/supabaseClients";

interface SpotlightState {
  productId: string | null;
  couponCode: string | null;
  advantageIdx: number | null;
}

export function useLiveSpotlight(liveId: string | null, initial: SpotlightState) {
  const [spotlight, setSpotlight] = useState<SpotlightState>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSpotlight(initial);
  }, [initial.productId, initial.couponCode, initial.advantageIdx]);

  const setProduct = useCallback(
    async (productId: string | null) => {
      setSpotlight((prev) => ({ ...prev, productId }));
      if (!liveId) return;
      try {
        const { error: err } = await supabaseLiveCommerce
          .from("lives")
          .update({ spotlight_product_id: productId })
          .eq("id", liveId);
        if (err) throw err;
      } catch (err: any) {
        setError(err?.message ?? "Erro ao atualizar produto em destaque");
      }
    },
    [liveId]
  );

  const setCoupon = useCallback(
    async (couponCode: string | null) => {
      setSpotlight((prev) => ({ ...prev, couponCode }));
      if (!liveId) return;
      try {
        const { error: err } = await supabaseLiveCommerce
          .from("lives")
          .update({ spotlight_coupon_code: couponCode })
          .eq("id", liveId);
        if (err) throw err;
      } catch (err: any) {
        setError(err?.message ?? "Erro ao atualizar cupom em destaque");
      }
    },
    [liveId]
  );

  const setAdvantage = useCallback(
    async (advantageIdx: number | null) => {
      setSpotlight((prev) => ({ ...prev, advantageIdx }));
      if (!liveId) return;
      try {
        const { error: err } = await supabaseLiveCommerce
          .from("lives")
          .update({ spotlight_advantage_idx: advantageIdx })
          .eq("id", liveId);
        if (err) throw err;
      } catch (err: any) {
        setError(err?.message ?? "Erro ao atualizar vantagem em destaque");
      }
    },
    [liveId]
  );

  const clearAll = useCallback(async () => {
    setSpotlight({ productId: null, couponCode: null, advantageIdx: null });
    if (!liveId) return;
    try {
      const { error: err } = await supabaseLiveCommerce
        .from("lives")
        .update({
          spotlight_product_id: null,
          spotlight_coupon_code: null,
          spotlight_advantage_idx: null,
        })
        .eq("id", liveId);
      if (err) throw err;
    } catch (err: any) {
      setError(err?.message ?? "Erro ao limpar destaques");
    }
  }, [liveId]);

  return { spotlight, setProduct, setCoupon, setAdvantage, clearAll, error };
}
