import React, { useState } from "react";
import { Bot, Send } from "lucide-react";
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
}

export const AiAssistantView: React.FC<Props> = ({ db, statusDate, network, evm, agile, scenarios }) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: `Olá! Sou o Assistente da Sala de Guerra da Maré Seguros (dados até ${fmtDateBR(statusDate)}). Pergunte sobre prazo, caminho crítico, valor agregado, desvios de custo, riscos, fornecedores ou qual cenário recomendar ao comitê.`,
    },
  ]);

  const gov = computeGovernanceAndProcurement(db, statusDate);

  const answerQuestion = (q: string): string => {
    const low = q.toLowerCase();
    if (low.includes("prazo") || low.includes("quando") || low.includes("crítico") || low.includes("critico")) {
      return `Na data de status ${fmtDateBR(statusDate)}, a previsão de término pela rede é ${fmtDateBR(network.forecastEndDate)} (du ${network.forecastEndDu}), com ${network.atrasoContratualDu} dias úteis de atraso além de 22/01/2027. O caminho crítico previsto é: ${network.criticalPathForecast.join(" → ")}. Na frente ágil, a Release 2 sai em ${fmtDateBR(agile.dataPrevistaR2)} (${agile.sprintsRestantesR2} sprints, velocidade média ${fmtNum(agile.velocidadeMedia, 1)} pts/sprint).`;
    }
    if (low.includes("custo") || low.includes("evm") || low.includes("valor") || low.includes("desvio")) {
      return `O orçamento no término (ONT) é ${fmtBRL0(evm.ontTotal)}, mas a Estimativa no Término (ENT) subiu para ${fmtBRL0(evm.entTotal)} (+${fmtBRL0(evm.entTotal - evm.ontTotal)}), com IDC = ${fmtNum(evm.idcTotal, 3)} e IDP = ${fmtNum(evm.idpTotal, 3)}. Os desvios vêm do retrabalho com o provedor F04 (VisionAI), ocorrências de risco (OC-005 R$ 66,8 mil; OC-003 R$ 38,5 mil), horas extras operacionais e queda da velocidade ágil.`;
    }
    if (low.includes("cenário") || low.includes("cenario") || low.includes("recomenda") || low.includes("decid")) {
      const sorted = [...scenarios].sort((a, b) => b.resultadoLiquido - a.resultadoLiquido);
      const top = sorted[0];
      const c1 = scenarios.find((s) => s.idKey === "C1");
      return `Comparando C1–C6 e combinações: manter como está (C1) resulta em término em ${fmtDateBR(c1?.terminoPrevistoDate ?? "")} com resultado líquido de ${fmtBRL0(c1?.resultadoLiquido ?? 0)}. A melhor decisão pelo critério VPL − Custo do Atraso é **${top.idKey}**, que entrega término em ${fmtDateBR(top.terminoPrevistoDate)}, VPL de ${fmtBRL0(top.vpl)} e resultado líquido de ${fmtBRL0(top.resultadoLiquido)} (trade-off: ${top.oQueSePerde}).`;
    }
    if (low.includes("risco") || low.includes("reserva") || low.includes("fornecedor") || low.includes("escopo") || low.includes("alçada")) {
      return `Exposição VME das ameaças abertas: ${fmtBRL0(gov.exposicaoTotalVme)}, coberta pela reserva de contingência de ${fmtBRL0(gov.reservaContingencia)}. Na governança, há ${gov.pedidosDiretos.length} pedidos diretos fora do fluxo de mudança (MS-222 causou ${gov.bugsDePedidosDiretos.filter((b) => b.id_item_origem === "MS-222").length} bugs) e ${gov.mudancasAuditadas.filter((m) => !m.conformeAlcada).length} aprovações acima da alçada do gerente. Em compras, evitar F04 (VisionAI) na licitação em aberto devido a 6 reprovações históricas.`;
    }
    return `Resumo executivo (${fmtDateBR(statusDate)}): Término previsto ${fmtDateBR(network.forecastEndDate)} (+${network.atrasoContratualDu} du); ENT ${fmtBRL0(evm.entTotal)} (IDC ${fmtNum(evm.idcTotal, 2)}); VME aberto ${fmtBRL0(gov.exposicaoTotalVme)} vs reserva ${fmtBRL0(gov.reservaContingencia)}. Tente perguntar especificamente sobre "prazo", "custo", "riscos", "escopo" ou "qual cenário recomendar".`;
  };

  const handleSend = (text?: string) => {
    const q = (text ?? question).trim();
    if (!q) return;
    const ans = answerQuestion(q);
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: ans }]);
    if (!text) setQuestion("");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-sky-400" />
          <div>
            <h2 className="text-base font-bold text-white">Assistente Analítico da Sala de Guerra (R13)</h2>
            <p className="text-xs text-slate-400">
              Conectado ao estado ao vivo do projeto (sem chaves expostas no repositório).
            </p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {[
            "Quando termina e qual é o caminho crítico?",
            "Quanto vai custar e de onde vem o desvio?",
            "A reserva cobre os riscos e o que há de escopo/alçada?",
            "Qual cenário recomendar ao comitê diretor?",
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => handleSend(preset)}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-sky-600 text-white"
                  : "bg-slate-900 text-slate-200 border border-slate-800"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pergunte sobre prazo, EVM, riscos, fornecedores ou cenários..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-400"
          >
            <Send className="h-3.5 w-3.5" /> Perguntar
          </button>
        </form>
      </div>
    </div>
  );
};
