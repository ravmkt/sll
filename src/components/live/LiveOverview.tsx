import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Lightbulb, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoja } from "@/contexts/LojaContext";
import { supabase } from "@/lib/supabase";
import { CommercialDatesService } from "@/services/CommercialDatesService";
import {
  CommercialDate,
  CommercialDateOccurrence,
  getMonthOccurrences,
  getUpcoming,
} from "@/lib/commercialDates";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const daysLabel = (n: number) => (n === 0 ? "Hoje" : n === 1 ? "Amanhã" : `em ${n} dias`);

interface LiveOverviewProps {
  onCreateLive: (occ: CommercialDateOccurrence) => void;
}

export function LiveOverview({ onCreateLive }: LiveOverviewProps) {
  const { store, storeId } = useLoja();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sectorId, setSectorId] = useState<string | null | undefined>(store?.sector_id);
  const [dates, setDates] = useState<CommercialDate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (store?.sector_id !== undefined) {
      setSectorId(store.sector_id);
      return;
    }
    if (!storeId) return;
    supabase
      .from("stores")
      .select("sector_id")
      .eq("id", storeId)
      .maybeSingle()
      .then(({ data }) => setSectorId(data?.sector_id ?? null));
  }, [store, storeId]);

  useEffect(() => {
    if (sectorId === undefined) return;
    setLoading(true);
    CommercialDatesService.getForSector(sectorId)
      .then(setDates)
      .catch((e) => {
        console.error("Erro ao carregar datas comerciais:", e);
        setDates([]);
      })
      .finally(() => setLoading(false));
  }, [sectorId]);

  const monthOcc = useMemo(() => getMonthOccurrences(dates, cursor.y, cursor.m, today), [dates, cursor, today]);
  const upcoming = useMemo(() => getUpcoming(dates, 3, today), [dates, today]);

  const firstWeekday = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const occByDay = new Map<number, CommercialDateOccurrence[]>();
  monthOcc.forEach((o) => {
    const k = o.date.getDate();
    occByDay.set(k, [...(occByDay.get(k) || []), o]);
  });

  const moveMonth = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const isToday = (day: number) =>
    day === today.getDate() && cursor.m === today.getMonth() && cursor.y === today.getFullYear();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Visão Geral</h1>
        <p className="text-sm text-slate-500">Datas comerciais do seu setor para planejar as próximas lives.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-[#0094eb]" />
              {MONTHS[cursor.m]} {cursor.y}
            </CardTitle>
            <div className="flex gap-1">
              <button type="button" onClick={() => moveMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100" title="Mês anterior">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => moveMonth(1)} className="p-2 rounded-lg hover:bg-slate-100" title="Próximo mês">
                <ChevronRight size={18} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={`e${i}`} />;
                const occs = occByDay.get(day);
                return (
                  <div
                    key={day}
                    title={occs?.map((o) => o.name).join(", ")}
                    className={`h-14 rounded-lg border text-sm flex flex-col items-center justify-center ${
                      occs
                        ? "bg-[#fd8539]/10 border-[#fd8539]/40 text-[#c2571a] font-bold"
                        : isToday(day)
                        ? "border-[#0094eb] text-[#0094eb] font-bold"
                        : "border-transparent text-slate-600"
                    }`}
                  >
                    <span>{day}</span>
                    {occs && <span className="text-[9px] leading-none truncate max-w-full px-1">{occs[0].name}</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-slate-400">Carregando...</p>}
            {!loading && upcoming.length === 0 && <p className="text-sm text-slate-400">Nenhuma data cadastrada para o seu setor.</p>}
            {upcoming.map((o) => (
              <div key={o.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-slate-800">{o.name}</span>
                  <span className={`text-xs font-bold ${o.inLeadWindow ? "text-[#fd8539]" : "text-slate-400"}`}>{daysLabel(o.daysLeft)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {fmt(o.date)} · programe a live até {fmt(o.deadline)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datas de {MONTHS[cursor.m]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {monthOcc.length === 0 && <p className="text-sm text-slate-400">Nenhuma data comercial neste mês.</p>}
          {monthOcc.map((o) => (
            <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">
                  {o.name} <span className="text-slate-400 font-normal">· {fmt(o.date)}</span>
                </p>
                {o.tip && (
                  <p className="text-sm text-slate-500 mt-1 flex items-start gap-1.5">
                    <Lightbulb size={14} className="mt-0.5 shrink-0 text-[#fd8539]" />
                    {o.tip} Programe sua live até {fmt(o.deadline)}.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onCreateLive(o)}
                className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-bold text-white hover:bg-[#007bc4]"
              >
                <Radio size={16} /> Criar live para esta data
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}