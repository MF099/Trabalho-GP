import React, { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtBRL, fmtBRL0, fmtNum } from "../engine/calculations";
import { computePeopleAndProductivity } from "../engine/extraCalculations";
import type { ProjectDatabase } from "../types/project";
import type { CalendarHelpers } from "../engine/calculations";
import { Detalhes, TabelaDoGrafico, useLigacaoGrafico } from "./ui";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  forecastEndDate: string;
  calH: CalendarHelpers;
}

export const PeopleProductivityView: React.FC<Props> = ({ db, statusDate, forecastEndDate, calH }) => {
  const res = computePeopleAndProductivity(db, statusDate, forecastEndDate, calH);
  const [selectedPerson, setSelectedPerson] = useState<string>("P09");
  const personObj = res.people.find((p) => p.id === selectedPerson) ?? res.people[0];
  const mesesPessoa = personObj?.meses ?? [];
  const lig = useLigacaoGrafico(mesesPessoa, "mes");

  return (
    <div className="space-y-6">
      {/* KPIs Pessoas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Folha mensal da equipe</div>
          <div className="mt-1 text-2xl font-bold text-white">{fmtBRL0(res.folhaMensalTotal)}</div>
          <div className="mt-1 text-xs text-slate-400">Salários, encargos e benefícios de {res.people.length} pessoas</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Custo extra do reajuste salarial</div>
          <div className="mt-1 text-2xl font-bold text-amber-300">{fmtBRL0(res.impactoReajusteTotal)}</div>
          <div className="mt-1 text-xs text-slate-400">Até o término previsto</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Diagnóstico dos fornecedores</div>
          <div className="mt-1 text-base font-bold text-rose-300">Falta rendimento, não gente</div>
          <div className="mt-1 text-xs text-slate-400">Equipes completas, mas produzindo abaixo do previsto</div>
        </div>
      </div>

      {/* Histograma Planejado x Apontado */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Horas planejadas × horas trabalhadas</h3>
            <p className="text-xs text-slate-400">
              {personObj?.id} {personObj?.nome} ({personObj?.papel} · {personObj?.frente})
            </p>
          </div>
          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
          >
            {res.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} — {p.nome} ({p.frente})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-64 w-full lg:col-span-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mesesPessoa} {...lig.chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              {lig.ativoX !== undefined && <ReferenceLine x={lig.ativoX} stroke="#5eead4" strokeDasharray="4 4" />}
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
              <Legend />
              <Bar dataKey="planejado" name="Horas Planejadas" fill="#475569" radius={[4, 4, 0, 0]} />
              <Bar dataKey="apontado" name="Horas Apontadas" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2">
          <TabelaDoGrafico
            dados={mesesPessoa}
            ativo={lig.ativo}
            onAtivo={lig.setAtivo}
            alturaMax="max-h-64"
            colunas={[
              { titulo: "Mês", valor: (r) => r.mes },
              { titulo: "Planejado", valor: (r) => fmtNum(r.planejado, 0), direita: true, cor: "text-slate-400" },
              { titulo: "Trabalhado", valor: (r) => fmtNum(r.apontado, 0), direita: true, cor: "text-sky-300" },
              {
                titulo: "Desvio",
                valor: (r) => `${r.desvioPct > 0 ? "+" : ""}${fmtNum(r.desvioPct, 0)}%`,
                direita: true,
                cor: "text-amber-300",
              },
            ]}
          />
        </div>
        </div>
      </div>

      {/* Produtividade Fornecedores (41 & 42) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Produtividade dos fornecedores</h3>
        <p className="text-xs text-slate-400">IP abaixo de 0,85 significa que a equipe rende menos que o previsto.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2">Ativ.</th>
                <th className="py-2">Fornecedor</th>
                <th className="py-2 text-right">Exec. / Total</th>
                <th className="py-2 text-right">Hh</th>
                <th className="py-2 text-right">Prod. Plan → Real</th>
                <th className="py-2 text-right">IP</th>
                <th className="py-2 text-right">Efet. Plan → Real</th>
                <th className="py-2 text-right">IE</th>
                <th className="py-2">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {res.supplierProductivity.map((s) => (
                <tr key={s.idAtividade}>
                  <td className="py-2 font-mono text-sky-300">{s.idAtividade}</td>
                  <td className="py-2 text-slate-200">{s.fornecedor}</td>
                  <td className="py-2 text-right font-mono">{fmtNum(s.qtdExec, 1)} / {fmtNum(s.qtdTotal, 1)} {s.unidade}</td>
                  <td className="py-2 text-right font-mono">{Math.round(s.hhTot)} h</td>
                  <td className="py-2 text-right font-mono">{fmtNum(s.prodPlan, 3)} → {fmtNum(s.prodReal, 3)}</td>
                  <td className={`py-2 text-right font-mono font-bold ${s.ip < 0.85 ? "text-rose-400" : "text-emerald-400"}`}>
                    {fmtNum(s.ip, 2)}
                  </td>
                  <td className="py-2 text-right font-mono">{s.eqPlan} → {fmtNum(s.efetivoMedio, 1)}</td>
                  <td className="py-2 text-right font-mono">{fmtNum(s.ie, 2)}</td>
                  <td className="py-2 text-amber-300">{s.diagnostico}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela completa da Equipe (R14 + R15 Ágil) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Custo por pessoa</h3>
        <p className="text-xs text-slate-400">Custo/hora, horas no projeto, reajuste e produtividade ágil (folha M8).</p>
        <Detalhes titulo="Abrir tabela da equipe" className="mt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2">ID</th>
                <th className="py-2">Nome / Papel</th>
                <th className="py-2">Frente</th>
                <th className="py-2 text-right">Custo Mensal</th>
                <th className="py-2 text-right">R$/h</th>
                <th className="py-2 text-right">Horas (Norm+Ext)</th>
                <th className="py-2 text-right">Custo Proj.</th>
                <th className="py-2 text-right">Reajuste Est.</th>
                <th className="py-2 text-right">Pts / h · R$/pt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {res.people.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="py-1.5 font-mono text-sky-300">{p.id}</td>
                  <td className="py-1.5">
                    <div className="font-medium text-white">{p.nome}</div>
                    <div className="text-[11px] text-slate-400">{p.papel} ({p.vinculo})</div>
                  </td>
                  <td className="py-1.5 font-mono text-[11px]">{p.frente}</td>
                  <td className="py-1.5 text-right font-mono">{fmtBRL(p.custoMensal)}</td>
                  <td className="py-1.5 text-right font-mono">R$ {p.custoHora}</td>
                  <td className="py-1.5 text-right font-mono">
                    {fmtNum(p.horasNormais, 1)} + <span className="text-amber-300">{fmtNum(p.horasExtras, 1)}</span>
                  </td>
                  <td className="py-1.5 text-right font-mono text-white">{fmtBRL0(p.custoTotalProjeto)}</td>
                  <td className="py-1.5 text-right font-mono text-amber-300">{fmtBRL0(p.impactoReajusteRs)}</td>
                  <td className="py-1.5 text-right font-mono text-indigo-300">
                    {p.pontosPorHora !== null ? `${fmtNum(p.pontosPorHora, 3)} pts/h · ${fmtBRL0(p.custoPorPonto ?? 0)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </Detalhes>
      </div>
    </div>
  );
};
