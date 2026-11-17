import * as tus from "tus-js-client";
import { supabase } from "@/lib/supabase";

const ERRORS: Record<string, string> = {
  video_limit_reached: "Limite de vídeos do plano atingido.",
  storage_limit_reached: "Limite de armazenamento do plano atingido.",
  plan_not_found: "Plano não encontrado.",
  forbidden: "Sem permissão para esta loja.",
  unauthorized: "Sessão expirada. Faça login novamente.",
};

export async function uploadVideoToBunny(
  storeId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("video-upload-init", {
    body: { store_id: storeId, title: file.name.replace(/\.[^.]+$/, "") },
  });
  if (error || !data?.video_id) {
    let code = "";
    try {
      code = (await (error as any)?.context?.json())?.error ?? "";
    } catch {}
    throw new Error(ERRORS[code] || code || error?.message || "Falha ao iniciar upload.");
  }

  await new Promise<void>((resolve, reject) => {
    new tus.Upload(file, {
      endpoint: data.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: data.headers,
      metadata: { filetype: file.type, title: file.name },
      onError: reject,
      onProgress: (sent, total) => onProgress?.(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    }).start();
  });

  return data.video_id as string;
}
