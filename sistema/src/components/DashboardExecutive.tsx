import React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import {
  computeControlChecks,
  fmtBRL0,
  fmtDateBR,
  fmtNum,
  type AgileMetrics,
  type EVMSummary,
  type NetworkResult,
  type ScenarioSimulation,
} from "../engine/calculations";
import type { CsvRow, ProjectDatabase } from "../types/project";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  network: NetworkResult;
  evm: EVMSummary;
  agile: AgileMetrics;
  scenarios: ScenarioSimulation[];
  governance: {
    exposicaoTotalVme: number;
    reservaContingencia: number;
    mudancasAuditadas: { id_mudanca: string; conformeAlcada: boolean }[];
    pedidosDiretos: CsvRow[];
    bugsDePedidosDiretos: CsvRow[];
  };
  onNavigate: (tab: string) => void;
}

export const DashboardExecutive: React.FC<Props> = ({
  db,
  statusDate,
  network,
  evm,
  agile,
  scenarios,
  governance,
  onNavigate,
}) => {
  const controls = computeControlChecks(db);
  const is1311 = statusDate >= "2026-11-13";
  const c1 = scenarios.find((s) => s.idKey === "C1");
  const bestCombined = [...scenarios].sort((a, b) => b.resultadoLiquido - a.resultadoLiquido)[0];

  const violacoesAlcada = governance.mudancasAuditadas.filter((m) => !m.conformeAlcada).length;
  const ptsPedidosDiretos = governance.pedidosDiretos.reduce((a, p) => a + Number(p.pontos || 0), 0);

  const achados = [
    {
      id: "A1",
      titulo: "Atraso crítico na Rede e Release 2 (+32 dias úteis)",
      evidencia: `Término previsto em ${fmtDateBR(network.forecastEndDate)} vs contratual 22/01/2027 (${network.atrasoContratualDu} du). Caminho crítico: ${network.criticalPathForecast.join(" → ")}.`,
      causa: "Velocidade ágil média caiu para 16,0 pts/sprint (meta LB: 17,3), atrasando A41 (Release 2) e empurrando A35/A36/A39; somado ao atraso em A27 (piloto).",
      impacto: `${network.atrasoContratualDu} du = ${fmtBRL0(network.atrasoContratualDu * 5400)} de custo de atraso`,
      acao: "Adotar Cenário C2 (compressão + reforço ágil) combinado com C6 (operação em 2 ondas).",
      dono: "P01 Helena (GP) / PI01 Diretora de Operações",
    },
    {
      id: "A2",
      titulo: "Estouro de custo projetado (+33,5% acima do ONT)",
      evidencia: `ENT atual = ${fmtBRL0(evm.entTotal)} contra ONT = ${fmtBRL0(evm.ontTotal)} (IDC = ${fmtNum(evm.idcTotal, 2)}, CR = ${fmtBRL0(evm.crTotal)}, VA = ${fmtBRL0(evm.vaTotal)}).`,
      causa: "Retrabalho recorrente em IA (F04 VisionAI), hora extra operacional (ex.: P09 em out/26) e queda de produtividade/velocidade.",
      impacto: `+${fmtBRL0(evm.entTotal - evm.ontTotal)} sobre o orçamento aprovado`,
      acao: "Congelar novos escopos não aprovados, reforçar QA/Dev focado e revisar contratos T&M.",
      dono: "P01 Helena / PI03 Diretor Financeiro",
    },
    {
      id: "A3",
      titulo: "Scope Creep: 9 pedidos diretos fora do controle de mudanças",
      evidencia: `${governance.pedidosDiretos.length} itens (${ptsPedidosDiretos} pontos) entraram via PEDIDO_DIRETO de PI02 (Diretor Comercial) sem SM; item MS-222 gerou ${governance.bugsDePedidosDiretos.filter((b) => b.id_item_origem === "MS-222").length} defeitos.`,
      causa: "Product Owner e gerente anterior aceitaram demandas diretas sem fluxo formal de solicitação de mudança (SM).",
      impacto: `~${fmtBRL0(ptsPedidosDiretos * agile.custoRealPorPonto)} em esforço ágil desviado (${fmtBRL0(agile.custoRealPorPonto)}/pt)`,
      acao: "Bloquear entradas fora de SM no Jira e realinhar PI02 (atualmente RESISTENTE, satisfação 2,7).",
      dono: "P11 Sílvia (PO) / PI01 Patrocinadora",
    },
    {
      id: "A4",
      titulo: "Quebra da Matriz de Alçadas em 4 solicitações de mudança",
      evidencia: `${violacoesAlcada} mudanças (SM-002, SM-004, SM-005, SM-011) aprovadas pelo GERENTE alterando ESCOPO ou excedendo limites (R$ 15 mil / 5 du).`,
      causa: "Falta de gate de governança entre registro de mudança e aprovação formal na tabela 05.",
      impacto: "R$ 63.600 em mudanças aprovadas sem alçada válida",
      acao: "Submeter mudanças em aberto ao Comitê e exigir aprovação eletrônica vinculada à alçada.",
      dono: "P01 Helena / Comitê Diretor",
    },
    {
      id: "A5",
      titulo: "Fornecedor F04 (VisionAI) concentra falhas e riscos materializados",
      evidencia: "F04 acumula 6 reprovações em inspeções de A11/A12 e 2 ocorrências (OC-003 reajuste R$ 38,5 mil; OC-005 acurácia <85% R$ 66,8 mil e +16 du).",
      causa: "Contrato Tempo & Material sem SLA de acurácia mínima; proposta PR-01 de F04 aparece mais barata na nova licitação (tab. 32).",
      impacto: "R$ 105.300 em ocorrências + >R$ 37 mil em retrabalho de inspeções",
      acao: "Desclassificar ou penalizar F04 pelo histórico na contratação de monitoramento 24h (preferir F11 Vértice).",
      dono: "P04 Ramon / Compras",
    },
    {
      id: "A6",
      titulo: "Desbalanceamento severo de alocação e baixa produtividade técnica",
      evidencia: "P09 Heitor ficou ocioso de jun-set e explodiu em out/26 (204 h, 64 h extras). Na produtividade (tab. 41/42), A11 e A20 têm IP < 0,68 com IE ~0,90.",
      causa: "Gargalo não é falta de gente (IE ~0,90), mas baixo rendimento técnico (IP 0,64 em A11 e 0,69 em A20) e concentração tardia.",
      impacto: "Horas extras (+50% custo) e alongamento da duração restante",
      acao: "Nivelar alocação de operações e atuar na causa técnica de rendimento antes de ampliar equipe.",
      dono: "P02 Heitor (PMO) / P09 Heitor",
    },
  ];

  return (
    <div className="space-y-6">
      {/* As 3 respostas do Comitê Diretor */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#1e2b3a] border-t-2 border-t-amber-400/80 bg-[#101822] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              1. Quando termina?
            </span>
            <CalendarClock className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-bold text-white">
            {fmtDateBR(network.forecastEndDate)}
          </div>
          <p className="mt-1 text-sm text-slate-300">
            <strong className="text-amber-300">+{network.atrasoContratualDu} dias úteis</strong> além do término contratual (22/01/2027).
          </p>
          <div className="mt-3 rounded-lg border border-[#1e2b3a] bg-[#0a1017] px-3 py-2 text-xs text-slate-400">
            Caminho crítico atual:{" "}
            <span className="font-mono text-slate-200">
              {network.criticalPathForecast.join(" → ")}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e2b3a] border-t-2 border-t-rose-400/80 bg-[#101822] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              2. Quanto vai custar?
            </span>
            <CircleDollarSign className="h-5 w-5 text-rose-400" />
          </div>
          <div className="mt-2 text-3xl font-bold text-white">
            {fmtBRL0(evm.entTotal)}
          </div>
          <p className="mt-1 text-sm text-slate-300">
            Desvio de{" "}
            <strong className="text-rose-300">
              +{fmtBRL0(evm.entTotal - evm.ontTotal)}
            </strong>{" "}
            sobre o ONT ({fmtBRL0(evm.ontTotal)}). IDC ={" "}
            <strong className="text-rose-300">{fmtNum(evm.idcTotal, 2)}</strong>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-[#1e2b3a] bg-[#0a1017] px-2 py-1 text-slate-300">
              IDP: <strong className="text-amber-300">{fmtNum(evm.idpTotal, 2)}</strong>
            </span>
            <span className="rounded border border-[#1e2b3a] bg-[#0a1017] px-2 py-1 text-slate-300">
              Custo atraso C1: <strong className="text-rose-300">{fmtBRL0(c1?.custoAtraso ?? 0)}</strong>
            </span>
            <span className="rounded border border-[#1e2b3a] bg-[#0a1017] px-2 py-1 text-slate-300">
              Gestão à parte: <strong>{fmtBRL0(evm.crGestao)}</strong>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e2b3a] border-t-2 border-t-[#18a3a8] bg-[#101822] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              3. O que decidir agora?
            </span>
            <Compass className="h-5 w-5 text-[#2dd4bf]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {bestCombined ? `Cenário ${bestCombined.idKey}` : "Simular cenários"}
          </div>
          <p className="mt-1 text-sm text-slate-300">
            Maior resultado líquido (VPL − atraso):{" "}
            <strong className="text-[#5eead4]">
              {bestCombined ? fmtBRL0(bestCombined.resultadoLiquido) : "—"}
            </strong>
            , com término em{" "}
            <strong className="text-[#5eead4]">
              {bestCombined ? fmtDateBR(bestCombined.terminoPrevistoDate) : "—"}
            </strong>.
          </p>
          <button
            onClick={() => onNavigate("scenarios")}
            className="mt-3 w-full rounded-lg bg-[#12323a] px-3 py-2 text-xs font-semibold text-[#5eead4] transition hover:bg-[#17414b]"
          >
            Abrir Simulador Completo de Cenários →
          </button>
        </div>
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <TrendingDown className="h-4 w-4 text-sky-400" />
            Velocidade Média (5 últimas)
          </div>
          <div className="mt-1 text-xl font-bold text-white">
            {fmtNum(agile.velocidadeMedia, 1)} <span className="text-xs font-normal text-slate-400">pts/sprint</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            R2 em {fmtDateBR(agile.dataPrevistaR2)} ({agile.pontosRestantesR2} pts rest.)
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Exposição Riscos × Reserva
          </div>
          <div className="mt-1 text-xl font-bold text-white">
            {fmtBRL0(governance.exposicaoTotalVme)}
          </div>
          <div className="mt-1 text-xs text-emerald-400">
            Reserva contingência: {fmtBRL0(governance.reservaContingencia)} (cobre)
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            Escopo & Alçadas
          </div>
          <div className="mt-1 text-xl font-bold text-white">
            {governance.pedidosDiretos.length} diretos · {violacoesAlcada} alçada
          </div>
          <div className="mt-1 text-xs text-rose-300">
            {ptsPedidosDiretos} pts fora de SM ({fmtBRL0(agile.custoRealPorPonto)}/pt)
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-indigo-400" />
            Progresso Backlog
          </div>
          <div className="mt-1 text-xl font-bold text-white">
            {agile.itensConcluidosTotal}/{agile.itensTotaisBacklog}{" "}
            <span className="text-xs font-normal text-slate-400">itens</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {agile.pontosConcluidosTotal} pontos entregues
          </div>
        </div>
      </div>

      {/* Diagnóstico e Achados (Parte 3) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">
              Diagnóstico Gerencial — 6 Achados com Evidência Numérica
            </h2>
            <p className="text-xs text-slate-400">
              Base para o Relatório Gerencial e Apresentação ao Comitê Diretor (Parte 3)
            </p>
          </div>
          <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300">
            Data de status: {fmtDateBR(statusDate)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {achados.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  <span className="mr-2 rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-xs text-sky-300">
                    {a.id}
                  </span>
                  {a.titulo}
                </h3>
              </div>
              <p className="mt-2 text-xs text-slate-300">
                <strong className="text-slate-200">Evidência:</strong> {a.evidencia}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                <strong className="text-slate-300">Causa:</strong> {a.causa}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 text-xs">
                <span className="font-medium text-rose-300">Impacto: {a.impacto}</span>
                <span className="text-slate-400">Dono: {a.dono}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-300">
                <strong>Ação:</strong> {a.acao}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Conferência dos 13 Números de Controle do Dossiê */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">
              Auditoria dos 13 Números de Controle do Dossiê (Seção 3)
            </h2>
            <p className="text-xs text-slate-400">
              Conferência automática da base atual contra os totais oficiais de 30/10 (CSV tratado) e 13/11 (com Boletins B1–B9).
            </p>
          </div>
          <button
            onClick={() => onNavigate("entry")}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            Ir para Lançamento de Dados (R3)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Controle</th>
                <th className="py-2 pr-3 text-right">Atual no Sistema</th>
                <th className="py-2 pr-3 text-right">Meta 30/10</th>
                <th className="py-2 pr-3 text-right">Meta 13/11</th>
                <th className="py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {controls.map((c) => {
                const fmt = (v: number) =>
                  c.format === "brl" ? fmtBRL0(v) : c.format === "dec1" ? fmtNum(v, 1) : String(Math.round(v));
                const target = is1311 ? c.esperado1311 : c.esperado3010;
                const ok = Math.abs(c.obtido - target) < 0.05;
                const okOther = Math.abs(c.obtido - c.esperado1311) < 0.05 || Math.abs(c.obtido - c.esperado3010) < 0.05;
                return (
                  <tr key={c.label} className="hover:bg-slate-800/30">
                    <td className="py-1.5 pr-3 text-slate-200">{c.label}</td>
                    <td className="py-1.5 pr-3 text-right font-mono font-semibold text-white">
                      {c.format === "brl"
                        ? c.obtido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : fmt(c.obtido)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-slate-400">
                      {c.format === "brl"
                        ? c.esperado3010.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : fmt(c.esperado3010)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-slate-400">
                      {c.format === "brl"
                        ? c.esperado1311.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : fmt(c.esperado1311)}
                    </td>
                    <td className="py-1.5 text-center">
                      {ok ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          ✓ Bate exato
                        </span>
                      ) : okOther ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
                          ✓ Bate controle
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          Δ {fmtNum(c.obtido - target, 2)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
