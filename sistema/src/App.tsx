import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
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
  fmtNum,
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
import { AiAssistantView } from "./components/AiAssistantView";

const STORAGE_KEY = "mare-seguros-war-room-db-v1";
const LOG_KEY = "mare-seguros-war-room-logs-v1";

export function App() {
  const [db, setDb] = useState<ProjectDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as ProjectDatabase;
    } catch {
      // ignore storage read error
    }
    // Inicializa com base até 30/10 + permite aplicar quinzena B1-B9 pelas telas ou 1 clique
    return seedJson as unknown as ProjectDatabase;
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
    // Tenta pull silencioso se ainda estiver no seed 30/10 e houver snapshot no Supabase
    if (!localStorage.getItem(STORAGE_KEY)) {
      pullStateFromSupabase().then((res) => {
        if (res.ok && res.db) setDb(res.db);
      });
    }
  }, []);

  const calH = useMemo(() => buildCalendarHelpers(db["11_calendario"]), [db]);
  const agile = useMemo(() => computeAgileMetrics(db, statusDate, calH), [db, statusDate, calH]);
  const network = useMemo(() => computeNetwork(db, statusDate, calH, agile), [db, statusDate, calH, agile]);
  const evm = useMemo(() => computeEVM(db, statusDate, calH, network), [db, statusDate, calH, network]);
  const governance = useMemo(() => computeGovernanceAndProcurement(db, statusDate), [db, statusDate]);

  const scenarios = useMemo(() => {
    const combos = [
      ["C1"], ["C2"], ["C3"], ["C4"], ["C5"], ["C6"],
      ["C2", "C6"], ["C2", "C3"], ["C2", "C5"], ["C2", "C3", "C6"], ["C2", "C5", "C6"],
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
    { id: "network", label: "Prazo & Rede CPM", icon: GitBranch },
    { id: "evm", label: "Custo & Valor Agregado", icon: Activity },
    { id: "agile", label: "Painel Ágil", icon: Kanban },
    { id: "people", label: "Pessoas & Produtiv.", icon: Users },
    { id: "governance", label: "Riscos & Contratos", icon: ShieldAlert },
    { id: "scenarios", label: "Cenários (C1–C6)", icon: Compass },
    { id: "mockups", label: "Mockups do Produto", icon: Smartphone },
    { id: "ai", label: "Assistente IA", icon: Bot },
  ];

  const isQuinzenaLoaded = db["14_backlog_itens"].length >= 134;
  const activeLabel = navItems.find((n) => n.id === activeTab)?.label ?? "Início";

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#0d0e10] text-zinc-100">
      {/* Overlay mobile */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Vertical (estilo executivo) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-zinc-800/90 bg-[#121417] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#29301b] px-2 py-0.5 font-mono text-[11px] font-bold text-[#c7e95e]">
                G3
              </span>
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                Maré Seguros
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">Sala de Guerra · ENGN62</p>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition ${
                  active
                    ? "bg-[#2b321c] text-[#cde86b]"
                    : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#cde86b]" : "text-zinc-500"}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="space-y-2.5 border-t border-zinc-800/80 p-4 text-xs">
          {!isQuinzenaLoaded && (
            <button
              onClick={handleApplyQuinzena}
              className="w-full rounded-lg bg-[#c7e95e] px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-[#d5f279]"
            >
              Carregar Boletins 03–13/11
            </button>
          )}
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#0d0e10] px-3 py-2">
            <span className="text-zinc-400">Status</span>
            <select
              value={statusDate}
              onChange={(e) => setStatusDate(e.target.value)}
              className="bg-transparent font-mono font-semibold text-[#cde86b] focus:outline-none"
            >
              <option value="2026-10-30">30/10/2026</option>
              <option value="2026-11-13">13/11/2026</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar minimalista */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-[#0d0e10]/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-300 lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100 sm:text-base">{activeLabel}</h1>
              <p className="hidden text-[11px] text-zinc-500 sm:block">
                Aplicativo de aviso de sinistro com vistoria por foto · Duas Trilhas (ProjectLibre + Jira)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="hidden rounded-lg border border-zinc-800 bg-[#141619] px-3 py-1.5 text-zinc-400 md:block">
              Término:{" "}
              <strong className="font-mono text-amber-300">{fmtDateBR(network.forecastEndDate)}</strong>
              <span className="mx-2 text-zinc-700">|</span>
              ENT: <strong className="font-mono text-zinc-100">{fmtBRL0(evm.entTotal)}</strong>
              <span className="mx-2 text-zinc-700">|</span>
              IDC: <strong className="font-mono text-rose-300">{fmtNum(evm.idcTotal, 2)}</strong>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
        {activeTab === "dashboard" && (
          <DashboardExecutive
            db={db}
            statusDate={statusDate}
            network={network}
            evm={evm}
            agile={agile}
            scenarios={scenarios}
            governance={governance}
            onNavigate={setActiveTab}
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
        {activeTab === "ai" && (
          <AiAssistantView
            db={db}
            statusDate={statusDate}
            network={network}
            evm={evm}
            agile={agile}
            scenarios={scenarios}
          />
        )}
        </main>
      </div>
    </div>
  );
}

export default App;
