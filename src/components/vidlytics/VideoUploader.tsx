import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { supabase } from "@/lib/supabase";

type Props = { storeId: string; onDone?: (videoId: string) => void };

const ERRORS: Record<string, string> = {
  video_limit_reached: "Limite de vídeos do plano atingido.",
  storage_limit_reached: "Limite de armazenamento do plano atingido.",
  plan_not_found: "Plano não encontrado.",
  forbidden: "Sem permissão para esta loja.",
  unauthorized: "Sessão expirada. Faça login novamente.",
};

export default function VideoUploader({ storeId, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    setBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("video-upload-init", {
        body: { store_id: storeId, title: file.name.replace(/\.[^.]+$/, "") },
      });
      if (fnError || !data?.video_id) {
        let code = "";
        try {
          code = (await (fnError as any)?.context?.json())?.error ?? "";
        } catch {}
        throw new Error(ERRORS[code] ?? code ?? fnError?.message ?? "Falha ao iniciar upload.");
      }

      const upload = new tus.Upload(file, {
        endpoint: data.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: data.headers,
        metadata: { filetype: file.type, title: file.name },
        onError: (err) => {
          setError(err.message);
          setBusy(false);
        },
        onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
        onSuccess: () => {
          setBusy(false);
          setProgress(100);
          onDone?.(data.video_id);
        },
      });
      upload.start();
    } catch (e: any) {
      setError(e.message || "Erro inesperado.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? `Enviando… ${progress}%` : "Enviar vídeo"}
      </button>
      {busy && (
        <div className="h-2 w-full overflow-hidden rounded bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
