import React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  FileSpreadsheet,
  GitBranch,
  Smartphone,
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
import { Detalhes } from "./ui";

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

/** "R$ 3,97 mi" — leitura rápida para o comitê. */
const fmtMi = (v: number) => `R$ ${fmtNum(v / 1_000_000, 2)} mi`;

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
  const bestCombined = [...scenarios].sort((a, b) => b.resultadoLiquido - a.resultadoLiquido)[0];
  const nomeCenario = (s?: ScenarioSimulation) =>
    s
      ? s.scenarioIds
          .map((id) => db["43_cenarios"].find((c) => c.id_cenario === id)?.nome_cenario ?? id)
          .join(" + ")
      : "";

  const mudancasForaAlcada = governance.mudancasAuditadas.filter((m) => !m.conformeAlcada);
  const violacoesAlcada = mudancasForaAlcada.length;
  const ptsPedidosDiretos = governance.pedidosDiretos.reduce((a, p) => a + Number(p.pontos || 0), 0);
  const desvioCusto = evm.entTotal - evm.ontTotal;
  const desvioPct = evm.ontTotal > 0 ? (desvioCusto / evm.ontTotal) * 100 : 0;
  const reservaCobre = governance.reservaContingencia >= governance.exposicaoTotalVme;

  // ---- Duas trilhas: preditiva (EAP/ProjectLibre) e ágil (backlog/Jira) ----
  const actById = new Map(network.activities.map((a) => [a.id, a]));
  const atividadesPred = network.activities.filter((a) => a.tipo === "ESTIMADA");
  const predConcluidas = atividadesPred.filter((a) => a.situacao === "CONCLUIDA").length;
  const pct = (v: number, t: number) => (t > 0 ? (v / t) * 100 : 0);
  const pontosTotais = agile.pontosConcluidosTotal + agile.pontosRestantesR3;
  const trilhas = [
    {
      nome: "Frente preditiva",
      ferramenta: "EAP · ProjectLibre",
      descricao: "Regulatório, parcerias, equipamentos, conteúdo, piloto e lançamento",
      entregue: pct(evm.vaPred, evm.ontPred),
      detalhe: `${predConcluidas} de ${atividadesPred.length} atividades concluídas`,
      idc: evm.idcPred,
      idp: evm.idpPred,
      orcamento: evm.ontPred,
    },
    {
      nome: "Frente ágil",
      ferramenta: "Backlog · Jira",
      descricao: "Aplicativo: 8 épicos entregues em 3 releases",
      entregue: pct(evm.vaAgil, evm.ontAgil),
      detalhe: `${agile.pontosConcluidosTotal} de ${pontosTotais} pontos concluídos`,
      idc: evm.idcAgil,
      idp: evm.idpAgil,
      orcamento: evm.ontAgil,
    },
  ];
  const interfaces = [
    { marco: "A40", release: "Release 1 (MVP)", libera: "Piloto com 40 oficinas (A27)" },
    { marco: "A41", release: "Release 2", libera: "Testes finais → entrada em operação (A32 → A35)" },
    { marco: "A42", release: "Release 3", libera: "Encerramento do projeto (A39)" },
  ].map((i) => {
    const a = actById.get(i.marco);
    const status = !a
      ? "—"
      : a.situacao === "CONCLUIDA"
      ? "Entregue"
      : a.criticaForecast
      ? "No caminho crítico"
      : `Folga de ${a.forecastFolga} du`;
    return { ...i, data: a ? fmtDateBR(a.forecastEndDate) : "—", status };
  });
  const releaseCritica = interfaces.find((i) => i.status === "No caminho crítico");

  const controlesOk = controls.filter((c) => {
    const target = is1311 ? c.esperado1311 : c.esperado3010;
    return Math.abs(c.obtido - target) < 0.05;
  }).length;

  const achados = [
    {
      id: "A1",
      titulo: `Projeto termina ${network.atrasoContratualDu} dias úteis depois do contrato`,
      evidencia: `Término previsto em ${fmtDateBR(network.forecastEndDate)} vs contratual 22/01/2027. Caminho crítico: ${network.criticalPathForecast.join(" → ")}.`,
      causa: releaseCritica
        ? `As duas trilhas se encontram no caminho crítico: a ${releaseCritica.release} (frente ágil, prevista para ${releaseCritica.data}) segura a cadeia preditiva — ${releaseCritica.libera} — até o encerramento. A velocidade média de ${fmtNum(agile.velocidadeMedia, 1)} pts/sprint (meta 17,3) é a origem do atraso.`
        : `Velocidade ágil média de ${fmtNum(agile.velocidadeMedia, 1)} pts/sprint (meta LB: 17,3) e atrasos na cadeia preditiva até o encerramento.`,
      impacto: `${fmtBRL0(network.atrasoContratualDu * 5400)} de custo de atraso`,
      acao: "Comitê decidir o cenário de recuperação (ver Cenários).",
      dono: "P01 Helena (GP) / PI01 Diretora de Operações",
    },
    {
      id: "A2",
      titulo: `Custo final previsto ${fmtNum(desvioPct, 1)}% acima do orçamento`,
      evidencia: `ENT = ${fmtBRL0(evm.entTotal)} contra ONT = ${fmtBRL0(evm.ontTotal)} (IDC = ${fmtNum(evm.idcTotal, 2)}, CR = ${fmtBRL0(evm.crTotal)}, VA = ${fmtBRL0(evm.vaTotal)}).`,
      causa: "Retrabalho com o fornecedor de IA (F04 VisionAI), horas extras e queda de velocidade.",
      impacto: `+${fmtBRL0(desvioCusto)} sobre o orçamento aprovado`,
      acao: "Congelar escopo não aprovado e revisar contratos por tempo e material.",
      dono: "P01 Helena / PI03 Diretor Financeiro",
    },
    {
      id: "A3",
      titulo: `${governance.pedidosDiretos.length} pedidos entraram sem controle de mudança`,
      evidencia: `${governance.pedidosDiretos.length} itens (${ptsPedidosDiretos} pontos) entraram como PEDIDO_DIRETO do Diretor Comercial (PI02) sem SM; o item MS-222 gerou ${governance.bugsDePedidosDiretos.filter((b) => b.id_item_origem === "MS-222").length} defeitos.`,
      causa: "PO e gerente anterior aceitaram demandas diretas sem solicitação de mudança.",
      impacto: `~${fmtBRL0(ptsPedidosDiretos * agile.custoRealPorPonto)} de esforço desviado`,
      acao: "Bloquear entradas fora de SM e realinhar o Diretor Comercial.",
      dono: "P11 Sílvia (PO) / PI01 Patrocinadora",
    },
    {
      id: "A4",
      titulo: `${violacoesAlcada} mudanças aprovadas sem a alçada correta`,
      evidencia: `${mudancasForaAlcada.map((m) => m.id_mudanca).join(", ")} aprovadas pelo GERENTE alterando escopo ou acima dos limites (R$ 15 mil / 5 du).`,
      causa: "Não há bloqueio entre registrar a mudança e aprová-la conforme a tabela 05.",
      impacto: "R$ 63.600 em mudanças sem aprovação válida",
      acao: "Levar as mudanças ao Comitê e vincular aprovação à alçada.",
      dono: "P01 Helena / Comitê Diretor",
    },
    {
      id: "A5",
      titulo: "Fornecedor de IA (F04 VisionAI) concentra falhas",
      evidencia: "6 reprovações em inspeções de A11/A12 e 2 ocorrências (OC-003 reajuste R$ 38,5 mil; OC-005 acurácia <85% R$ 66,8 mil e +16 du).",
      causa: "Contrato por tempo e material sem exigência mínima de acurácia.",
      impacto: "R$ 105.300 em ocorrências + R$ 37 mil em retrabalho",
      acao: "Não contratar F04 no monitoramento 24h (preferir F11 Vértice).",
      dono: "P04 Ramon / Compras",
    },
    {
      id: "A6",
      titulo: "Gargalo é rendimento da equipe, não falta de gente",
      evidencia: "P09 ocioso de jun a set e com 204 h (64 h extras) em out/26. A11 e A20 com IP < 0,70 e IE ~0,90 (tab. 41/42).",
      causa: "Baixo rendimento técnico e trabalho concentrado no fim.",
      impacto: "Horas extras (+50% de custo) e prazo restante maior",
      acao: "Nivelar a alocação e atacar a causa técnica antes de contratar.",
      dono: "P02 Heitor (PMO) / P09 Heitor",
    },
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="project-summary" className="mare-summary rounded-3xl border border-sky-500/30 p-4 sm:p-6">
        <h2 id="project-summary" className="mb-5 text-2xl font-semibold tracking-tight text-white">Visão do projeto</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/12 bg-slate-950/50 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                Quando termina?
              </span>
              <CalendarClock className="h-5 w-5 text-amber-400" />
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-white">{fmtDateBR(network.forecastEndDate)}</div>
            <p className="mt-1 text-sm text-slate-300">
              <strong className="text-amber-300">{network.atrasoContratualDu} dias úteis</strong> depois do prazo do
              contrato (22/01/2027).
            </p>
          </div>

          <div className="rounded-xl border border-white/12 bg-slate-950/50 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                Quanto vai custar?
              </span>
              <CircleDollarSign className="h-5 w-5 text-rose-400" />
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-white">{fmtMi(evm.entTotal)}</div>
            <p className="mt-1 text-sm text-slate-300">
              <strong className="text-rose-300">{fmtNum(desvioPct, 0)}% acima</strong> do orçamento aprovado (
              {fmtMi(evm.ontTotal)}).
            </p>
          </div>

          <div className="rounded-xl border border-white/12 bg-slate-950/50 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                O que decidir agora?
              </span>
              <Compass className="h-5 w-5 text-[#2dd4bf]" />
            </div>
            <div className="mt-3 text-xl font-semibold tracking-tight text-white">
              {bestCombined ? `${bestCombined.idKey} · ${nomeCenario(bestCombined)}` : "Simular cenários"}
            </div>
            <p className="mt-1 text-sm text-slate-300">
              Cenário com melhor saldo entre retorno financeiro e custo do atraso.
            </p>
            <button
              onClick={() => onNavigate("scenarios")}
              className="mt-4 rounded-lg bg-sky-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-sky-400"
            >
              Comparar cenários →
            </button>
          </div>
        </div>
      </section>

      {/* Duas trilhas: o término depende das duas juntas */}
      <section aria-labelledby="duas-trilhas" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 id="duas-trilhas" className="text-lg font-bold text-white">Duas trilhas, um projeto</h2>
        <p className="text-xs text-slate-400">
          A ágil é a frente maior; a preditiva é menor, mas as releases são marcos da rede dela — o término depende das duas.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {trilhas.map((t) => (
            <div key={t.nome} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">{t.nome}</div>
                  <div className="text-[11px] text-slate-400">{t.descricao}</div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                  {t.ferramenta}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums text-white">{fmtNum(t.entregue, 0)}%</span>
                <span className="text-xs text-slate-400">do valor entregue · orçamento {fmtMi(t.orcamento)}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, t.entregue)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                <span>{t.detalhe}</span>
                <span>
                  IDC <strong className={t.idc < 0.9 ? "text-rose-300" : "text-emerald-300"}>{fmtNum(t.idc, 2)}</strong>
                </span>
                <span>
                  IDP <strong className={t.idp < 0.9 ? "text-amber-300" : "text-emerald-300"}>{fmtNum(t.idp, 2)}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-5 text-sm font-semibold text-white">Onde as trilhas se encontram</h3>
        <p className="text-xs text-slate-400">Cada release do aplicativo libera uma etapa da frente preditiva.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {interfaces.map((i) => (
            <div
              key={i.marco}
              className={`rounded-xl border p-3 text-xs ${
                i.status === "No caminho crítico"
                  ? "border-rose-500/50 bg-rose-950/20"
                  : i.status === "Entregue"
                  ? "border-emerald-500/30 bg-emerald-950/15"
                  : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  {i.release} <span className="font-mono text-slate-400">({i.marco})</span>
                </span>
                <span className="font-mono text-slate-300">{i.data}</span>
              </div>
              <div className="mt-1 text-slate-300">→ {i.libera}</div>
              <div
                className={`mt-2 font-semibold ${
                  i.status === "No caminho crítico" ? "text-rose-300" : i.status === "Entregue" ? "text-emerald-300" : "text-slate-400"
                }`}
              >
                {i.status}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="quick-access">
        <h2 id="quick-access" className="mb-3 text-lg font-semibold text-white">Acesso rápido</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { id: "entry", label: "Registrar lançamentos", icon: FileSpreadsheet },
            { id: "network", label: "Consultar cronograma", icon: GitBranch },
            { id: "mockups", label: "Explorar protótipo", icon: Smartphone },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onNavigate(id)} className="group flex min-h-14 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:bg-sky-950">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="flex-1">{label}</span>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 group-hover:text-sky-300" />
            </button>
          ))}
        </div>
      </section>

      {/* Indicadores de apoio */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <TrendingDown className="h-4 w-4 text-sky-400" />
            Ritmo da equipe ágil
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-white">
            {fmtNum(agile.velocidadeMedia, 1)} <span className="text-xs font-normal text-slate-400">pts/sprint</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Meta: 17,3 pts/sprint</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Riscos em aberto
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-white">{fmtBRL0(governance.exposicaoTotalVme)}</div>
          <div className={`mt-1 text-xs ${reservaCobre ? "text-emerald-400" : "text-rose-300"}`}>
            {reservaCobre ? "Reserva de contingência cobre" : "Reserva de contingência não cobre"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            Falhas de governança
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-white">{governance.pedidosDiretos.length + violacoesAlcada}</div>
          <div className="mt-1 text-xs text-slate-400">Pedidos e mudanças fora do fluxo</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-indigo-400" />
            Backlog entregue
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-white">
            {agile.itensTotaisBacklog > 0
              ? `${fmtNum((agile.itensConcluidosTotal / agile.itensTotaisBacklog) * 100, 0)}%`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {agile.itensConcluidosTotal} de {agile.itensTotaisBacklog} itens
          </div>
        </div>
      </div>

      {/* Diagnóstico e Achados (Parte 3) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">Principais achados</h2>
            <p className="text-xs text-slate-400">O que está errado, quanto custa e o que fazer.</p>
          </div>
          <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300">
            Data de status: {fmtDateBR(statusDate)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {achados.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-white">
                <span className="mr-2 rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-xs text-sky-300">{a.id}</span>
                {a.titulo}
              </h3>
              <p className="mt-2 text-xs font-medium text-rose-300">Impacto: {a.impacto}</p>
              <p className="mt-1 text-xs text-emerald-300">Ação: {a.acao}</p>
              <Detalhes titulo="Evidência e causa" className="mt-2">
                <div className="space-y-1 text-xs text-slate-300">
                  <p>
                    <strong className="text-slate-200">Evidência:</strong> {a.evidencia}
                  </p>
                  <p>
                    <strong className="text-slate-200">Causa:</strong> {a.causa}
                  </p>
                  <p className="text-slate-400">Dono: {a.dono}</p>
                </div>
              </Detalhes>
            </div>
          ))}
        </div>
      </div>

      {/* Conferência dos 13 Números de Controle do Dossiê */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">Conferência dos dados</h2>
            <p className="text-xs text-slate-400">
              <strong className={controlesOk === controls.length ? "text-emerald-300" : "text-amber-300"}>
                {controlesOk} de {controls.length}
              </strong>{" "}
              números de controle do dossiê batem com a data de status {fmtDateBR(statusDate)}.
            </p>
          </div>
          <button
            onClick={() => onNavigate("entry")}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            Ir para Lançamentos
          </button>
        </div>
        <Detalhes titulo="Ver os 13 números de controle" className="mt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">Controle</th>
                  <th className="py-2 pr-3 text-right">No sistema</th>
                  <th className="py-2 pr-3 text-right">Meta 30/10</th>
                  <th className="py-2 pr-3 text-right">Meta 13/11</th>
                  <th className="py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {controls.map((c) => {
                  const fmt = (v: number) =>
                    c.format === "brl"
                      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : c.format === "dec1"
                      ? fmtNum(v, 1)
                      : String(Math.round(v));
                  const target = is1311 ? c.esperado1311 : c.esperado3010;
                  const ok = Math.abs(c.obtido - target) < 0.05;
                  return (
                    <tr key={c.label} className="hover:bg-slate-800/30">
                      <td className="py-1.5 pr-3 text-slate-200">{c.label}</td>
                      <td className="py-1.5 pr-3 text-right font-mono font-semibold text-white">{fmt(c.obtido)}</td>
                      <td className="py-1.5 pr-3 text-right font-mono text-slate-400">{fmt(c.esperado3010)}</td>
                      <td className="py-1.5 pr-3 text-right font-mono text-slate-400">{fmt(c.esperado1311)}</td>
                      <td className="py-1.5 text-center">
                        {ok ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            ✓ Confere
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
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
        </Detalhes>
      </div>
    </div>
  );
};
