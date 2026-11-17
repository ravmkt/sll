import { useRef, useState } from "react";
import { uploadVideoToBunny } from "@/services/vidlytics/bunnyUpload";

type Props = { storeId: string; onDone?: (videoId: string) => void };

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
      const videoId = await uploadVideoToBunny(storeId, file, setProgress);
      setProgress(100);
      onDone?.(videoId);
    } catch (e: any) {
      setError(e?.message || "Erro inesperado.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
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