import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Layers } from "lucide-react";
import {
  fmtBRL0,
  fmtDateBR,
  fmtNum,
  simulateScenarios,
  type AgileMetrics,
  type CalendarHelpers,
  type EVMSummary,
  type NetworkResult,
  type ScenarioSimulation,
} from "../engine/calculations";
import type { ProjectDatabase } from "../types/project";
import { Detalhes } from "./ui";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  calH: CalendarHelpers;
  agile: AgileMetrics;
  evm: EVMSummary;
  network: NetworkResult;
  scenarios: ScenarioSimulation[];
}

export const ScenarioSimulatorView: React.FC<Props> = ({
  db,
  statusDate,
  calH,
  agile,
  evm,
  network,
  scenarios,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(["C2", "C6"]);

  const toggleScenario = (cid: string) => {
    if (cid === "C1") {
      setSelectedIds(["C1"]);
      return;
    }
    const base = selectedIds.filter((x) => x !== "C1");
    if (base.includes(cid)) {
      const next = base.filter((x) => x !== cid);
      setSelectedIds(next.length ? next : ["C1"]);
    } else {
      // Verifica compatibilidade pela coluna combinavel_com da tabela 43
      const valid = [...base, cid];
      const allCompatible = valid.every((a) => {
        const rowA = db["43_cenarios"].find((c) => c.id_cenario === a);
        const compat = (rowA?.combinavel_com ?? "").split(";").filter(Boolean);
        return valid.every((b) => a === b || compat.includes(b));
      });
      if (allCompatible) setSelectedIds(valid.sort());
      else setSelectedIds([cid]);
    }
  };

  const customSim = useMemo(
    () => simulateScenarios(db, statusDate, calH, agile, evm, network, selectedIds),
    [db, statusDate, calH, agile, evm, network, selectedIds]
  );

  const c1 = scenarios.find((s) => s.idKey === "C1");
  const c3 = scenarios.find((s) => s.idKey === "C3");
  const c4 = scenarios.find((s) => s.idKey === "C4");

  // Fluxo acumulado comparativo M7 (C1, C3, C4 e customSim)
  const cashFlowChart = (c1?.fluxoAnual ?? []).map((row, idx) => ({
    ano: `Ano ${row.ano}`,
    C1: Math.round(row.fluxoAcumulado / 1000),
    C3: Math.round((c3?.fluxoAnual[idx]?.fluxoAcumulado ?? 0) / 1000),
    C4: Math.round((c4?.fluxoAnual[idx]?.fluxoAcumulado ?? 0) / 1000),
    Selecionado: Math.round((customSim.fluxoAnual[idx]?.fluxoAcumulado ?? 0) / 1000),
  }));

  const barData = scenarios.map((s) => ({
    nome: s.idKey,
    VPL: Math.round(s.vpl / 1000),
    Resultado: Math.round(s.resultadoLiquido / 1000),
  }));

  return (
    <div className="space-y-6">
      {/* Construtor Interativo */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">Simulador de cenários</h2>
            <p className="text-xs text-slate-400">
              Escolha um cenário, ou combine os compatíveis, para ver o novo prazo, o custo e o retorno.
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            Ativo: {customSim.idKey}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          {db["43_cenarios"].map((c) => {
            const active = selectedIds.includes(c.id_cenario);
            return (
              <button
                key={c.id_cenario}
                onClick={() => toggleScenario(c.id_cenario)}
                className={`rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-sky-400 bg-sky-500/15 text-white"
                    : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-300">{c.id_cenario}</span>
                  {active && <CheckCircle2 className="h-4 w-4 text-sky-400" />}
                </div>
                <div className="mt-1 text-xs font-semibold">{c.nome_cenario}</div>
              </button>
            );
          })}
        </div>

        {/* Cartão do cenário selecionado/combinado */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-sky-500/30 bg-slate-950/70 p-4 md:grid-cols-4">
          <div>
            <div className="text-[11px] text-slate-400">Novo término</div>
            <div className="text-base font-bold text-white">{fmtDateBR(customSim.terminoPrevistoDate)}</div>
            <div className="text-xs text-amber-300">{customSim.atrasoContratualDu} dias úteis após o contrato</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Custo previsto</div>
            <div className="text-base font-bold text-white">{fmtBRL0(customSim.entCenario)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Saldo (retorno − custo do atraso)</div>
            <div className="text-base font-bold text-sky-300">{fmtBRL0(customSim.resultadoLiquido)}</div>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="text-[11px] text-slate-400">O que se perde</div>
            <div className="text-[11px] text-slate-200">{customSim.oQueSePerde}</div>
          </div>
        </div>
        <Detalhes titulo="Detalhes financeiros" className="mt-3">
          <p className="text-xs text-slate-300">
            VPL (TMA 14% a.a.): <strong className="text-emerald-300">{fmtBRL0(customSim.vpl)}</strong> · Custo do
            atraso: {fmtBRL0(customSim.custoAtraso)} · Meses de atraso: {fmtNum(customSim.mesesAtraso, 2)} · Payback:{" "}
            {customSim.paybackAnos ? `${fmtNum(customSim.paybackAnos, 2)} anos` : "> 7 anos"}
          </p>
        </Detalhes>
      </div>

      {/* Tabela Comparativa Completa */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Comparação dos cenários</h3>
        </div>
        <p className="-mt-2 mb-3 text-xs text-slate-400">
          Clique numa linha para simular. Em verde, o de melhor saldo.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-2">Cenário</th>
                <th className="py-2 pr-2">Término</th>
                <th className="py-2 pr-2 text-right">Atraso</th>
                <th className="py-2 pr-2 text-right">ENT (R$)</th>
                <th className="py-2 pr-2 text-right">Custo Atraso</th>
                <th className="py-2 pr-2 text-right">VPL (14%)</th>
                <th className="py-2 pr-2 text-right">Payback</th>
                <th className="py-2 pr-2 text-right">Resultado</th>
                <th className="py-2">O que se perde ao escolher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {scenarios.map((s) => {
                const best = Math.max(...scenarios.map((x) => x.resultadoLiquido));
                const isBest = Math.abs(s.resultadoLiquido - best) < 1;
                return (
                  <tr
                    key={s.idKey}
                    onClick={() => setSelectedIds(s.scenarioIds)}
                    className={`cursor-pointer hover:bg-slate-800/40 ${isBest ? "bg-emerald-950/25" : ""}`}
                  >
                    <td className="py-2 pr-2 font-mono font-bold text-sky-300">
                      {s.idKey} {isBest && <span className="ml-1 rounded bg-emerald-500/20 px-1 text-[10px] text-emerald-300">MELHOR</span>}
                    </td>
                    <td className="py-2 pr-2 font-mono">{fmtDateBR(s.terminoPrevistoDate)}</td>
                    <td className="py-2 pr-2 text-right font-mono">{s.atrasoContratualDu} du</td>
                    <td className="py-2 pr-2 text-right font-mono">{fmtBRL0(s.entCenario)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-rose-300">{fmtBRL0(s.custoAtraso)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-emerald-300">{fmtBRL0(s.vpl)}</td>
                    <td className="py-2 pr-2 text-right font-mono">{s.paybackAnos ? `${fmtNum(s.paybackAnos, 2)}a` : "—"}</td>
                    <td className="py-2 pr-2 text-right font-mono font-bold text-white">{fmtBRL0(s.resultadoLiquido)}</td>
                    <td className="max-w-xs py-2 text-[11px] text-slate-300">{s.oQueSePerde}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráficos Financeiros M7 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Fluxo de Caixa Acumulado (M7: C1 × C3 × C4 × {customSim.idKey}, em R$ mil)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="ano" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                <Legend />
                <Line type="monotone" dataKey="C1" stroke="#94a3b8" strokeWidth={2} />
                <Line type="monotone" dataKey="C3" stroke="#fbbf24" strokeWidth={2} />
                <Line type="monotone" dataKey="C4" stroke="#fb7185" strokeWidth={2} />
                <Line type="monotone" dataKey="Selecionado" name={customSim.idKey} stroke="#34d399" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">VPL e Resultado Líquido por Cenário (R$ mil)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="nome" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                <Legend />
                <Bar dataKey="VPL" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Resultado" name="VPL − Custo Atraso" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
