import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { getMyVote, submitVote, type FeedbackKind, type FeedbackVote } from "../../services/feedback";

interface Props {
  referenceId: string;
  type?: FeedbackKind;
  storeId?: string;
  question?: string;
  className?: string;
}

export default function FeedbackWidget({
  referenceId,
  type = "tip",
  storeId,
  question = "Esta dica foi útil para sua loja?",
  className = "",
}: Props) {
  const [vote, setVote] = useState<FeedbackVote | null>(null);
  const [askComment, setAskComment] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setVote(null); setDone(false); setAskComment(false); setComment("");
    getMyVote(type, referenceId).then((v) => {
      if (alive && v) { setVote(v); setDone(true); }
    }).catch(() => {});
    return () => { alive = false; };
  }, [type, referenceId]);

  async function send(v: FeedbackVote, text?: string) {
    setBusy(true); setError(null);
    try {
      await submitVote({ type, referenceId, vote: v, comment: text, storeId });
      setVote(v); setAskComment(false); setDone(true);
    } catch {
      setError("Não foi possível enviar agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <Check className="h-3.5 w-3.5 text-green-500" />
        Obrigado pelo feedback!
        <button
          type="button"
          className="underline hover:text-foreground"
          onClick={() => { setDone(false); setAskComment(false); }}
        >
          alterar
        </button>
      </div>
    );
  }

  return (
    <div className={`text-xs text-muted-foreground ${className}`}>
      <div className="flex items-center gap-2">
        <span>{question}</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => send("up")}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted disabled:opacity-50 ${vote === "up" ? "border-green-500 text-green-500" : ""}`}
        >
          <ThumbsUp className="h-3.5 w-3.5" /> Sim
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setAskComment(true)}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted disabled:opacity-50 ${vote === "down" ? "border-red-500 text-red-500" : ""}`}
        >
          <ThumbsDown className="h-3.5 w-3.5" /> Não
        </button>
      </div>
      {askComment && (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={comment}
            maxLength={500}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send("down", comment); }}
            placeholder="O que ficou confuso? (opcional)"
            className="h-8 flex-1 rounded-md border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => send("down", comment)}
            className="h-8 rounded-md bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-red-500">{error}</p>}
    </div>
  );
}
