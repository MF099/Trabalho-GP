import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Box,
  Compass,
  FileSpreadsheet,
  GitBranch,
  Kanban,
  LayoutDashboard,
  ShieldAlert,
  Users,
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
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "entry", label: "Lançar Dados (R3)", icon: FileSpreadsheet },
    { id: "network", label: "Rede & CPM", icon: GitBranch },
    { id: "evm", label: "Valor Agregado", icon: Activity },
    { id: "agile", label: "Painel Ágil", icon: Kanban },
    { id: "governance", label: "Riscos & Contratos", icon: ShieldAlert },
    { id: "people", label: "Pessoas & Produtiv.", icon: Users },
    { id: "scenarios", label: "Cenários (C1–C6)", icon: Compass },
    { id: "mockups", label: "Mockups & 3D", icon: Box },
    { id: "ai", label: "Assistente IA", icon: Bot },
  ];

  const isQuinzenaLoaded = db["14_backlog_itens"].length >= 134;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-sky-500/20 px-2 py-0.5 font-mono text-xs font-bold text-sky-300">
                ENGN62 · G3
              </span>
              <h1 className="text-base font-bold text-white sm:text-lg">
                Sala de Guerra · Maré Seguros
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">
              Aplicativo de aviso de sinistro com vistoria por foto · Duas Trilhas (ProjectLibre + Jira)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!isQuinzenaLoaded && (
              <button
                onClick={handleApplyQuinzena}
                className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-amber-400"
              >
                Carregar Boletins 03–13/11 (Quinzena)
              </button>
            )}
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5">
              Status:{" "}
              <select
                value={statusDate}
                onChange={(e) => setStatusDate(e.target.value)}
                className="bg-transparent font-mono font-semibold text-sky-300 focus:outline-none"
              >
                <option value="2026-10-30">30/10/2026</option>
                <option value="2026-11-13">13/11/2026</option>
              </select>
            </div>
            <div className="hidden rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 sm:block">
              Término Prev.:{" "}
              <strong className="text-amber-300">{fmtDateBR(network.forecastEndDate)}</strong> · ENT:{" "}
              <strong className="text-rose-300">{fmtBRL0(evm.entTotal)}</strong> · IDC:{" "}
              <strong className="text-white">{fmtNum(evm.idcTotal, 2)}</strong>
            </div>
          </div>
        </div>

        {/* Navigation Pills */}
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
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
  );
}

export default App;
