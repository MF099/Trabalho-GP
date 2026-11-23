import React, { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtBRL0, fmtDateBR, fmtNum, type NetworkResult } from "../engine/calculations";
import { computeM4Compression } from "../engine/extraCalculations";
import type { ProjectDatabase } from "../types/project";
import { Detalhes, useLigacaoGrafico } from "./ui";

interface Props {
  db: ProjectDatabase;
  network: NetworkResult;
}

export const NetworkCpmView: React.FC<Props> = ({ db, network }) => {
  const [filterMode, setFilterMode] = useState<"ALL" | "CRITICAL" | "M1">("ALL");
  const m1Ids = new Set(["A22", "A23", "A24", "A25", "A26", "A27", "A28", "A29", "A30", "A31", "A34", "A35"]);
  const m4 = computeM4Compression(db, 5);
  const ligM4 = useLigacaoGrafico(m4.steps, "novoPrazo");

  const visibleActs = network.activities.filter((a) => {
    if (filterMode === "CRITICAL") return a.criticaForecast || a.criticaLb;
    if (filterMode === "M1") return m1Ids.has(a.id);
    return true;
  });

  // PERT M1 & M2 stats
  const m1Acts = network.activities.filter((a) => m1Ids.has(a.id));
  const m1CritIds = ["A22", "A25", "A26", "A27", "A31", "A35"];
  const m1Sigma = Math.sqrt(
    m1Acts.filter((a) => m1CritIds.includes(a.id)).reduce((acc, a) => acc + a.sigma * a.sigma, 0)
  );

  return (
    <div className="space-y-6">
      {/* Resumo do prazo */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Término planejado</div>
          <div className="mt-1 text-xl font-bold text-white">{fmtDateBR(network.terminoLbDate)}</div>
          <div className="mt-1 text-xs text-slate-400">Data da linha de base aprovada</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Término previsto hoje</div>
          <div className="mt-1 text-xl font-bold text-amber-300">{fmtDateBR(network.forecastEndDate)}</div>
          <div className="mt-1 text-xs text-rose-300">{network.atrasoContratualDu} dias úteis após o contrato</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Atividades que definem o prazo</div>
          <div className="mt-1 text-xl font-bold text-white">{network.criticalPathForecast.length}</div>
          <div className="mt-1 text-xs text-slate-400">Qualquer atraso nelas atrasa o projeto</div>
        </div>
      </div>

      {/* Caminho crítico */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Caminho crítico previsto</h3>
        <p className="mb-2 text-xs text-slate-400">A sequência de atividades sem folga até o término.</p>
        <div className="flex flex-wrap items-center gap-2 py-2">
          {network.criticalPathForecast.map((id, idx) => {
            const act = network.activities.find((a) => a.id === id);
            return (
              <React.Fragment key={id}>
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-rose-300">{id}</span>
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300">
                      {act?.disciplina}
                    </span>
                  </div>
                  <div className="mt-1 max-w-[160px] truncate text-[11px] text-slate-200">
                    {act?.nome}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-slate-400">
                    até {fmtDateBR(act?.forecastEndDate ?? "")}
                  </div>
                </div>
                {idx < network.criticalPathForecast.length - 1 && (
                  <span className="text-slate-500">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detalhes técnicos: tabela CPM, PERT e compressão (conferência com caderno M1, M2 e M4) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Detalhes técnicos</h3>
        <p className="text-xs text-slate-400">
          Rede completa, incerteza do prazo e compressão, para conferir com o ProjectLibre e o caderno.
        </p>
        <Detalhes titulo="Abrir tabela da rede, PERT e compressão" className="mt-3">
      <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
        <strong className="text-white">Incerteza da sub-rede M1 (folha M2):</strong> σ = {fmtNum(m1Sigma, 2)} du ·
        Média M1 = 106 du · P(≤111 du) ≈ 85,7%. Linha de base: {network.duracaoLbDu} du (caminho{" "}
        {network.criticalPathLb.join(" → ")}). Previsão: {network.forecastEndDu} du.
      </div>
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Tabela CPM completa (linha de base × previsão)</h3>
          <div className="flex gap-2">
            {(["ALL", "CRITICAL", "M1"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  filterMode === m ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"
                }`}
              >
                {m === "ALL" ? "Todas (42)" : m === "CRITICAL" ? "Críticas" : "Sub-rede M1 (12)"}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-900 text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 pr-2">Atividade</th>
                <th className="py-2 pr-2 text-right">Dur LB</th>
                <th className="py-2 pr-2 text-right">ES..EF (LB)</th>
                <th className="py-2 pr-2 text-right">Folga LB</th>
                <th className="py-2 pr-2 text-right">Avanço</th>
                <th className="py-2 pr-2 text-right">Prev ES..EF</th>
                <th className="py-2 pr-2 text-right">Término Prev.</th>
                <th className="py-2 text-center">Crítica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {visibleActs.map((a) => (
                <tr key={a.id} className={a.criticaForecast ? "bg-rose-950/15" : "hover:bg-slate-800/30"}>
                  <td className="py-1.5 pr-2 font-mono font-semibold text-sky-300">{a.id}</td>
                  <td className="max-w-xs truncate py-1.5 pr-2 text-slate-200">{a.nome}</td>
                  <td className="py-1.5 pr-2 text-right font-mono">{a.durLb} du</td>
                  <td className="py-1.5 pr-2 text-right font-mono text-slate-400">
                    {a.es}..{a.ef}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono">{a.folga}</td>
                  <td className="py-1.5 pr-2 text-right font-mono">
                    {a.situacao === "CONCLUIDA" ? (
                      <span className="text-emerald-400">100%</span>
                    ) : (
                      `${a.avancoPct}%`
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-white">
                    {a.forecastEs}..{a.forecastEf}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-slate-300">
                    {fmtDateBR(a.forecastEndDate)}
                  </td>
                  <td className="py-1.5 text-center">
                    {a.criticaForecast ? (
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                        CRÍTICA
                      </span>
                    ) : a.criticaLb ? (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                        LB
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* M4 Compressão passo a passo */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-2 text-sm font-semibold text-white">
            Compressão da Sub-rede M1 (−5 du ao menor custo · Folha M4)
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            Prazo inicial M1: {m4.prazoInicial} du. Custo do atraso: R$ 5.400/du (economia bruta de R$ 27.000 em 5 dias).
          </p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-1.5">Passo</th>
                <th className="py-1.5">Atividade</th>
                <th className="py-1.5 text-right">Custo/dia</th>
                <th className="py-1.5 text-right">Acumulado</th>
                <th className="py-1.5 text-right">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60" onMouseLeave={() => ligM4.setAtivo(null)}>
              {m4.steps.map((s, i) => (
                <tr key={s.passo} onMouseEnter={() => ligM4.setAtivo(i)} className={ligM4.ativo === i ? "linha-ativa" : ""}>
                  <td className="py-1.5 font-mono">#{s.passo}</td>
                  <td className="py-1.5 font-mono text-sky-300">{s.atividade}</td>
                  <td className="py-1.5 text-right font-mono">{fmtBRL0(s.custoDia)}</td>
                  <td className="py-1.5 text-right font-mono font-semibold text-white">{fmtBRL0(s.custoAcum)}</td>
                  <td className="py-1.5 text-right font-mono text-emerald-300">{s.novoPrazo} du</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-2 text-sm font-semibold text-white">Custo Acumulado de Compressão × Prazo</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m4.steps} {...ligM4.chartProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="novoPrazo" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                <Bar dataKey="custoAcum" name="Custo Acumulado (R$)" radius={[6, 6, 0, 0]}>
                  {m4.steps.map((s, i) => (
                    <Cell key={s.passo} fill={ligM4.ativo === i ? "#5eead4" : "#38bdf8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </div>
        </Detalhes>
      </div>
    </div>
  );
};
