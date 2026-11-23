import React, { useState } from "react";
import {
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck2,
  MapPin,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { fmtDateBR } from "../engine/calculations";
import type { ProjectDatabase } from "../types/project";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
}

interface MockupScreen {
  id: string;
  title: string;
  epicId: string;
  release: string;
  items: string[];
  subtitle: string;
  nextScreenId: string;
  optional?: boolean;
  previewBody: React.ReactNode;
}

const DATE_PRESETS = [
  { date: "2026-05-01", label: "01/05 · Início R1" },
  { date: "2026-06-15", label: "15/06 · Fim R1" },
  { date: "2026-08-15", label: "15/08 · Meio R2" },
  { date: "2026-10-30", label: "30/10 · Fim S14" },
  { date: "2026-11-13", label: "13/11 · Status" },
];

export const ProductMockupsView: React.FC<Props> = ({ db, statusDate }) => {
  const [scenarioFilter, setScenarioFilter] = useState<"C1" | "C3" | "C4" | "C5">("C1");
  const [controlDate, setControlDate] = useState<string>(statusDate);
  const [activeScreenId, setActiveScreenId] = useState<string>("T01");

  const backlogMap = new Map(db["14_backlog_itens"].map((b) => [b.id_item, b]));
  const epicMap = new Map(db["13_epicos"].map((e) => [e.id_epico, e]));

  const c3Excl = new Set(
    db["45_cenario_backlog"].filter((b) => b.id_cenario === "C3" && b.acao === "EXCLUIR").map((b) => b.id_item)
  );
  const c5Excl = new Set(
    db["45_cenario_backlog"].filter((b) => b.id_cenario === "C5" && b.acao === "EXCLUIR").map((b) => b.id_item)
  );

  // 14 telas navegáveis do Produto Digital (Maré Seguros), ligadas a itens reais do backlog e aos 8 épicos
  const screens: MockupScreen[] = [
    {
      id: "T01",
      title: "Minhas apólices",
      epicId: "EP01",
      release: "R1",
      items: ["MS-101", "MS-102", "MS-116"],
      subtitle: "Identificação do segurado, áudio, B.O. e rascunho",
      nextScreenId: "T02",
      previewBody: (
        <div className="space-y-3 text-xs">
          <div className="rounded-xl bg-sky-600 p-3 text-white">
            <div className="text-[10px] opacity-80">Apólice Ativa · Auto Total</div>
            <div className="text-sm font-bold">Honda HR-V · Placa RDJ-4E21</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-rose-500/20 p-2.5 text-center font-semibold text-rose-200">
              Avisar Sinistro
            </div>
            <div className="rounded-lg bg-slate-800 p-2.5 text-center text-slate-200">
              Sinistro de Vidros
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-slate-300">
            Praça: <strong>Salvador/BA</strong>
            {scenarioFilter === "C4" && (
              <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                + Escolha de Praça (MS-N1)
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "T02",
      title: "Abrir sinistro e pedir guincho",
      epicId: "EP01",
      release: "R1",
      items: ["MS-104", "MS-109", "MS-112", "MS-117"],
      subtitle: "Data, local GPS, terceiro, protocolo imediato e guincho",
      nextScreenId: "T03",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-slate-800 p-2">
            Protocolo na hora: <strong className="text-emerald-300">#MS-2026-9941</strong>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-2">
            <MapPin className="h-4 w-4 text-sky-400" /> Av. Paralela, Salvador - BA (GPS)
          </div>
          <div className="rounded-lg bg-slate-800 p-2">
            Terceiro: <strong>Sim · 1 veículo</strong> · Guincho: <strong>12 min</strong>
          </div>
        </div>
      ),
    },
    {
      id: "T03",
      title: "Vistoria por fotos",
      epicId: "EP02",
      release: "R1",
      items: ["MS-103", "MS-106", "MS-110", "MS-114", "MS-115"],
      subtitle: "Régua virtual, 4 lados, chassi/hodômetro e envio offline",
      nextScreenId: "T04",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-sky-400 bg-slate-900 text-sky-300">
            <Camera className="mr-2 h-5 w-5" /> Régua Virtual · Lado Traseiro
          </div>
          <div className="flex justify-between text-[11px] text-emerald-300">
            <span>✓ Chassi & Hodômetro</span>
            <span>✓ Modo internet fraca</span>
          </div>
        </div>
      ),
    },
    {
      id: "T04",
      title: "Conferir fotos",
      epicId: "EP02",
      release: "R2",
      items: ["MS-159", "MS-160"],
      subtitle: "Mostra ângulos faltantes e valida GPS/horário (Sprint S15)",
      nextScreenId: "T05",
      previewBody: (
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between rounded bg-emerald-950/50 p-2 text-emerald-300">
            <span>Frente + Placa (EXIF OK)</span>
            <span>Concluído</span>
          </div>
          <div className="flex justify-between rounded bg-emerald-950/50 p-2 text-emerald-300">
            <span>Para-choque traseiro</span>
            <span>Concluído</span>
          </div>
          <div className="flex justify-between rounded bg-amber-950/50 p-2 text-amber-300">
            <span>Hodômetro / Chassi</span>
            <span>Faltante (MS-159)</span>
          </div>
        </div>
      ),
    },
    {
      id: "T05",
      title: "Análise dos danos",
      epicId: "EP03",
      release: "R2",
      items: ["MS-138", "MS-140", "MS-141", "MS-142", "MS-182"],
      subtitle: "Classificação de peças, custo estimado e triagem automática",
      nextScreenId: "T06",
      previewBody: (
        <div className="space-y-2 text-xs">
          {scenarioFilter === "C3" ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-rose-200">
              <strong>Removido no Cenário C3:</strong> Corte do épico EP03 (itens R3 excluídos; análise passa para perito).
            </div>
          ) : scenarioFilter === "C5" ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-amber-200">
              <strong>Solução de Mercado (C5):</strong> Motor externo integrado via API (MS-N8 / MS-N9).
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-lg bg-slate-800 p-2">
                Para-choque traseiro: <strong className="text-rose-300">Troca · R$ 2.150</strong>
              </div>
              <div className="rounded-lg bg-slate-800 p-2">
                Lanterna esquerda: <strong className="text-amber-300">Reparo leve · R$ 620</strong>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "T06",
      optional: true,
      title: "Revisar decisão da IA",
      epicId: "EP03",
      release: "R2",
      items: ["MS-157", "MS-184"],
      subtitle: "Transparência da decisão automática e contestação manual",
      nextScreenId: "T07",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-slate-800 p-2">
            Justificativa: <strong>Deformação &gt; 4 cm em polímero (MS-157)</strong>
          </div>
          <div className="rounded-lg bg-sky-600/30 p-2 text-center text-sky-200">
            Contestar / Revisão Manual (MS-184 · R3)
          </div>
        </div>
      ),
    },
    {
      id: "T07",
      title: "Agendar oficina",
      epicId: "EP04",
      release: "R1",
      items: ["MS-107", "MS-113", "MS-118"],
      subtitle: "Rede de 40 oficinas credenciadas com agendamento e prazo",
      nextScreenId: "T08",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="rounded-lg border border-sky-500/40 bg-slate-800 p-2">
            <div className="font-semibold text-white">Bahia AutoCenter (2,1 km)</div>
            <div className="text-[11px] text-emerald-300">★ 4,8 · Kit Vistoria · Entrada amanhã</div>
          </div>
          <div className="rounded-lg bg-slate-800 p-2">
            <div className="font-semibold text-slate-200">Pituba Funilaria (4,8 km)</div>
            <div className="text-[11px] text-slate-400">★ 4,6 · Previsão entrega: 4 dias</div>
          </div>
        </div>
      ),
    },
    {
      id: "T08",
      title: "Orçamento e peças",
      epicId: "EP04",
      release: "R1",
      items: ["MS-105", "MS-111", "MS-119", "MS-158"],
      subtitle: "Orçamento da oficina, chegada de peças e emissão de nota",
      nextScreenId: "T09",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between rounded bg-slate-800 p-2">
            <span>Orçamento oficina</span>
            <strong>R$ 3.420,00</strong>
          </div>
          <div className="flex justify-between rounded bg-slate-800 p-2">
            <span>Franquia apólice</span>
            <strong>R$ 1.200,00</strong>
          </div>
          <div className="rounded bg-emerald-600/30 p-2 text-center font-semibold text-emerald-200">
            Nota para pagamento (MS-158)
          </div>
        </div>
      ),
    },
    {
      id: "T09",
      title: "Acompanhar o conserto",
      epicId: "EP05",
      release: "R2",
      items: ["MS-130", "MS-133", "MS-139", "MS-181"],
      subtitle: "Notificações em tempo real, chat com analista e previsão",
      nextScreenId: "T10",
      previewBody: (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Veículo recebido na oficina
          </div>
          <div className="flex items-center gap-2 text-sky-300">
            <Wrench className="h-3.5 w-3.5" /> Funilaria em execução (MS-133)
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="h-3.5 w-3.5" /> Previsão oficina (MS-181 · R3)
          </div>
        </div>
      ),
    },
    {
      id: "T10",
      title: "Pagar com Pix",
      epicId: "EP06",
      release: "R2",
      items: ["MS-134", "MS-136", "MS-137", "MS-143", "MS-150", "MS-179"],
      subtitle: "Cálculo transparente, pagamento de franquia, Pix e perda total",
      nextScreenId: "T11",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-slate-800 p-2">
            Indenização calculada: <strong className="text-emerald-300">Pix em 24h (MS-134)</strong>
          </div>
          <div className="rounded-lg bg-slate-800 p-2">
            Termo de quitação digital assinado (MS-137)
          </div>
        </div>
      ),
    },
    {
      id: "T11",
      title: "Painel do corretor",
      epicId: "EP07",
      release: "R3",
      items: ["MS-167", "MS-168", "MS-169", "MS-183"],
      subtitle: "Carteira dos 25 corretores, alertas e escalonamento",
      nextScreenId: "T12",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-slate-800 p-2">
            Sinistros da carteira: <strong>14 abertos</strong> (MS-169)
          </div>
          <div className="rounded-lg bg-amber-950/40 p-2 text-amber-200">
            2 alertas de sinistro parado (MS-167)
          </div>
        </div>
      ),
    },
    {
      id: "T12",
      title: "Verificar sinais de fraude",
      epicId: "EP08",
      release: "R3",
      items: ["MS-162", "MS-163", "MS-164", "MS-180"],
      subtitle: "Score de fraude, fotos reutilizadas e detecção de edição",
      nextScreenId: "T13",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-950/50 p-2 text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Score de autenticidade: 97/100
          </div>
          <div className="rounded-lg bg-slate-800 p-2">
            Sem fotos reutilizadas (MS-163) ou edição digital (MS-180)
          </div>
        </div>
      ),
    },
    {
      id: "T13",
      optional: true,
      title: "Avisar dano em vidro",
      epicId: "EP01",
      release: "R2",
      items: ["MS-161"],
      subtitle: "Aviso para danos no para-brisa ou em outro vidro do veículo",
      nextScreenId: "T14",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-slate-800 p-2">
            Peça: <strong>Para-brisa dianteiro (MS-161)</strong>
          </div>
          <div className="rounded-lg bg-amber-950/40 p-2 text-amber-200">
            Use este aviso quando o dano for apenas no vidro do veículo.
          </div>
        </div>
      ),
    },
    {
      id: "T14",
      title: "Avaliar o atendimento",
      epicId: "EP05",
      release: "R2",
      items: ["MS-131", "MS-224", "MS-228"],
      subtitle: "Pesquisa pós-sinistro e indicadores de satisfação",
      nextScreenId: "T01",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-slate-800 p-2 text-center">
            <div className="text-lg font-bold text-emerald-300">NPS 55</div>
            <div className="text-[11px] text-slate-400">Avaliação ao final (MS-131) · Tablet (MS-224)</div>
          </div>
        </div>
      ),
    },
  ];

  const activeScreen = screens.find((s) => s.id === activeScreenId) ?? screens[0];

  // Calcula status dinâmico da tela na data de controle selecionada (Slide 25: "as telas mudam de status")
  const getScreenStatusAtDate = (scr: MockupScreen) => {
    const isCutC3 = scenarioFilter === "C3" && scr.items.some((id) => c3Excl.has(id));
    if (isCutC3) return { txt: "CORTADA (C3)", cls: "bg-rose-500/20 text-rose-300" };
    const isSwapC5 = scenarioFilter === "C5" && scr.items.some((id) => c5Excl.has(id));
    if (isSwapC5) return { txt: "MERCADO (C5)", cls: "bg-violet-500/20 text-violet-200" };

    const itemObjs = scr.items.map((id) => backlogMap.get(id)).filter(Boolean);
    if (itemObjs.length === 0) return { txt: "PLANEJADA", cls: "bg-slate-800 text-slate-400" };

    const allDoneByDate = itemObjs.every(
      (b) => b!.status === "CONCLUIDO" && b!.data_conclusao && b!.data_conclusao <= controlDate
    );
    if (allDoneByDate) return { txt: "ENTREGUE", cls: "bg-emerald-300 text-emerald-950" };

    const anyStartedByDate = itemObjs.some(
      (b) =>
        (b!.data_inicio && b!.data_inicio <= controlDate) ||
        (b!.status === "CONCLUIDO" && b!.data_conclusao && b!.data_conclusao <= controlDate)
    );
    if (anyStartedByDate) return { txt: "EM ANDAMENTO", cls: "border border-amber-400/60 bg-amber-950 text-amber-200" };

    return { txt: "PLANEJADA", cls: "bg-slate-800 text-slate-400" };
  };

  const activeBadge = getScreenStatusAtDate(activeScreen);
  const nextScreen = screens.find((screen) => screen.id === activeScreen.nextScreenId)!;
  const nextStatus = getScreenStatusAtDate(nextScreen).txt;
  const canSkip = nextScreen.optional || ["CORTADA (C3)", "MERCADO (C5)"].includes(nextStatus);
  const advance = () => setActiveScreenId(nextScreen.id);

  const statusCounts = screens.reduce(
    (acc, s) => {
      const st = getScreenStatusAtDate(s).txt;
      acc[st] = (acc[st] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-300">
              Produto Digital · R12 · D17
            </span>
            <h2 className="text-lg font-bold text-white">
              Protótipo Maré Seguros
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Veja as 14 telas e acompanhe o status de cada uma por data e cenário.
          </p>
        </div>
      </div>

      {/* Controle de Data + Cenário */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Calendar className="h-4 w-4 text-sky-400" /> Controle de Data:
          </span>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.date}
              onClick={() => setControlDate(p.date)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                controlDate === p.date ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
          <input
            type="date"
            value={controlDate}
            onChange={(e) => setControlDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Cenário:</span>
          {(["C1", "C3", "C4", "C5"] as const).map((sc) => (
            <button
              key={sc}
              onClick={() => setScenarioFilter(sc)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                scenarioFilter === sc ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300"
              }`}
            >
              {sc}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <label className="grid gap-1.5 text-sm font-semibold text-white xl:hidden">
          Escolher tela
          <select value={activeScreenId} onChange={(event) => setActiveScreenId(event.target.value)} className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5">
            {screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.title}</option>)}
          </select>
        </label>
        <section aria-label="Prévia do aplicativo" className="grid min-w-0 place-items-center rounded-3xl border border-slate-700 bg-slate-900 bg-linear-to-b from-sky-950/60 p-4 sm:p-8">
          <div className="w-full max-w-[360px]">
            <div className="relative rounded-[2.75rem] border-2 border-slate-500 bg-slate-950 p-2 shadow-2xl shadow-black/60">
              <span aria-hidden="true" className="absolute -left-1 top-24 h-10 w-1 rounded-l bg-slate-500" />
              <span aria-hidden="true" className="absolute -right-1 top-28 h-12 w-1 rounded-r bg-slate-500" />
              <div className="flex min-h-[530px] flex-col overflow-hidden rounded-[2.2rem] border border-slate-800 bg-slate-900">
                <div aria-hidden="true" className="relative flex h-12 items-center px-6 text-xs font-semibold text-slate-100">
                  9:41
                  <div className="absolute left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black ring-1 ring-slate-800" />
                </div>
                <div className="flex flex-1 flex-col px-5 pb-5">
                  <div className="mb-6 flex items-center gap-2 border-b border-slate-700 pb-4 text-sm font-semibold text-white">
                    <img src="/mare_seguros.jpeg" alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-0.5" />
                    Maré Seguros
                  </div>
                  <h3 className="mb-4 text-xl font-bold leading-tight text-white">{activeScreen.title}</h3>
                  <div className="flex-1">{activeScreen.previewBody}</div>
                  <p className="mt-6 text-xs text-slate-300">A seguir · {nextScreen.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={advance} className="flex-1 rounded-xl bg-sky-300 px-3 py-3 text-sm font-bold text-slate-950 hover:bg-sky-200">
                      Próxima tela →
                    </button>
                    {canSkip && (
                      <button onClick={() => setActiveScreenId(nextScreen.nextScreenId)} aria-label={`Pular etapa: ${nextScreen.title}`} className="rounded-xl border border-slate-500 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                        Pular etapa
                      </button>
                    )}
                  </div>
                </div>
                <div aria-hidden="true" className="mx-auto mb-3 h-1 w-24 rounded-full bg-slate-500" />
              </div>
            </div>
            <div className="mt-5 space-y-2 text-center text-xs text-slate-300" aria-live="polite">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${activeBadge.cls}`}>
                {activeBadge.txt === "ENTREGUE" && <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}
                {activeBadge.txt === "EM ANDAMENTO" && <Clock aria-hidden="true" className="h-3.5 w-3.5" />}
                {activeBadge.txt}
              </span>
              <p>{activeScreen.release} · {fmtDateBR(controlDate)} · {activeScreen.epicId} — {epicMap.get(activeScreen.epicId)?.nome_epico}</p>
              <p className="flex flex-wrap items-center justify-center gap-1">
                <FileCheck2 aria-hidden="true" className="h-3.5 w-3.5" /> Backlog · {activeScreen.items.join(", ")}
              </p>
              {activeScreen.id === "T13" && <p>IP-014 · Aguardando integração com outro time</p>}
            </div>
          </div>
        </section>

        <section aria-labelledby="mockup-gallery" className="min-w-0 space-y-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 id="mockup-gallery" className="text-sm font-semibold text-white">Telas do aplicativo</h3>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className="rounded-full bg-emerald-300 px-2 py-1 text-emerald-950">Entregues · {statusCounts["ENTREGUE"] ?? 0}</span>
            <span className="rounded-full border border-amber-400/60 bg-amber-950 px-2 py-1 text-amber-200">Em andamento · {statusCounts["EM ANDAMENTO"] ?? 0}</span>
            <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">Planejadas · {statusCounts["PLANEJADA"] ?? 0}</span>
          </div>
          <div className="grid gap-2 sm:max-xl:grid-cols-2 xl:max-h-[590px] xl:overflow-y-auto xl:pr-1">
            {screens.map((screen) => {
              const badge = getScreenStatusAtDate(screen);
              const selected = activeScreen.id === screen.id;
              return (
                <button
                  key={screen.id}
                  aria-pressed={selected}
                  onClick={() => setActiveScreenId(screen.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected ? "border-sky-400 bg-sky-950/60" : "border-slate-800 bg-slate-950/50 hover:border-slate-600"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-300">{screen.id} · {screen.release}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                      {badge.txt === "ENTREGUE" && <CheckCircle2 aria-hidden="true" className="h-3 w-3" />}
                      {badge.txt === "EM ANDAMENTO" && <Clock aria-hidden="true" className="h-3 w-3" />}
                      {badge.txt}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">{screen.title}</div>
                  <div className="mt-1 text-xs text-slate-300">{screen.subtitle}</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
