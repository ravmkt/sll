import { useEffect, useState } from "react";
import { ConfirmDangerModal } from "@/components/common/AppModal";

export default function LiveDeleteHost() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: Event) => setId(((e as CustomEvent).detail?.id as string | undefined) ?? null);
    window.addEventListener("live:delete-ask", h);
    return () => window.removeEventListener("live:delete-ask", h);
  }, []);

  return (
    <ConfirmDangerModal
      open={id !== null}
      title="EXCLUIR LIVE"
      itemName=""
      message="Esta ação é irreversível. A live será removida permanentemente."
      onClose={() => setId(null)}
      onConfirm={() => {
        const x = id;
        setId(null);
        if (x) window.dispatchEvent(new CustomEvent("live:delete-confirmed", { detail: { id: x } }));
      }}
    />
  );
}