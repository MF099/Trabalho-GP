import React, { useState } from "react";
import { AlertOctagon, Award, CheckCircle, ShieldAlert, Users } from "lucide-react";
import { fmtBRL0, fmtDateBR, fmtNum } from "../engine/calculations";
import { computeGovernanceAndProcurement } from "../engine/extraCalculations";
import type { ProjectDatabase } from "../types/project";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
}

export const GovernanceProcurementView: React.FC<Props> = ({ db, statusDate }) => {
  const [subTab, setSubTab] = useState<"RISKS" | "CONTRACTS" | "STAKEHOLDERS">("RISKS");
  const gov = computeGovernanceAndProcurement(db, statusDate);

  // Engajamento mais recente por parte interessada
  const latestEngMap = new Map<string, { mes: string; nivel: string; satisfacao: string }>();
  for (const e of [...db["34_engajamento_mensal"]].sort((a, b) => a.mes.localeCompare(b.mes))) {
    if (e.mes <= statusDate) {
      latestEngMap.set(e.id_parte, { mes: e.mes, nivel: e.nivel_engajamento, satisfacao: e.satisfacao });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "RISKS", label: "Riscos, Mudanças & Scope Creep (R7·R8)" },
          { id: "CONTRACTS", label: "Contratos, Multas & Licitação (R9)" },
          { id: "STAKEHOLDERS", label: "Partes Interessadas, OKRs & Funil (R10)" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as typeof subTab)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              subTab === t.id ? "bg-sky-500 text-white" : "border border-slate-800 bg-slate-900 text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "RISKS" && (
        <div className="space-y-6">
          {/* VME vs Reserva */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                Exposição VME (Ameaças Abertas)
              </div>
              <div className="mt-1 text-2xl font-bold text-white">{fmtBRL0(gov.exposicaoTotalVme)}</div>
              <div className="mt-1 text-xs text-slate-400">{gov.ameacasAbertas.length} ameaças abertas no registro</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Reserva de Contingência Disponível
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-300">{fmtBRL0(gov.reservaContingencia)}</div>
              <div className="mt-1 text-xs text-emerald-400">
                {gov.reservaContingencia >= gov.exposicaoTotalVme
                  ? `Cobre as ameaças abertas (saldo +${fmtBRL0(gov.reservaContingencia - gov.exposicaoTotalVme)})`
                  : "Insuficiente para o VME aberto"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <AlertOctagon className="h-4 w-4 text-rose-400" />
                Violações de Alçada & Pedidos Diretos
              </div>
              <div className="mt-1 text-2xl font-bold text-rose-300">
                {gov.mudancasAuditadas.filter((m) => !m.conformeAlcada).length} alçada · {gov.pedidosDiretos.length} diretos
              </div>
              <div className="mt-1 text-xs text-slate-400">4 SMs aprovadas acima da alçada do gerente</div>
            </div>
          </div>

          {/* Matriz 5x5 + Lista Riscos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">Matriz Probabilidade × Impacto (5 × 5 · M6)</h3>
              <div className="grid grid-cols-6 gap-1 text-center text-[11px]">
                <div />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="py-1 font-semibold text-slate-400">Imp {i}</div>
                ))}
                {[5, 4, 3, 2, 1].map((p) => (
                  <React.Fragment key={p}>
                    <div className="flex items-center justify-center font-semibold text-slate-400">P {p}</div>
                    {[1, 2, 3, 4, 5].map((i) => {
                      const items = gov.ameacasAbertas.filter((r) => r.pBin === p && r.iBin === i);
                      const score = p * i;
                      const bg =
                        score >= 15
                          ? "bg-rose-950/70 border-rose-500/40 text-rose-200"
                          : score >= 8
                          ? "bg-amber-950/60 border-amber-500/30 text-amber-200"
                          : "bg-emerald-950/40 border-emerald-500/20 text-emerald-200";
                      return (
                        <div key={`${p}-${i}`} className={`min-h-12 rounded border p-1 ${bg}`}>
                          {items.map((r) => (
                            <span key={r.id_risco} className="m-0.5 inline-block rounded bg-slate-950/80 px-1 font-mono text-[10px]">
                              {r.id_risco}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">Registro de Riscos & VME</h3>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400">
                    <tr className="border-b border-slate-800">
                      <th className="py-1.5">ID</th>
                      <th className="py-1.5">Descrição</th>
                      <th className="py-1.5 text-right">Prob</th>
                      <th className="py-1.5 text-right">Impacto</th>
                      <th className="py-1.5 text-right">VME</th>
                      <th className="py-1.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {gov.riscos.map((r) => (
                      <tr key={r.id_risco}>
                        <td className="py-1.5 font-mono text-sky-300">{r.id_risco}</td>
                        <td className="max-w-[200px] truncate py-1.5 text-slate-200">{r.descricao}</td>
                        <td className="py-1.5 text-right font-mono">{r.prob}%</td>
                        <td className="py-1.5 text-right font-mono">{fmtBRL0(r.impCusto)}</td>
                        <td className="py-1.5 text-right font-mono font-semibold text-amber-300">{fmtBRL0(r.vme)}</td>
                        <td className="py-1.5 text-center">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                            r.status === "ABERTO" ? "bg-amber-500/20 text-amber-300" : r.status === "OCORRIDO" ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-400"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Auditoria de Mudanças e Scope Creep */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="mb-2 text-sm font-semibold text-white">Auditoria de Solicitações de Mudança × Matriz de Alçadas</h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400">
                    <tr className="border-b border-slate-800">
                      <th className="py-1.5">SM</th>
                      <th className="py-1.5">Tipo</th>
                      <th className="py-1.5">Decisor</th>
                      <th className="py-1.5 text-right">Custo</th>
                      <th className="py-1.5 text-right">Prazo</th>
                      <th className="py-1.5">Alçada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {gov.mudancasAuditadas.map((m) => (
                      <tr key={m.id_mudanca} className={!m.conformeAlcada ? "bg-rose-950/20" : ""}>
                        <td className="py-1.5 font-mono text-sky-300">{m.id_mudanca}</td>
                        <td className="py-1.5">{m.tipo_mudanca}</td>
                        <td className="py-1.5">{m.nivel_decisor} ({m.status})</td>
                        <td className="py-1.5 text-right font-mono">{fmtBRL0(Number(m.impacto_custo_rs))}</td>
                        <td className="py-1.5 text-right font-mono">{m.impacto_prazo_du} du</td>
                        <td className="py-1.5">
                          {m.conformeAlcada ? (
                            <span className="text-emerald-400">OK</span>
                          ) : (
                            <span className="font-semibold text-rose-300">{m.violacoes.join("; ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="mb-2 text-sm font-semibold text-white">
                Escopo Sem Controle de Mudanças (PEDIDO_DIRETO = {gov.pedidosDiretos.length} itens)
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400">
                    <tr className="border-b border-slate-800">
                      <th className="py-1.5">Item</th>
                      <th className="py-1.5">Solicitante</th>
                      <th className="py-1.5">Rel.</th>
                      <th className="py-1.5 text-right">Pts</th>
                      <th className="py-1.5">Título</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {gov.pedidosDiretos.map((p) => (
                      <tr key={p.id_item}>
                        <td className="py-1.5 font-mono text-amber-300">{p.id_item}</td>
                        <td className="py-1.5 font-mono">{p.id_solicitante}</td>
                        <td className="py-1.5">{p.id_release}</td>
                        <td className="py-1.5 text-right font-mono">{p.pontos}</td>
                        <td className="py-1.5 text-slate-200">{p.titulo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === "CONTRACTS" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Contratos, Medições, Retrabalho e Multas (Convenção 14)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-2">Contrato</th>
                    <th className="py-2 pr-2">Fornecedor</th>
                    <th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2 text-right">Contratado</th>
                    <th className="py-2 pr-2 text-right">Pago</th>
                    <th className="py-2 pr-2 text-right">Atraso</th>
                    <th className="py-2 pr-2 text-right">Multa Est.</th>
                    <th className="py-2 text-right">Reprov. / Retrabalho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {gov.contratos.map((c) => (
                    <tr key={c.id_contrato} className={c.reprovacoes > 0 ? "bg-rose-950/15" : ""}>
                      <td className="py-2 pr-2 font-mono text-sky-300">{c.id_contrato}</td>
                      <td className="py-2 pr-2 text-slate-200">{c.fornecedorNome}</td>
                      <td className="py-2 pr-2 font-mono text-[11px]">{c.tipo_contrato}</td>
                      <td className="py-2 pr-2 text-right font-mono">{fmtBRL0(c.valorContratado)}</td>
                      <td className="py-2 pr-2 text-right font-mono">{fmtBRL0(c.valorPago)}</td>
                      <td className="py-2 pr-2 text-right font-mono">{c.diasAtraso} d</td>
                      <td className="py-2 pr-2 text-right font-mono text-amber-300">{fmtBRL0(c.multaEstimadaRs)}</td>
                      <td className="py-2 text-right font-mono text-rose-300">
                        {c.reprovacoes} reprov. · {fmtBRL0(c.retrabalhoRs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-sky-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Seleção de Fornecedor em Aberto — Monitoramento 24h (Tabela 32 · Convenção 15)
                </h3>
                <p className="text-xs text-slate-400">
                  Pesos: Preço 35% · Técnica 30% · Prazo 15% · Experiência 10% · Garantia 10%.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">Proposta</th>
                    <th className="py-2">Fornecedor</th>
                    <th className="py-2 text-right">Preço</th>
                    <th className="py-2 text-right">Prazo</th>
                    <th className="py-2 text-right">Técnica</th>
                    <th className="py-2 text-right">Exp / Gar</th>
                    <th className="py-2 text-right">Nota Ponderada</th>
                    <th className="py-2">Alerta Histórico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {gov.propostasAvaliadas.map((p, idx) => (
                    <tr key={p.id_proposta} className={idx === 0 && !p.alertaHistorico ? "bg-emerald-950/20" : p.alertaHistorico ? "bg-rose-950/20" : ""}>
                      <td className="py-2 font-mono text-sky-300">{p.id_proposta}</td>
                      <td className="py-2 font-medium text-white">{p.fornecedorNome} ({p.id_fornecedor})</td>
                      <td className="py-2 text-right font-mono">{fmtBRL0(Number(p.preco_rs))}</td>
                      <td className="py-2 text-right font-mono">{p.prazo_du} du</td>
                      <td className="py-2 text-right font-mono">{p.nota_tecnica}</td>
                      <td className="py-2 text-right font-mono">{p.projetos_similares} / {p.garantia_meses}m</td>
                      <td className="py-2 text-right font-mono text-sm font-bold text-emerald-300">
                        {fmtNum(p.notaFinal * 10, 2)} / 10
                      </td>
                      <td className="py-2">
                        {p.alertaHistorico ? (
                          <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                            ⚠ {p.historicoReprov} reprovações + {p.historicoOcorr} ocorrências
                          </span>
                        ) : (
                          <span className="text-emerald-400">Sem ocorrências negativas</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === "STAKEHOLDERS" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Partes Interessadas (Poder × Interesse + Engajamento Atual)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">ID</th>
                    <th className="py-2">Parte Interessada</th>
                    <th className="py-2 text-center">Poder × Int.</th>
                    <th className="py-2">Quadrante</th>
                    <th className="py-2">Inicial → Desejado</th>
                    <th className="py-2">Atual ({fmtDateBR(statusDate)})</th>
                    <th className="py-2 text-right">Satisfação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {db["03_partes_interessadas"].map((pi) => {
                    const poder = Number(pi.poder);
                    const int = Number(pi.interesse);
                    const quad =
                      poder >= 4 && int >= 4
                        ? "Gerenciar de perto"
                        : poder >= 4
                        ? "Manter satisfeito"
                        : int >= 4
                        ? "Manter informado"
                        : "Monitorar";
                    const eng = latestEngMap.get(pi.id_parte);
                    return (
                      <tr key={pi.id_parte} className={eng?.nivel === "RESISTENTE" ? "bg-rose-950/20" : ""}>
                        <td className="py-1.5 font-mono text-sky-300">{pi.id_parte}</td>
                        <td className="py-1.5 text-slate-200">{pi.parte_interessada}</td>
                        <td className="py-1.5 text-center font-mono">{poder} × {int}</td>
                        <td className="py-1.5 text-slate-300">{quad}</td>
                        <td className="py-1.5 font-mono text-[11px]">{pi.engajamento_inicial} → {pi.engajamento_desejado}</td>
                        <td className="py-1.5 font-mono font-semibold text-amber-300">{eng?.nivel ?? "—"}</td>
                        <td className="py-1.5 text-right font-mono">{eng?.satisfacao ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Funil semanal do piloto */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="mb-2 text-sm font-semibold text-white">Funil Semanal do Piloto (Tabela 37)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1.5">Semana</th>
                    <th className="py-1.5 text-right">Alcance</th>
                    <th className="py-1.5 text-right">Cadastros</th>
                    <th className="py-1.5 text-right">Ativados</th>
                    <th className="py-1.5 text-right">Ativos Sem.</th>
                    <th className="py-1.5 text-right">Retidos 4s</th>
                    <th className="py-1.5 text-right">NPS</th>
                    <th className="py-1.5 text-right">Chamados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {db["37_funil_piloto_semanal"].map((f) => (
                    <tr key={f.semana_inicio}>
                      <td className="py-1.5 font-mono">{fmtDateBR(f.semana_inicio)}</td>
                      <td className="py-1.5 text-right font-mono">{f.alcance}</td>
                      <td className="py-1.5 text-right font-mono">{f.cadastros}</td>
                      <td className="py-1.5 text-right font-mono">{f.ativados}</td>
                      <td className="py-1.5 text-right font-mono text-sky-300">{f.ativos_na_semana}</td>
                      <td className="py-1.5 text-right font-mono">{f.retidos_4_semanas}</td>
                      <td className="py-1.5 text-right font-mono text-emerald-300">{f.nps}</td>
                      <td className="py-1.5 text-right font-mono">{f.chamados_suporte}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
