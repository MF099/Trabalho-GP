import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Box,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck2,
  MapPin,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react";
import { fmtDateBR, num, type NetworkResult } from "../engine/calculations";
import type { ProjectDatabase } from "../types/project";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  network: NetworkResult;
}

interface MockupScreen {
  id: string;
  title: string;
  epicId: string;
  release: string;
  items: string[];
  subtitle: string;
  nextScreenId: string;
  previewBody: React.ReactNode;
}

const DATE_PRESETS = [
  { date: "2026-05-01", label: "01/05 · Início R1" },
  { date: "2026-06-15", label: "15/06 · Fim R1" },
  { date: "2026-08-15", label: "15/08 · Meio R2" },
  { date: "2026-10-30", label: "30/10 · Fim S14" },
  { date: "2026-11-13", label: "13/11 · Status" },
];

export const Product3DMockupsView: React.FC<Props> = ({ db, statusDate, network }) => {
  const [viewMode, setViewMode] = useState<"MOCKUPS" | "3D">("MOCKUPS");
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
      title: "1. Início & Carteira de Apólices",
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
      title: "2. Aviso de Sinistro & Guincho",
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
      title: "3. Vistoria Guiada por Foto",
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
      title: "4. Checklist de Fotos & Metadados",
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
      title: "5. Análise Automática de Danos (IA)",
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
      title: "6. Justificativa & Revisão da IA",
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
      title: "7. Escolha de Oficina & Agendamento",
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
      title: "8. Portal do Orçamento & Peças",
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
      title: "9. Linha do Tempo do Conserto",
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
      title: "10. Pagamento Pix & Quitação",
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
      title: "11. Portal do Corretor (Tablet)",
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
      title: "12. Prevenção a Fraude & EXIF",
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
      title: "13. Aviso Rápido de Vidros",
      epicId: "EP01",
      release: "R2",
      items: ["MS-161"],
      subtitle: "Fluxo dedicado sem franquia integral (em andamento na S15)",
      nextScreenId: "T14",
      previewBody: (
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-slate-800 p-2">
            Peça: <strong>Para-brisa dianteiro (MS-161)</strong>
          </div>
          <div className="rounded-lg bg-amber-950/40 p-2 text-amber-200">
            Impedimento IP-014 aguardando integração com outro time
          </div>
        </div>
      ),
    },
    {
      id: "T14",
      title: "14. Avaliação NPS & Tablet UX",
      epicId: "EP05",
      release: "R2",
      items: ["MS-131", "MS-224", "MS-228"],
      subtitle: "Avaliação pós-sinistro, versão tablet e ranking mensal",
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
    if (isSwapC5) return { txt: "MERCADO (C5)", cls: "bg-amber-500/20 text-amber-300" };

    const itemObjs = scr.items.map((id) => backlogMap.get(id)).filter(Boolean);
    if (itemObjs.length === 0) return { txt: "PLANEJADA", cls: "bg-slate-800 text-slate-400" };

    const allDoneByDate = itemObjs.every(
      (b) => b!.status === "CONCLUIDO" && b!.data_conclusao && b!.data_conclusao <= controlDate
    );
    if (allDoneByDate) return { txt: "ENTREGUE", cls: "bg-emerald-500/20 text-emerald-300" };

    const anyStartedByDate = itemObjs.some(
      (b) =>
        (b!.data_inicio && b!.data_inicio <= controlDate) ||
        (b!.status === "CONCLUIDO" && b!.data_conclusao && b!.data_conclusao <= controlDate)
    );
    if (anyStartedByDate) return { txt: "EM ANDAMENTO", cls: "bg-sky-500/20 text-sky-300" };

    return { txt: "PLANEJADA", cls: "bg-slate-800 text-slate-400" };
  };

  // Three.js Mapa 3D Esquemático do Produto Digital (Tabela 38 — nota de rodapé do Slide 25)
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selected3dEl, setSelected3dEl] = useState<string>("EL02");

  useEffect(() => {
    if (viewMode !== "3D" || !mountRef.current) return;
    const container = mountRef.current;
    container.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020617");
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(85, 65, 95);
    camera.lookAt(45, 5, 35);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    dirLight.position.set(60, 100, 40);
    scene.add(dirLight);

    const epicCompletion = new Map<string, number>();
    for (const ep of db["13_epicos"]) {
      const items = db["14_backlog_itens"].filter((b) => b.id_epico === ep.id_epico);
      const tot = items.reduce((a, b) => a + num(b.pontos), 0);
      const done = items
        .filter((b) => b.status === "CONCLUIDO" && (!b.data_conclusao || b.data_conclusao <= controlDate))
        .reduce((a, b) => a + num(b.pontos), 0);
      epicCompletion.set(ep.id_epico, tot > 0 ? done / tot : 0);
    }
    const actAvMap = new Map(network.activities.map((a) => [a.id, a.avancoPct / 100]));

    for (const el of db["38_elementos_3d"]) {
      const x = num(el.x);
      const y = num(el.y);
      const z = num(el.z);
      const w = Math.max(0.5, num(el.largura));
      const len = Math.max(0.5, num(el.comprimento));
      const h = Math.max(0.5, num(el.altura));

      let progress = 1;
      if (el.vinculo_tipo === "EPICO") {
        progress = epicCompletion.get(el.vinculo_ids) ?? 0.2;
      } else if (el.vinculo_tipo === "ATIVIDADE") {
        const ids = el.vinculo_ids.split(";").filter(Boolean);
        progress = ids.reduce((a, id) => a + (actAvMap.get(id) ?? 0), 0) / Math.max(1, ids.length);
      }
      if (el.tipo_elemento === "UNIDADE_DE_IMPLANTACAO") {
        const ord = num(el.ordem_de_implantacao, 1);
        const ids = el.vinculo_ids.split(";").filter(Boolean);
        const avg = ids.reduce((a, id) => a + (actAvMap.get(id) ?? 0), 0) / Math.max(1, ids.length);
        progress = avg >= ord / 10 ? 1 : 0.15;
      }

      const displayH = el.tipo_elemento === "AREA" ? h : Math.max(0.8, h * Math.max(0.15, progress));
      const geom = new THREE.BoxGeometry(w, displayH, len);
      let color = 0x1e293b;
      if (el.tipo_elemento === "MODULO_DIGITAL") color = progress >= 0.9 ? 0x10b981 : progress >= 0.4 ? 0x38bdf8 : 0x6366f1;
      else if (el.tipo_elemento === "UNIDADE_DE_IMPLANTACAO") color = progress >= 0.9 ? 0x34d399 : 0x475569;
      else if (el.tipo_elemento === "HARDWARE") color = 0xf59e0b;
      else if (el.tipo_elemento === "EDIFICACAO") color = 0x0ea5e9;
      else if (el.tipo_elemento === "UTILIDADE") color = 0xa855f7;

      const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: el.tipo_elemento !== "AREA" && progress < 0.3,
        opacity: el.tipo_elemento !== "AREA" && progress < 0.3 ? 0.45 : 0.92,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x + w / 2, z + displayH / 2, y + len / 2);
      scene.add(mesh);
    }

    let angle = 0.6;
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      angle += 0.003;
      camera.position.x = 45 + Math.cos(angle) * 75;
      camera.position.z = 35 + Math.sin(angle) * 75;
      camera.lookAt(45, 6, 32);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [viewMode, controlDate, db, network]);

  const el3dSelected = db["38_elementos_3d"].find((e) => e.id_elemento === selected3dEl) ?? db["38_elementos_3d"][0];

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
              Mockups Navegáveis do Aplicativo Maré Seguros (14 Telas)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Cobrindo todos os 8 épicos (EP01–EP08), ligados a itens reais do backlog e releases, com controle de data e filtro de cenário.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("MOCKUPS")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              viewMode === "MOCKUPS" ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            <Smartphone className="h-4 w-4" /> Mockups Navegáveis (14 telas)
          </button>
          <button
            onClick={() => setViewMode("3D")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              viewMode === "3D" ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            <Box className="h-4 w-4" /> Mapa 3D Esquemático (Tab. 38)
          </button>
        </div>
      </div>

      {/* Controle de Data + Cenário (compartilhado) */}
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

      {viewMode === "MOCKUPS" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Galeria de 14 telas */}
          <div className="space-y-3 lg:col-span-2">
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
                Entregues: {statusCounts["ENTREGUE"] ?? 0}
              </span>
              <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-sky-300">
                Em andamento: {statusCounts["EM ANDAMENTO"] ?? 0}
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
                Planejadas: {statusCounts["PLANEJADA"] ?? 0}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {screens.map((scr) => {
                const badge = getScreenStatusAtDate(scr);
                return (
                  <button
                    key={scr.id}
                    onClick={() => setActiveScreenId(scr.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      activeScreenId === scr.id
                        ? "border-sky-400 bg-sky-950/30"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-sky-300">
                        {scr.id} · {scr.epicId} · {scr.release}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                        {badge.txt}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-white">{scr.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{scr.subtitle}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {scr.items.map((id) => (
                        <span key={id} className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                          {id}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Protótipo Navegável no Celular */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mx-auto max-w-[295px] rounded-[2rem] border-4 border-slate-700 bg-slate-950 p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-400">
                <span className="font-bold text-sky-400">Maré Seguros App</span>
                <span>{activeScreen.release} · {fmtDateBR(controlDate)}</span>
              </div>
              <div className="mb-1 text-[11px] font-semibold text-indigo-300">
                {activeScreen.epicId} — {epicMap.get(activeScreen.epicId)?.nome_epico}
              </div>
              <h4 className="mb-3 text-sm font-bold text-white">{activeScreen.title}</h4>

              <div className="min-h-[210px]">{activeScreen.previewBody}</div>

              <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
                <button
                  onClick={() => setActiveScreenId(activeScreen.nextScreenId)}
                  className="w-full rounded-xl bg-sky-500 py-2 text-xs font-bold text-white transition hover:bg-sky-400"
                >
                  Avançar Fluxo → ({activeScreen.nextScreenId})
                </button>
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                  <FileCheck2 className="h-3 w-3" /> Itens: {activeScreen.items.join(", ")}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                Mapa 3D Esquemático dos Módulos Digitais e Implantação (Tabela 38 · {fmtDateBR(controlDate)})
              </span>
            </div>
            <div ref={mountRef} className="h-[420px] w-full overflow-hidden rounded-xl border border-slate-800" />
            <p className="mt-2 text-[11px] text-slate-400">
              Legenda: Verde = concluído até a data · Azul = em andamento · Roxo = núcleo de nuvem · Âmbar = kits de hardware.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="mb-2 text-sm font-semibold text-white">Elementos da Tabela 38 (26 itens)</h3>
            {el3dSelected && (
              <div className="mb-3 rounded-xl border border-sky-500/30 bg-slate-950/70 p-3 text-xs">
                <div className="font-mono font-bold text-sky-300">{el3dSelected.id_elemento}</div>
                <div className="font-semibold text-white">{el3dSelected.nome_elemento}</div>
                <div className="mt-1 text-slate-400">
                  Tipo: {el3dSelected.tipo_elemento} · Vínculo: {el3dSelected.vinculo_tipo} ({el3dSelected.vinculo_ids || "Base"})
                </div>
              </div>
            )}
            <div className="max-h-80 space-y-1 overflow-y-auto text-xs">
              {db["38_elementos_3d"].map((el) => (
                <button
                  key={el.id_elemento}
                  onClick={() => setSelected3dEl(el.id_elemento)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left ${
                    selected3dEl === el.id_elemento ? "bg-sky-500/20 text-white" : "hover:bg-slate-800/50 text-slate-300"
                  }`}
                >
                  <span className="truncate">
                    <span className="mr-1.5 font-mono text-sky-400">{el.id_elemento}</span>
                    {el.nome_elemento}
                  </span>
                  <span className="ml-2 font-mono text-[10px] text-slate-500">{el.vinculo_ids}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
