import { Eye, Film, HardDrive, Zap } from "lucide-react";

export function addonIcon(a: { name: string; target_resource?: string | null }) {
  const t = `${a.target_resource ?? ""} ${a.name}`.toLowerCase();
  if (/video|vídeo/.test(t)) return Film;
  if (/view|visualiza|play/.test(t)) return Eye;
  if (/\bgb\b|storage|armazen/.test(t)) return HardDrive;
  return Zap;
}