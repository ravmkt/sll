import { useState, useEffect, useCallback, useRef } from "react";
import { supabaseLiveCommerce } from "@/services/supabaseClients";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface LiveChatMessage {
  id: string;
  live_id: string;
  store_id: string;
  author_name: string;
  message: string;
  is_from_store: boolean;
  created_at: string;
}

export function useLiveChat(liveId: string | null, storeId: string | null) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!liveId) return;
    setLoading(true);
    try {
      const { data, error: err } = await supabaseLiveCommerce
        .from("live_chat_messages")
        .select("*")
        .eq("live_id", liveId)
        .order("created_at", { ascending: true });

      if (err) throw err;
      setMessages(data ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    fetchMessages();

    if (!liveId) return;

    const channel = supabaseLiveCommerce
      .channel(`live-chat-${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "live_commerce",
          table: "live_chat_messages",
          filter: `live_id=eq.${liveId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as LiveChatMessage]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabaseLiveCommerce.removeChannel(channel);
    };
  }, [liveId, fetchMessages]);

  const sendMessage = async (authorName: string, message: string, isFromStore = false) => {
    if (!liveId || !storeId || !message.trim()) return false;
    try {
      const { error: err } = await supabaseLiveCommerce
        .from("live_chat_messages")
        .insert({
          live_id: liveId,
          store_id: storeId,
          author_name: authorName.trim(),
          message: message.trim(),
          is_from_store: isFromStore,
        });

      if (err) throw err;
      return true;
    } catch (err: any) {
      setError(err?.message ?? "Erro ao enviar mensagem");
      return false;
    }
  };

  return { messages, loading, error, sendMessage, refetch: fetchMessages };
}
