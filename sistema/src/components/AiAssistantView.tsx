import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { fmtBRL0, fmtDateBR, fmtNum, type AgileMetrics, type EVMSummary, type NetworkResult, type ScenarioSimulation } from "../engine/calculations";
import { computeGovernanceAndProcurement } from "../engine/extraCalculations";
import type { ProjectDatabase } from "../types/project";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  network: NetworkResult;
  evm: EVMSummary;
  agile: AgileMetrics;
  scenarios: ScenarioSimulation[];
  /** Aba aberta no momento: as perguntas sugeridas mudam conforme a tela. */
  activeTab: string;
}

const PERGUNTAS_POR_TELA: Record<string, string[]> = {
  dashboard: ["Quando termina e qual é o caminho crítico?", "Quanto vai custar e de onde vem o desvio?", "Qual cenário recomendar ao comitê?"],
  entry: ["Quando termina e qual é o caminho crítico?", "Quanto vai custar e de onde vem o desvio?"],
  network: ["Quando termina e qual é o caminho crítico?", "Qual cenário recomendar ao comitê?"],
  evm: ["Quanto vai custar e de onde vem o desvio?", "Qual cenário recomendar ao comitê?"],
  agile: ["Quando termina e qual é o caminho crítico?", "O que há de escopo fora do controle?"],
  people: ["Quanto vai custar e de onde vem o desvio?", "A reserva cobre os riscos?"],
  governance: ["A reserva cobre os riscos?", "O que há de escopo fora do controle?", "Qual fornecedor evitar?"],
  scenarios: ["Qual cenário recomendar ao comitê?", "Quando termina e qual é o caminho crítico?"],
  mockups: ["Quando termina e qual é o caminho crítico?", "Qual cenário recomendar ao comitê?"],
};

export const AiAssistantFloating: React.FC<Props> = ({ db, statusDate, network, evm, agile, scenarios, activeTab }) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: `Olá! Sou o assistente da Sala de Guerra (dados até ${fmtDateBR(statusDate)}). Pergunte sobre prazo, custo, riscos, fornecedores ou cenários — em qualquer tela.`,
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const gov = computeGovernanceAndProcurement(db, statusDate);

  const answerQuestion = (q: string): string => {
    const low = q.toLowerCase();
    if (low.includes("prazo") || low.includes("quando") || low.includes("crítico") || low.includes("critico") || low.includes("termina")) {
      return `Na data de status ${fmtDateBR(statusDate)}, a previsão de término pela rede é ${fmtDateBR(network.forecastEndDate)}, ${network.atrasoContratualDu} dias úteis depois do contrato (22/01/2027). O caminho crítico previsto é ${network.criticalPathForecast.join(" → ")}. Na frente ágil, a Release 2 sai em ${fmtDateBR(agile.dataPrevistaR2)} (${agile.sprintsRestantesR2} sprints, velocidade média de ${fmtNum(agile.velocidadeMedia, 1)} pts/sprint).`;
    }
    if (low.includes("cenário") || low.includes("cenario") || low.includes("recomenda") || low.includes("decid")) {
      const top = [...scenarios].sort((a, b) => b.resultadoLiquido - a.resultadoLiquido)[0];
      const c1 = scenarios.find((s) => s.idKey === "C1");
      return `Seguir como está (C1) termina em ${fmtDateBR(c1?.terminoPrevistoDate ?? "")}, com saldo de ${fmtBRL0(c1?.resultadoLiquido ?? 0)}. O melhor saldo (VPL − custo do atraso) é ${top.idKey}: término em ${fmtDateBR(top.terminoPrevistoDate)}, VPL de ${fmtBRL0(top.vpl)} e saldo de ${fmtBRL0(top.resultadoLiquido)}. O que se perde: ${top.oQueSePerde}`;
    }
    if (low.includes("fornecedor") || low.includes("contrato") || low.includes("evitar")) {
      return `Evitar F04 (VisionAI) na contratação do monitoramento 24h: tem 6 reprovações em inspeções e 2 ocorrências de risco. A proposta mais bem avaliada sem histórico negativo é a primeira da lista em "Riscos & Contratos → Contratos e fornecedores".`;
    }
    if (low.includes("risco") || low.includes("reserva") || low.includes("escopo") || low.includes("alçada") || low.includes("alcada")) {
      return `Os riscos abertos têm custo esperado de ${fmtBRL0(gov.exposicaoTotalVme)}, ${gov.reservaContingencia >= gov.exposicaoTotalVme ? "cobertos" : "NÃO cobertos"} pela reserva de contingência de ${fmtBRL0(gov.reservaContingencia)}. Há ${gov.pedidosDiretos.length} pedidos diretos fora do controle de mudança (o MS-222 gerou ${gov.bugsDePedidosDiretos.filter((b) => b.id_item_origem === "MS-222").length} defeitos) e ${gov.mudancasAuditadas.filter((m) => !m.conformeAlcada).length} mudanças aprovadas sem a alçada correta.`;
    }
    if (low.includes("custo") || low.includes("evm") || low.includes("valor") || low.includes("desvio") || low.includes("custar")) {
      return `O orçamento aprovado é ${fmtBRL0(evm.ontTotal)}, mas o custo previsto no fim é ${fmtBRL0(evm.entTotal)} (+${fmtBRL0(evm.entTotal - evm.ontTotal)}). IDC = ${fmtNum(evm.idcTotal, 2)} (cada R$ 1 gasto entrega R$ ${fmtNum(evm.idcTotal, 2)}) e IDP = ${fmtNum(evm.idpTotal, 2)}. O desvio vem do retrabalho com o F04 (VisionAI), de ocorrências de risco, de horas extras e da queda de velocidade ágil.`;
    }
    return `Resumo (${fmtDateBR(statusDate)}): término previsto ${fmtDateBR(network.forecastEndDate)} (+${network.atrasoContratualDu} du); custo previsto ${fmtBRL0(evm.entTotal)} (IDC ${fmtNum(evm.idcTotal, 2)}); riscos abertos ${fmtBRL0(gov.exposicaoTotalVme)} contra reserva de ${fmtBRL0(gov.reservaContingencia)}. Pergunte sobre "prazo", "custo", "riscos", "escopo", "fornecedor" ou "cenário".`;
  };

  const handleSend = (text?: string) => {
    const q = (text ?? question).trim();
    if (!q) return;
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: answerQuestion(q) }]);
    if (!text) setQuestion("");
  };

  const sugestoes = PERGUNTAS_POR_TELA[activeTab] ?? PERGUNTAS_POR_TELA.dashboard;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#139297] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 transition hover:bg-[#17a8ae] sm:right-6 sm:bottom-6"
          aria-label="Abrir assistente de IA"
        >
          <Bot className="h-5 w-5" />
          <span className="hidden sm:inline">Assistente IA</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-2 bottom-2 z-40 flex max-h-[80vh] flex-col rounded-2xl border border-[#2b3c4f] bg-[#0e1620] shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]">
          <div className="flex items-center justify-between gap-2 border-b border-[#1e2b3a] px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#2dd4bf]" />
              <div>
                <div className="text-sm font-semibold text-white">Assistente IA (R13)</div>
                <div className="text-[11px] text-slate-400">Responde com os dados ao vivo do projeto</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar assistente">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="min-h-48 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.role === "user" ? "ml-auto bg-[#0f767a] text-white" : "border border-slate-800 bg-slate-900 text-slate-200"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-[#1e2b3a] px-3 pt-3">
            {sugestoes.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 p-3"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Pergunte sobre prazo, custo, riscos..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
            />
            <button type="submit" className="inline-flex items-center rounded-xl bg-sky-500 px-3 py-2 text-white hover:bg-sky-400" aria-label="Enviar pergunta">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
