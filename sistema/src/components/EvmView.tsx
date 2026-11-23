import React, { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildCalendarHelpers, computeEVM, fmtBRL, fmtBRL0, fmtDateBR, fmtNum, type AgileMetrics, type NetworkResult } from "../engine/calculations";
import type { ProjectDatabase } from "../types/project";
import { Detalhes, TabelaDoGrafico, useLigacaoGrafico } from "./ui";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  network: NetworkResult;
  agile: AgileMetrics;
}

export const EvmView: React.FC<Props> = ({ db, statusDate }) => {
  const [cutDate, setCutDate] = useState<string>(statusDate);
  const calH = buildCalendarHelpers(db["11_calendario"]);
  const agileAtCut = undefined;
  void agileAtCut;
  const evm = computeEVM(db, cutDate, calH, {
    ...({} as NetworkResult),
    activities: computeEvmActivities(db, calH),
  } as NetworkResult);

  function computeEvmActivities(d: ProjectDatabase, ch: ReturnType<typeof buildCalendarHelpers>) {
    const orcMap = new Map<string, number>();
    for (const r of d["09_orcamento_linha_de_base"]) {
      orcMap.set(r.id_atividade, (orcMap.get(r.id_atividade) ?? 0) + Number(r.valor_orcado_rs));
    }
    const preds = new Map<string, { pred: string; tipo: string; lag: number }[]>();
    const succs = new Map<string, { succ: string; tipo: string; lag: number }[]>();
    for (const dep of d["08_dependencias"]) {
      preds.set(dep.id_sucessora, [...(preds.get(dep.id_sucessora) ?? []), { pred: dep.id_predecessora, tipo: dep.tipo_dependencia, lag: Number(dep.defasagem_du) }]);
      succs.set(dep.id_predecessora, [...(succs.get(dep.id_predecessora) ?? []), { succ: dep.id_sucessora, tipo: dep.tipo_dependencia, lag: Number(dep.defasagem_du) }]);
    }
    const inDeg = new Map(d["07_atividades"].map((a) => [a.id_atividade, (preds.get(a.id_atividade) ?? []).length]));
    const q = d["07_atividades"].filter((a) => (inDeg.get(a.id_atividade) ?? 0) === 0).map((a) => a.id_atividade);
    const order: string[] = [];
    while (q.length) {
      const u = q.shift()!;
      order.push(u);
      for (const e of succs.get(u) ?? []) {
        const nd = (inDeg.get(e.succ) ?? 0) - 1;
        inDeg.set(e.succ, nd);
        if (nd === 0) q.push(e.succ);
      }
    }
    const actById = new Map(d["07_atividades"].map((a) => [a.id_atividade, a]));
    const es = new Map<string, number>();
    const ef = new Map<string, number>();
    const durMap = new Map<string, number>();
    for (const u of order) {
      const a = actById.get(u)!;
      const dur = a.tipo_atividade === "ESTIMADA"
        ? Math.ceil((Number(a.duracao_otimista_du) + 4 * Number(a.duracao_mais_provavel_du) + Number(a.duracao_pessimista_du)) / 6)
        : Number(a.duracao_fixa_du);
      durMap.set(u, dur);
      let s = 1;
      for (const e of preds.get(u) ?? []) {
        const cand = e.tipo === "TI" ? (ef.get(e.pred) ?? 0) + 1 + e.lag : (es.get(e.pred) ?? 1) + e.lag;
        if (cand > s) s = cand;
      }
      es.set(u, s);
      ef.set(u, s + dur - 1);
    }
    void ch;
    return order.map((u) => {
      const a = actById.get(u)!;
      return {
        id: u,
        nome: a.nome_atividade,
        codigoEap: a.codigo_eap,
        disciplina: a.disciplina,
        tipo: a.tipo_atividade,
        o: Number(a.duracao_otimista_du),
        m: Number(a.duracao_mais_provavel_du),
        p: Number(a.duracao_pessimista_du),
        durLb: durMap.get(u)!,
        sigma: 0,
        es: es.get(u)!,
        ef: ef.get(u)!,
        ls: es.get(u)!,
        lf: ef.get(u)!,
        folga: 0,
        criticaLb: false,
        avancoPct: 0,
        situacao: "",
        dataInicioReal: "",
        dataTerminoReal: "",
        forecastEs: es.get(u)!,
        forecastEf: ef.get(u)!,
        forecastLs: es.get(u)!,
        forecastLf: ef.get(u)!,
        forecastFolga: 0,
        criticaForecast: false,
        forecastStartDate: "",
        forecastEndDate: "",
        orcamento: orcMap.get(u) ?? 0,
      };
    });
  }

  const curva = useLigacaoGrafico(evm.curvaS, "label");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <h2 className="text-lg font-bold text-white">Custo e valor agregado</h2>
          <p className="text-xs text-slate-400">
            Compara o que foi planejado, o que foi entregue e o que foi gasto até a data escolhida.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { d: "2026-09-25", label: "25/09 (Folha M3)" },
            { d: "2026-10-30", label: "30/10 (Histórico)" },
            { d: "2026-11-13", label: "13/11 (Status)" },
          ].map((opt) => (
            <button
              key={opt.d}
              onClick={() => setCutDate(opt.d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                cutDate === opt.d
                  ? "bg-sky-500 text-white"
                  : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumo Frentes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { title: "Orçamento aprovado", val: fmtBRL0(evm.ontTotal), sub: "Soma das frentes preditiva e ágil" },
          { title: "Custo previsto no fim", val: fmtBRL0(evm.entTotal), sub: `${fmtBRL0(evm.entTotal - evm.ontTotal)} acima do orçamento` },
          { title: "Eficiência de custo (IDC)", val: fmtNum(evm.idcTotal, 2), sub: `Cada R$ 1 gasto entrega R$ ${fmtNum(evm.idcTotal, 2)}` },
          { title: "Eficiência de prazo (IDP)", val: fmtNum(evm.idpTotal, 2), sub: `Entregou ${fmtNum(evm.idpTotal * 100, 0)}% do planejado` },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-xs text-slate-400">{c.title}</div>
            <div className="mt-1 text-xl font-bold text-white">{c.val}</div>
            <div className="mt-1 text-xs text-slate-400">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Curva S */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Curva S do projeto (R$ mil)</h3>
        <p className="mb-3 text-xs text-slate-400">
          Custo real acima do valor entregue indica gasto maior que o previsto. Passe o mouse no gráfico ou na tabela.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-72 w-full lg:col-span-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evm.curvaS} {...curva.chartProps}>
              {curva.ativoX !== undefined && <ReferenceLine x={curva.ativoX} stroke="#5eead4" strokeDasharray="4 4" />}
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" }}
                formatter={(v: number) => [`R$ ${fmtNum(v, 1)} mil`, ""]}
              />
              <Legend />
              <Line type="monotone" dataKey="vp" name="VP (Planejado)" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="va" name="VA (Agregado)" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="cr" name="CR (Custo Real)" stroke="#fb7185" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2">
          <TabelaDoGrafico
            dados={evm.curvaS}
            ativo={curva.ativo}
            onAtivo={curva.setAtivo}
            alturaMax="max-h-72"
            colunas={[
              { titulo: "Data", valor: (r) => r.label },
              { titulo: "VP", valor: (r) => fmtNum(r.vp, 0), direita: true, cor: "text-sky-300" },
              { titulo: "VA", valor: (r) => fmtNum(r.va, 0), direita: true, cor: "text-emerald-300" },
              { titulo: "CR", valor: (r) => fmtNum(r.cr, 0), direita: true, cor: "text-rose-300" },
            ]}
          />
        </div>
        </div>
      </div>

      {/* Tabela por Entrega EAP + Frente Ágil (M3) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">Detalhamento por entrega</h3>
        <p className="text-xs text-slate-400">
          Valores por pacote da EAP e frente ágil em {fmtDateBR(cutDate)} (conferência com a folha M3). Gestão
          acompanhada à parte: {fmtBRL0(evm.crGestao)}.
        </p>
        <Detalhes titulo="Abrir tabela por entrega" className="mt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">EAP / Frente</th>
                <th className="py-2 pr-3 text-right">ONT</th>
                <th className="py-2 pr-3 text-right">VP</th>
                <th className="py-2 pr-3 text-right">VA</th>
                <th className="py-2 pr-3 text-right">CR</th>
                <th className="py-2 pr-3 text-right">VP − VA (VPr)</th>
                <th className="py-2 pr-3 text-right">VC (VA − CR)</th>
                <th className="py-2 pr-3 text-right">IDP</th>
                <th className="py-2 text-right">IDC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {evm.entregas.map((e) => (
                <tr key={e.codigo} className="hover:bg-slate-800/30">
                  <td className="py-2 pr-3 font-medium text-slate-200">
                    <span className="mr-1.5 font-mono text-sky-400">{e.codigo}</span>
                    {e.nome}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{fmtBRL(e.ont)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmtBRL(e.vp)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmtBRL(e.va)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmtBRL(e.cr)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-amber-300">{fmtBRL(e.va - e.vp)}</td>
                  <td className={`py-2 pr-3 text-right font-mono ${e.va - e.cr < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {fmtBRL(e.va - e.cr)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{fmtNum(e.idp, 3)}</td>
                  <td className="py-2 text-right font-mono">{fmtNum(e.idc, 3)}</td>
                </tr>
              ))}
              <tr className="bg-slate-800/40 font-semibold text-sky-200">
                <td className="py-2 pr-3">Subtotal Frente Preditiva</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.ontPred)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.vpPred)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.vaPred)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.crPred)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.vaPred - evm.vpPred)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.vaPred - evm.crPred)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtNum(evm.idpPred, 3)}</td>
                <td className="py-2 text-right font-mono">{fmtNum(evm.idcPred, 3)}</td>
              </tr>
              <tr className="bg-indigo-950/30 font-semibold text-indigo-200">
                <td className="py-2 pr-3">Frente Ágil (Todas as Sprints)</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.ontAgil)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.vpAgil)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.vaAgil)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.crAgil)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.vaAgil - evm.vpAgil)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtBRL(evm.vaAgil - evm.crAgil)}</td>
                <td className="py-2 pr-3 text-right font-mono">{fmtNum(evm.idpAgil, 3)}</td>
                <td className="py-2 text-right font-mono">{fmtNum(evm.idcAgil, 3)}</td>
              </tr>
              <tr className="bg-slate-950 font-bold text-white">
                <td className="py-2.5 pr-3">TOTAL DO PROJETO</td>
                <td className="py-2.5 pr-3 text-right font-mono">{fmtBRL(evm.ontTotal)}</td>
                <td className="py-2.5 pr-3 text-right font-mono">{fmtBRL(evm.vpTotal)}</td>
                <td className="py-2.5 pr-3 text-right font-mono">{fmtBRL(evm.vaTotal)}</td>
                <td className="py-2.5 pr-3 text-right font-mono">{fmtBRL(evm.crTotal)}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-amber-300">{fmtBRL(evm.vaTotal - evm.vpTotal)}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-rose-400">{fmtBRL(evm.vaTotal - evm.crTotal)}</td>
                <td className="py-2.5 pr-3 text-right font-mono">{fmtNum(evm.idpTotal, 3)}</td>
                <td className="py-2.5 text-right font-mono">{fmtNum(evm.idcTotal, 3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        </Detalhes>
      </div>
    </div>
  );
};
