import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Compass,
  FileSpreadsheet,
  GitBranch,
  Kanban,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import seedJson from "./data/seedData.json";
import {
  buildCalendarHelpers,
  computeAgileMetrics,
  computeEVM,
  computeNetwork,
  fmtBRL0,
  fmtDateBR,
  simulateScenarios,
} from "./engine/calculations";
import { computeGovernanceAndProcurement } from "./engine/extraCalculations";
import { applyQuinzenaBoletins } from "./engine/quinzenaData";
import { logEntryToSupabase, pullStateFromSupabase } from "./lib/supabase";
import type { AuditEntry, ProjectDatabase } from "./types/project";
import { DashboardExecutive } from "./components/DashboardExecutive";
import { DataEntryView } from "./components/DataEntryView";
import { NetworkCpmView } from "./components/NetworkCpmView";
import { EvmView } from "./components/EvmView";
import { AgileBoardView } from "./components/AgileBoardView";
import { GovernanceProcurementView } from "./components/GovernanceProcurementView";
import { PeopleProductivityView } from "./components/PeopleProductivityView";
import { ScenarioSimulatorView } from "./components/ScenarioSimulatorView";
import { Product3DMockupsView } from "./components/Product3DMockupsView";
import { AiAssistantFloating } from "./components/AiAssistantView";

const STORAGE_KEY = "mare-seguros-war-room-db-v1";
const LOG_KEY = "mare-seguros-war-room-logs-v1";

/** Base da data de status oficial: histórico até 30/10 + boletins B1–B9 da quinzena (até 13/11). */
function buildBase1311(): ProjectDatabase {
  return applyQuinzenaBoletins(seedJson as unknown as ProjectDatabase).nextDb;
}

export function App() {
  // Lido uma única vez, ANTES do efeito que grava no localStorage — senão o pull do Supabase nunca roda.
  const [hadSavedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  });

  const [db, setDb] = useState<ProjectDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as ProjectDatabase;
    } catch {
      // ignore storage read error
    }
    // Primeira visita (ex.: professor abrindo o link): abre direto com os dados até 13/11.
    // A volta para 30/10 e o relançamento pelas telas continuam em "Lançamentos".
    return buildBase1311();
  });

  const [statusDate, setStatusDate] = useState<string>("2026-11-13");
  const [operador, setOperador] = useState<string>("Matheus");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOG_KEY);
      return saved ? (JSON.parse(saved) as AuditEntry[]) : [];
    } catch {
      return [];
    }
  });

  // Na primeira abertura sem estado salvo local, tenta carregar snapshot da nuvem ou aplica B1-B9 apenas se usuário clicar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // ignore
    }
  }, [db]);

  useEffect(() => {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(auditLogs));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  useEffect(() => {
    // Primeira visita: usa o snapshot da nuvem se ele já tiver a quinzena completa (≥ 134 itens no backlog),
    // para um snapshot antigo de 30/10 não sobrescrever os dados de 13/11.
    if (hadSavedState) return;
    pullStateFromSupabase().then((res) => {
      if (res.ok && res.db && (res.db["14_backlog_itens"]?.length ?? 0) >= 134) {
        setDb(res.db);
        if (res.statusDate) setStatusDate(res.statusDate);
      }
    });
  }, [hadSavedState]);

  const calH = useMemo(() => buildCalendarHelpers(db["11_calendario"]), [db]);
  const agile = useMemo(() => computeAgileMetrics(db, statusDate, calH), [db, statusDate, calH]);
  const network = useMemo(() => computeNetwork(db, statusDate, calH, agile), [db, statusDate, calH, agile]);
  const evm = useMemo(() => computeEVM(db, statusDate, calH, network), [db, statusDate, calH, network]);
  const governance = useMemo(() => computeGovernanceAndProcurement(db, statusDate), [db, statusDate]);

  const scenarios = useMemo(() => {
    const combos = [
      ["C1"], ["C2"], ["C3"], ["C4"], ["C5"], ["C6"],
      ["C2", "C4"], ["C2", "C6"], ["C2", "C3"], ["C2", "C5"], ["C2", "C3", "C6"], ["C2", "C5", "C6"],
    ];
    return combos.map((ids) => simulateScenarios(db, statusDate, calH, agile, evm, network, ids));
  }, [db, statusDate, calH, agile, evm, network]);

  const handleUpdateDb = (nextDb: ProjectDatabase, log?: AuditEntry) => {
    setDb(nextDb);
    if (log) {
      setAuditLogs((prev) => [log, ...prev].slice(0, 100));
      void logEntryToSupabase(log);
    }
  };

  const handleApplyQuinzena = () => {
    const { nextDb, logs } = applyQuinzenaBoletins(db, [operador, "Colega 2", "Colega 3"]);
    setDb(nextDb);
    setStatusDate("2026-11-13");
    setAuditLogs((prev) => [...logs, ...prev].slice(0, 100));
  };

  const handleResetBase = () => {
    const fresh = seedJson as unknown as ProjectDatabase;
    setDb(fresh);
    setStatusDate("2026-10-30");
    setAuditLogs([]);
  };

  const handleMoveCard = (itemId: string, toStatus: string) => {
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const item = next["14_backlog_itens"].find((b) => b.id_item === itemId);
    if (!item || item.status === toStatus) return;
    const fromStatus = item.status;
    item.status = toStatus;
    if (toStatus === "EM_ANDAMENTO" && !item.data_inicio) item.data_inicio = statusDate;
    if (toStatus === "CONCLUIDO") item.data_conclusao = statusDate;
    next["21_itens_transicoes"].push({
      id_transicao: `TR-${String(next["21_itens_transicoes"].length + 1).padStart(4, "0")}`,
      id_item: itemId,
      data: statusDate,
      status_origem: fromStatus,
      status_destino: toStatus,
      id_pessoa: "P15",
    });
    const si = next["20_sprint_itens"].find((x) => x.id_item === itemId && x.id_sprint === "S15");
    if (si) si.concluido_na_sprint = toStatus === "CONCLUIDO" ? "1" : "0";
    handleUpdateDb(next, {
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      registradoPor: operador,
      tipo: "KANBAN_MOVE",
      resumo: `${itemId}: ${fromStatus} → ${toStatus}`,
      dados: { itemId, fromStatus, toStatus },
    });
  };

  const navItems = [
    { id: "dashboard", label: "Início", icon: LayoutDashboard },
    { id: "entry", label: "Lançamentos (R3)", icon: FileSpreadsheet },
    { id: "network", label: "Prazo e rede CPM", icon: GitBranch },
    { id: "evm", label: "Custo e valor agregado", icon: Activity },
    { id: "agile", label: "Painel Ágil", icon: Kanban },
    { id: "people", label: "Pessoas e produtividade", icon: Users },
    { id: "governance", label: "Riscos e contratos", icon: ShieldAlert },
    { id: "scenarios", label: "Cenários (C1–C6)", icon: Compass },
    { id: "mockups", label: "Mockups do Produto", icon: Smartphone },
  ];

  const isQuinzenaLoaded = db["14_backlog_itens"].length >= 134;
  const activeLabel = navItems.find((n) => n.id === activeTab)?.label ?? "Início";

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setMobileNavOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="mare-shell flex min-h-screen text-slate-100">
      {/* Overlay mobile */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Vertical (identidade visual Maré Seguros) */}
      <aside
        id="project-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-[#1e2b3a] bg-[#0e1620] shadow-xl shadow-black/10 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "invisible -translate-x-full lg:visible"
        }`}
      >
        {/* Brand com Logo Maré Seguros em destaque */}
        <div className="border-b border-[#1e2b3a] p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="h-16 w-full overflow-hidden rounded-xl bg-white shadow-sm">
              <img
                src="/mare_seguros.jpeg"
                alt="Maré Seguros"
                className="h-full w-full scale-[1.15] object-contain"
              />
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 lg:hidden"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-slate-400">Sala de Guerra · ENGN62</span>
            <span className="rounded bg-[#12323a] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#5eead4]">
              G3
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav aria-label="Seções do projeto" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition ${
                  active
                    ? "bg-[#12323a] text-[#5eead4] ring-1 ring-inset ring-sky-400/25"
                    : "text-slate-400 hover:bg-[#14202e] hover:text-slate-100"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#2dd4bf]" : "text-slate-500"}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!isQuinzenaLoaded && (
          <div className="border-t border-slate-800 p-4">
            <button
              onClick={handleApplyQuinzena}
              className="w-full rounded-lg bg-[#139297] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#17a8ae]"
            >
              Carregar Boletins 03–13/11
            </button>
          </div>
        )}
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar minimalista */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#1e2b3a] bg-[#0a1017]/90 px-4 py-3.5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg border border-[#1e2b3a] bg-[#101822] p-2.5 text-slate-300 lg:hidden"
              aria-label="Abrir menu"
              aria-expanded={mobileNavOpen}
              aria-controls="project-navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">{activeLabel}</h1>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Maré Seguros · Acompanhamento do projeto
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-xs">
            {activeTab !== "dashboard" && (
              <div className="hidden rounded-lg border border-[#1e2b3a] bg-[#101822] px-3 py-1.5 text-slate-400 xl:block">
                  Término previsto:{" "}
                  <strong className="font-mono text-amber-300">{fmtDateBR(network.forecastEndDate)}</strong>
                  <span className="mx-2 text-slate-700">|</span>
                  Custo previsto: <strong className="font-mono text-slate-100">{fmtBRL0(evm.entTotal)}</strong>
              </div>
            )}
            <label className="flex flex-col gap-0.5 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 sm:px-3">
              <span className="text-[11px] font-medium text-slate-400">Data de status</span>
              <select
                value={statusDate}
                onChange={(event) => setStatusDate(event.target.value)}
                className="bg-slate-900 font-semibold tabular-nums text-sky-300"
              >
                <option value="2026-10-30">30/10/2026</option>
                <option value="2026-11-13">13/11/2026</option>
              </select>
            </label>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 lg:px-8">
        {activeTab === "dashboard" && (
          <DashboardExecutive
            db={db}
            statusDate={statusDate}
            network={network}
            evm={evm}
            agile={agile}
            scenarios={scenarios}
            governance={governance}
            onNavigate={handleSelectTab}
          />
        )}
        {activeTab === "entry" && (
          <DataEntryView
            db={db}
            statusDate={statusDate}
            operador={operador}
            auditLogs={auditLogs}
            onChangeOperador={setOperador}
            onChangeStatusDate={setStatusDate}
            onUpdateDb={handleUpdateDb}
            onApplyQuinzena={handleApplyQuinzena}
            onResetBase={handleResetBase}
          />
        )}
        {activeTab === "network" && <NetworkCpmView db={db} network={network} />}
        {activeTab === "evm" && <EvmView db={db} statusDate={statusDate} network={network} agile={agile} />}
        {activeTab === "agile" && (
          <AgileBoardView db={db} statusDate={statusDate} agile={agile} onMoveCard={handleMoveCard} />
        )}
        {activeTab === "governance" && <GovernanceProcurementView db={db} statusDate={statusDate} />}
        {activeTab === "people" && (
          <PeopleProductivityView
            db={db}
            statusDate={statusDate}
            forecastEndDate={network.forecastEndDate}
            calH={calH}
          />
        )}
        {activeTab === "scenarios" && (
          <ScenarioSimulatorView
            db={db}
            statusDate={statusDate}
            calH={calH}
            agile={agile}
            evm={evm}
            network={network}
            scenarios={scenarios}
          />
        )}
        {activeTab === "mockups" && <Product3DMockupsView db={db} statusDate={statusDate} network={network} />}
        </main>
      </div>

      {/* Assistente de IA flutuante: disponível em todas as telas */}
      <AiAssistantFloating
        db={db}
        statusDate={statusDate}
        network={network}
        evm={evm}
        agile={agile}
        scenarios={scenarios}
        activeTab={activeTab}
      />
    </div>
  );
}

export default App;
