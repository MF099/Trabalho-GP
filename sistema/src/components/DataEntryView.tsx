import React, { useState } from "react";
import { CheckCircle2, PlusCircle, UserCheck, Zap } from "lucide-react";
import type { AuditEntry, CsvRow, ProjectDatabase, TableName } from "../types/project";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  operador: string;
  auditLogs: AuditEntry[];
  onChangeOperador: (name: string) => void;
  onUpdateDb: (nextDb: ProjectDatabase, log?: AuditEntry) => void;
}

const INPUT_CLS =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none";

const Field: React.FC<{
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, hint, className = "", children }) => (
  <div className={className}>
    <label className="mb-1 block text-[11px] font-semibold text-slate-300">
      {label}
      {hint && <span className="ml-1 font-normal text-slate-500">({hint})</span>}
    </label>
    {children}
  </div>
);

export const DataEntryView: React.FC<Props> = ({
  db,
  statusDate,
  operador,
  auditLogs,
  onChangeOperador,
  onUpdateDb,
}) => {
  const [formTab, setFormTab] = useState<
    "SURPRESA" | "AVANCO" | "HORAS" | "CUSTOS" | "INSPECOES" | "AGIL" | "IMPLANTACOES" | "RISCO_MUD" | "REUNIOES"
  >("AVANCO");
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");

  // Boletim Surpresa (Ao Vivo) states
  const [surpActId, setSurpActId] = useState("A27");
  const [surpAvancoPct, setSurpAvancoPct] = useState("65");
  const [surpSmDesc, setSurpSmDesc] = useState("Ajuste emergencial aprovado pelo comitê");
  const [surpSmCusto, setSurpSmCusto] = useState("15000");
  const [surpSmPrazo, setSurpSmPrazo] = useState("3");
  const [surpCardId, setSurpCardId] = useState("MS-158");
  const [surpCardDest, setSurpCardDest] = useState("CONCLUIDO");

  // B1 Avanço form
  const [avSem, setAvSem] = useState("2026-11-13");
  const [avAct, setAvAct] = useState("A27");
  const [avPct, setAvPct] = useState("75");
  const [avSit, setAvSit] = useState("EM_ANDAMENTO");
  const [avIni, setAvIni] = useState("2026-10-05");
  const [avFim, setAvFim] = useState("");
  const [avResp, setAvResp] = useState("P09");

  // B2 Horas form
  const [hrSem, setHrSem] = useState("2026-11-09");
  const [hrPessoa, setHrPessoa] = useState("P15");
  const [hrTipo, setHrTipo] = useState("SPRINT");
  const [hrItem, setHrItem] = useState("S15");
  const [hrNorm, setHrNorm] = useState("40");
  const [hrExt, setHrExt] = useState("0");

  // B3 Custos form
  const [ctData, setCtData] = useState("2026-11-13");
  const [ctFrente, setCtFrente] = useState("AGIL");
  const [ctCat, setCtCat] = useState("LICENCAS_E_NUVEM");
  const [ctAct, setCtAct] = useState("");
  const [ctDoc, setCtDoc] = useState("NF-NUV-2611");
  const [ctDesc, setCtDesc] = useState("Nuvem, licenças e ferramentas do time");
  const [ctVal, setCtVal] = useState("4500");

  // B5/B6 Backlog / Transição form
  const [bkId, setBkId] = useState("MS-235");
  const [bkTitulo, setBkTitulo] = useState("Novo item registrado na sprint");
  const [bkEpico, setBkEpico] = useState("EP02");
  const [bkRel, setBkRel] = useState("R2");
  const [bkPts, setBkPts] = useState("3");
  const [bkOrig, setBkOrig] = useState("MUDANCA_APROVADA");

  // B8 Risco / Ocorrência form
  const [ocDesc, setOcDesc] = useState("Ocorrência registrada em campo");
  const [ocFrente, setOcFrente] = useState("AGIL");
  const [ocAct, setOcAct] = useState("A27");
  const [ocCusto, setOcCusto] = useState("2900");
  const [ocPrazo, setOcPrazo] = useState("4");

  // B4 Inspeções form
  const [inData, setInData] = useState("2026-11-04");
  const [inAct, setInAct] = useState("A29");
  const [inTipo, setInTipo] = useState("LISTA_DE_VERIFICACAO");
  const [inVerif, setInVerif] = useState("50");
  const [inNc, setInNc] = useState("1");
  const [inRes, setInRes] = useState("APROVADO");
  const [inForn, setInForn] = useState("F09");
  const [inRetrH, setInRetrH] = useState("4.1");
  const [inRetrRs, setInRetrRs] = useState("450.59");

  // B7 Implantação form
  const [impData, setImpData] = useState("2026-11-11");
  const [impAmb, setImpAmb] = useState("PRODUCAO");
  const [impVer, setImpVer] = useState("1.61");
  const [impItens, setImpItens] = useState("3");
  const [impTempo, setImpTempo] = useState("50.2");
  const [impFalhou, setImpFalhou] = useState("0");

  // B9 Reunião / Pulso form
  const [reData, setReData] = useState("2026-11-12");
  const [reTipo, setReTipo] = useState("COMITE_DIRETOR");
  const [reDur, setReDur] = useState("120");
  const [reConv, setReConv] = useState("6");
  const [rePres, setRePres] = useState("4");
  const [rePatr, setRePatr] = useState("1");
  const [reDec, setReDec] = useState("3");
  const [pulsoVal, setPulsoVal] = useState("3.94");
  const [pulsoResp, setPulsoResp] = useState("6");

  const makeLog = (
    tipo: string,
    resumo: string,
    dados: Record<string, unknown>,
    table?: TableName,
    rowSnapshot?: CsvRow
  ): AuditEntry => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    registradoPor: operador || "Usuário",
    tipo,
    resumo,
    dados: { ...dados, ...(table ? { _table: table, _row: rowSnapshot } : {}) },
  });

  const handleBoletimSurpresa = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));

    next["17_avanco_semanal"].push({
      semana_fim: statusDate,
      id_atividade: surpActId,
      avanco_acumulado_pct: surpAvancoPct,
      situacao: Number(surpAvancoPct) >= 100 ? "CONCLUIDA" : "EM_ANDAMENTO",
      data_inicio_real: "2026-10-05",
      data_termino_real: Number(surpAvancoPct) >= 100 ? statusDate : "",
      id_responsavel: "P09",
    });

    const smNum = next["28_mudancas_solicitacoes"].length + 1;
    const smId = `SM-${String(smNum).padStart(3, "0")}`;
    next["28_mudancas_solicitacoes"].push({
      id_mudanca: smId,
      data_abertura: statusDate,
      id_solicitante: "PI01",
      descricao: surpSmDesc,
      tipo_mudanca: "PRAZO",
      frente: "AGIL",
      id_atividade: surpActId,
      impacto_custo_rs: surpSmCusto,
      impacto_prazo_du: surpSmPrazo,
      impacto_pontos: "0",
      status: "APROVADA",
      data_decisao: statusDate,
      nivel_decisor: "COMITE",
      implementada: "SIM",
    });

    if (Number(surpSmCusto) > 0) {
      next["19_custos_realizados"].push({
        id_lancamento: `L${String(next["19_custos_realizados"].length + 1).padStart(5, "0")}`,
        data: statusDate,
        frente: "AGIL",
        categoria_custo: "OUTROS",
        id_atividade: surpActId,
        codigo_eap: next["07_atividades"].find((a) => a.id_atividade === surpActId)?.codigo_eap ?? "",
        id_contrato: "",
        id_fornecedor: "",
        documento: smId,
        descricao: `Boletim Surpresa — ${surpSmDesc}`,
        valor_rs: surpSmCusto,
      });
    }

    const card = next["14_backlog_itens"].find((b) => b.id_item === surpCardId);
    if (card) {
      const prevStatus = card.status;
      card.status = surpCardDest;
      if (surpCardDest === "CONCLUIDO") card.data_conclusao = statusDate;
      next["21_itens_transicoes"].push({
        id_transicao: `TR-${String(next["21_itens_transicoes"].length + 1).padStart(4, "0")}`,
        id_item: surpCardId,
        data: statusDate,
        status_origem: prevStatus,
        status_destino: surpCardDest,
        id_pessoa: "P17",
      });
      const si = next["20_sprint_itens"].find((x) => x.id_item === surpCardId && x.id_sprint === "S15");
      if (si && surpCardDest === "CONCLUIDO") si.concluido_na_sprint = "1";
    }

    onUpdateDb(
      next,
      makeLog(
        "BOLETIM_SURPRESA",
        `Ao vivo: ${surpActId} (${surpAvancoPct}%), ${smId} (+R$ ${surpSmCusto}), ${surpCardId} → ${surpCardDest}`,
        { surpActId, surpAvancoPct, smId, surpCardId, surpCardDest }
      )
    );
    setFeedbackMsg(`Boletim surpresa lançado por ${operador}! Indicadores recalculados automaticamente.`);
  };

  const handleAddAvanco = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const row: CsvRow = {
      semana_fim: avSem,
      id_atividade: avAct,
      avanco_acumulado_pct: avPct,
      situacao: avSit,
      data_inicio_real: avIni,
      data_termino_real: avSit === "CONCLUIDA" ? avFim || avSem : "",
      id_responsavel: avResp,
    };
    next["17_avanco_semanal"].push(row);
    onUpdateDb(next, makeLog("AVANCO_SEMANAL", `${avAct} em ${avSem}: ${avPct}% (${avSit})`, { avAct, avSem, avPct }, "17_avanco_semanal", row));
    setFeedbackMsg(`Avanço semanal de ${avAct} (${avPct}%) registrado com sucesso.`);
  };

  const handleAddHoras = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const row: CsvRow = {
      semana_inicio: hrSem,
      id_pessoa: hrPessoa,
      tipo_item: hrTipo,
      id_item: hrItem,
      horas_normais: hrNorm,
      horas_extras: hrExt,
    };
    next["18_apontamento_horas"].push(row);
    onUpdateDb(next, makeLog("HORAS", `${hrPessoa} · ${hrTipo} ${hrItem}: ${hrNorm}h + ${hrExt}h extras`, { hrPessoa, hrItem }, "18_apontamento_horas", row));
    setFeedbackMsg(`Horas de ${hrPessoa} (${hrNorm}h normais + ${hrExt}h extras) registradas.`);
  };

  const handleAddCusto = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const eap = next["07_atividades"].find((a) => a.id_atividade === ctAct)?.codigo_eap ?? "";
    const row: CsvRow = {
      id_lancamento: `L${String(next["19_custos_realizados"].length + 1).padStart(5, "0")}`,
      data: ctData,
      frente: ctFrente,
      categoria_custo: ctCat,
      id_atividade: ctAct,
      codigo_eap: eap,
      id_contrato: "",
      id_fornecedor: "",
      documento: ctDoc,
      descricao: ctDesc,
      valor_rs: ctVal,
    };
    next["19_custos_realizados"].push(row);
    onUpdateDb(next, makeLog("CUSTO", `${ctDoc} (${ctFrente}): R$ ${ctVal}`, { ctDoc, ctVal }, "19_custos_realizados", row));
    setFeedbackMsg(`Custo ${ctDoc} (R$ ${ctVal}) lançado com sucesso.`);
  };

  const handleAddBacklog = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const row: CsvRow = {
      id_item: bkId,
      id_epico: bkEpico,
      tipo_item: "HISTORIA",
      titulo: bkTitulo,
      historia_de_usuario: "",
      pontos: bkPts,
      prioridade_moscow: "MUST",
      valor_de_negocio: "50",
      ordem_no_backlog: String(next["14_backlog_itens"].length + 1),
      id_release: bkRel,
      origem: bkOrig,
      id_mudanca: "",
      id_solicitante: "",
      data_criacao: statusDate,
      status: "A_FAZER",
      id_sprint_atual: "S15",
      id_responsavel: "",
      revisao_por_par: "",
      data_inicio: "",
      data_conclusao: "",
    };
    next["14_backlog_itens"].push(row);
    onUpdateDb(next, makeLog("BACKLOG", `Item ${bkId} (${bkPts} pts, ${bkRel}) adicionado`, { bkId, bkPts }, "14_backlog_itens", row));
    setFeedbackMsg(`Item ${bkId} adicionado ao backlog com sucesso.`);
  };

  const handleAddOcorrencia = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const ocId = `OC-${String(next["27_riscos_ocorrencias"].length + 1).padStart(3, "0")}`;
    const row: CsvRow = {
      id_ocorrencia: ocId,
      data: statusDate,
      id_risco: "",
      descricao: ocDesc,
      frente: ocFrente,
      id_atividade: ocAct,
      impacto_custo_real_rs: ocCusto,
      impacto_prazo_real_du: ocPrazo,
      custo_ja_incluido_em_pagamentos: "NAO",
    };
    next["27_riscos_ocorrencias"].push(row);
    onUpdateDb(next, makeLog("OCORRENCIA", `${ocId}: ${ocDesc} (R$ ${ocCusto}, +${ocPrazo} du)`, { ocId }, "27_riscos_ocorrencias", row));
    setFeedbackMsg(`Ocorrência ${ocId} registrada com sucesso.`);
  };

  const handleAddInspecao = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const inId = `IN-${String(next["25_inspecoes_aceite"].length + 1).padStart(3, "0")}`;
    const row: CsvRow = {
      id_inspecao: inId,
      data: inData,
      id_atividade: inAct,
      tipo_inspecao: inTipo,
      itens_verificados: inVerif,
      itens_nao_conformes: inNc,
      resultado: inRes,
      id_fornecedor: inForn,
      horas_retrabalho: inRetrH,
      custo_retrabalho_rs: inRetrRs,
    };
    next["25_inspecoes_aceite"].push(row);
    onUpdateDb(next, makeLog("INSPECAO", `${inId} (${inAct}): ${inRes} · ${inNc}/${inVerif} NC`, { inId }, "25_inspecoes_aceite", row));
    setFeedbackMsg(`Inspeção ${inId} registrada com sucesso.`);
  };

  const handleAddImplantacao = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const impId = `IMP-${String(next["23_implantacoes"].length + 1).padStart(3, "0")}`;
    const row: CsvRow = {
      id_implantacao: impId,
      data: impData,
      id_sprint: "S15",
      ambiente: impAmb,
      versao: impVer,
      itens_implantados: impItens,
      tempo_ate_producao_h: impTempo,
      falhou: impFalhou,
      tempo_restauracao_h: impFalhou === "1" ? "2.0" : "",
    };
    next["23_implantacoes"].push(row);
    onUpdateDb(next, makeLog("IMPLANTACAO", `${impId} v${impVer} (${impAmb}): ${impItens} itens`, { impId }, "23_implantacoes", row));
    setFeedbackMsg(`Implantação ${impId} (v${impVer}) registrada com sucesso.`);
  };

  const handleAddReuniao = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const reId = `RE-${String(next["33_reunioes"].length + 1).padStart(3, "0")}`;
    const row: CsvRow = {
      id_reuniao: reId,
      data: reData,
      tipo_reuniao: reTipo,
      duracao_min: reDur,
      convidados: reConv,
      presentes: rePres,
      patrocinador_presente: rePatr,
      decisoes_tomadas: reDec,
      pendencias_abertas: "0",
      ata_publicada: "1",
    };
    next["33_reunioes"].push(row);
    onUpdateDb(next, makeLog("REUNIAO", `${reId} (${reTipo} em ${reData}): ${rePres}/${reConv} presentes`, { reId }, "33_reunioes", row));
    setFeedbackMsg(`Reunião ${reId} registrada com sucesso.`);
  };

  const handleAddPulso = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const existing = next["35_pulso_equipe"].find((p) => p.id_sprint === "S15");
    if (existing) {
      existing.satisfacao_media = pulsoVal;
      existing.respostas = pulsoResp;
    } else {
      next["35_pulso_equipe"].push({ id_sprint: "S15", satisfacao_media: pulsoVal, respostas: pulsoResp });
    }
    onUpdateDb(next, makeLog("PULSO", `Pulso S15: ${pulsoVal}/5 (${pulsoResp} respostas)`, { pulsoVal }));
    setFeedbackMsg(`Pulso da Sprint S15 (${pulsoVal}/5) atualizado com sucesso.`);
  };

  return (
    <div className="space-y-6">
      {/* Identificação do Responsável pelo Lançamento */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <UserCheck className="h-4 w-4 text-sky-400" />
              Quem está realizando o lançamento?
            </div>
            <Field label="Nome do responsável">
              <input
                value={operador}
                onChange={(e) => onChangeOperador(e.target.value)}
                placeholder="Digite seu nome completo"
                className={INPUT_CLS}
              />
            </Field>
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-slate-400">Seleção rápida</span>
            <div className="flex flex-wrap gap-2">
              {["Matheus", "Colega 2", "Colega 3"].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChangeOperador(n)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    operador === n ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2.5 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* Formulários de Lançamento com Rótulos Claros */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-white">Escolha o tipo de informação para lançar</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Preencha os campos indicados e clique no botão de envio para atualizar automaticamente os indicadores.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          {[
            { id: "AVANCO", label: "B1 · Avanço Semanal" },
            { id: "HORAS", label: "B2 · Folha de Horas" },
            { id: "CUSTOS", label: "B3 · Custos Pagos" },
            { id: "INSPECOES", label: "B4 · Inspeções" },
            { id: "AGIL", label: "B5/B6 · Backlog & Sprint" },
            { id: "IMPLANTACOES", label: "B7 · Implantações" },
            { id: "RISCO_MUD", label: "B8 · Ocorrências" },
            { id: "REUNIOES", label: "B9 · Reuniões & Pulso" },
            { id: "SURPRESA", label: "⚡ Boletim Surpresa (Ao Vivo)" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFormTab(t.id as typeof formTab)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                formTab === t.id ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {formTab === "AVANCO" && (
          <form onSubmit={handleAddAvanco} className="space-y-4">
            <p className="text-xs text-slate-400">
              Registre o percentual acumulado concluído de uma entrega ou atividade na semana informada.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Data de fechamento da semana">
                <input type="date" value={avSem} onChange={(e) => setAvSem(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Atividade / Entrega" className="sm:col-span-2 lg:col-span-2">
                <select value={avAct} onChange={(e) => setAvAct(e.target.value)} className={INPUT_CLS}>
                  {db["07_atividades"].map((a) => (
                    <option key={a.id_atividade} value={a.id_atividade}>
                      {a.id_atividade} — {a.nome_atividade}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Avanço acumulado" hint="% de 0 a 100">
                <input type="number" min={0} max={100} value={avPct} onChange={(e) => setAvPct(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Situação atual">
                <select value={avSit} onChange={(e) => setAvSit(e.target.value)} className={INPUT_CLS}>
                  <option value="EM_ANDAMENTO">Em andamento</option>
                  <option value="CONCLUIDA">Concluída</option>
                </select>
              </Field>
              <Field label="Data de início real">
                <input type="date" value={avIni} onChange={(e) => setAvIni(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Data de término real" hint="opcional">
                <input type="date" value={avFim} onChange={(e) => setAvFim(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Responsável pelo informe">
                <select value={avResp} onChange={(e) => setAvResp(e.target.value)} className={INPUT_CLS}>
                  {db["04_equipe"].map((p) => (
                    <option key={p.id_pessoa} value={p.id_pessoa}>
                      {p.id_pessoa} — {p.nome}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400"
            >
              <PlusCircle className="h-4 w-4" /> Registrar Avanço Semanal
            </button>
          </form>
        )}

        {formTab === "HORAS" && (
          <form onSubmit={handleAddHoras} className="space-y-4">
            <p className="text-xs text-slate-400">
              Informe as horas trabalhadas (normais e extras) por integrante da equipe na semana.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Segunda-feira da semana">
                <input type="date" value={hrSem} onChange={(e) => setHrSem(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Profissional da equipe">
                <select value={hrPessoa} onChange={(e) => setHrPessoa(e.target.value)} className={INPUT_CLS}>
                  {db["04_equipe"].map((p) => (
                    <option key={p.id_pessoa} value={p.id_pessoa}>
                      {p.id_pessoa} — {p.nome} ({p.papel})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo de apropriação">
                <select value={hrTipo} onChange={(e) => setHrTipo(e.target.value)} className={INPUT_CLS}>
                  <option value="SPRINT">Sprint (Time Ágil)</option>
                  <option value="GESTAO">Gestão / PMO</option>
                  <option value="ATIVIDADE">Atividade específica</option>
                </select>
              </Field>
              <Field label="Código da Sprint ou Atividade" hint="ex: S15, GESTAO, A27">
                <input value={hrItem} onChange={(e) => setHrItem(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Horas normais trabalhadas" hint="h">
                <input type="number" step="0.5" min={0} value={hrNorm} onChange={(e) => setHrNorm(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Horas extras trabalhadas" hint="h">
                <input type="number" step="0.5" min={0} value={hrExt} onChange={(e) => setHrExt(e.target.value)} className={INPUT_CLS} />
              </Field>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400"
            >
              <PlusCircle className="h-4 w-4" /> Registrar Folha de Horas
            </button>
          </form>
        )}

        {formTab === "CUSTOS" && (
          <form onSubmit={handleAddCusto} className="space-y-4">
            <p className="text-xs text-slate-400">
              Registre notas fiscais, medições de fornecedores, despesas de nuvem ou custos indiretos pagos.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Data do pagamento">
                <input type="date" value={ctData} onChange={(e) => setCtData(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Área / Frente do gasto">
                <select value={ctFrente} onChange={(e) => setCtFrente(e.target.value)} className={INPUT_CLS}>
                  <option value="AGIL">Trilha Ágil / Produto</option>
                  <option value="GESTAO">Gestão / PMO</option>
                  <option value="PREDITIVA">Operação / Apoio</option>
                </select>
              </Field>
              <Field label="Categoria de custo">
                <select value={ctCat} onChange={(e) => setCtCat(e.target.value)} className={INPUT_CLS}>
                  <option value="LICENCAS_E_NUVEM">Licenças e Nuvem</option>
                  <option value="SERVICO_CONTRATADO">Serviço Contratado</option>
                  <option value="EQUIPAMENTO">Equipamento</option>
                  <option value="MATERIAL">Material</option>
                  <option value="INDIRETO">Indireto</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </Field>
              <Field label="Valor pago" hint="R$">
                <input type="number" step="0.01" min={0} value={ctVal} onChange={(e) => setCtVal(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Número do documento" hint="ex: NF-NUV-2611">
                <input value={ctDoc} onChange={(e) => setCtDoc(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Descrição da despesa" className="sm:col-span-2">
                <input value={ctDesc} onChange={(e) => setCtDesc(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Código de atividade" hint="opcional">
                <input value={ctAct} onChange={(e) => setCtAct(e.target.value)} placeholder="Ex: A27 ou deixe vazio" className={INPUT_CLS} />
              </Field>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400"
            >
              <PlusCircle className="h-4 w-4" /> Lançar Custo Pago
            </button>
          </form>
        )}

        {formTab === "INSPECOES" && (
          <form onSubmit={handleAddInspecao} className="space-y-4">
            <p className="text-xs text-slate-400">
              Registre listas de verificação, auditorias ou testes de aceitação e eventual custo de retrabalho.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Data da inspeção">
                <input type="date" value={inData} onChange={(e) => setInData(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Entrega / Atividade inspecionada">
                <select value={inAct} onChange={(e) => setInAct(e.target.value)} className={INPUT_CLS}>
                  {db["07_atividades"].map((a) => (
                    <option key={a.id_atividade} value={a.id_atividade}>
                      {a.id_atividade} — {a.nome_atividade}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo de inspeção">
                <select value={inTipo} onChange={(e) => setInTipo(e.target.value)} className={INPUT_CLS}>
                  <option value="LISTA_DE_VERIFICACAO">Lista de verificação</option>
                  <option value="AUDITORIA_DOCUMENTAL">Auditoria documental</option>
                  <option value="TESTE_DE_ACEITACAO_DO_USUARIO">Teste de aceitação do usuário</option>
                </select>
              </Field>
              <Field label="Itens verificados" hint="qtd">
                <input type="number" min={0} value={inVerif} onChange={(e) => setInVerif(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Itens não conformes" hint="qtd">
                <input type="number" min={0} value={inNc} onChange={(e) => setInNc(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Resultado da inspeção">
                <select value={inRes} onChange={(e) => setInRes(e.target.value)} className={INPUT_CLS}>
                  <option value="APROVADO">Aprovado</option>
                  <option value="APROVADO_COM_RESSALVA">Aprovado com ressalva</option>
                  <option value="REPROVADO">Reprovado</option>
                </select>
              </Field>
              <Field label="Fornecedor vinculado" hint="ex: F09 ou vazio">
                <input value={inForn} onChange={(e) => setInForn(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Horas de retrabalho" hint="h">
                <input type="number" step="0.1" min={0} value={inRetrH} onChange={(e) => setInRetrH(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Custo do retrabalho" hint="R$">
                <input type="number" step="0.01" min={0} value={inRetrRs} onChange={(e) => setInRetrRs(e.target.value)} className={INPUT_CLS} />
              </Field>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400"
            >
              <PlusCircle className="h-4 w-4" /> Registrar Inspeção
            </button>
          </form>
        )}

        {formTab === "AGIL" && (
          <form onSubmit={handleAddBacklog} className="space-y-4">
            <p className="text-xs text-slate-400">
              Cadastre uma nova história de usuário, melhoria ou defeito no backlog do produto (Jira Scrum).
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Código do item" hint="ex: MS-235">
                <input value={bkId} onChange={(e) => setBkId(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Título da história ou defeito" className="sm:col-span-2">
                <input value={bkTitulo} onChange={(e) => setBkTitulo(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Épico do produto">
                <select value={bkEpico} onChange={(e) => setBkEpico(e.target.value)} className={INPUT_CLS}>
                  {db["13_epicos"].map((ep) => (
                    <option key={ep.id_epico} value={ep.id_epico}>
                      {ep.id_epico} — {ep.nome_epico}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Release alvo">
                <select value={bkRel} onChange={(e) => setBkRel(e.target.value)} className={INPUT_CLS}>
                  <option value="R1">R1 — MVP</option>
                  <option value="R2">R2 — Operação</option>
                  <option value="R3">R3 — Evolução</option>
                </select>
              </Field>
              <Field label="Estimativa" hint="Story Points">
                <input type="number" min={1} value={bkPts} onChange={(e) => setBkPts(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Origem da demanda">
                <select value={bkOrig} onChange={(e) => setBkOrig(e.target.value)} className={INPUT_CLS}>
                  <option value="MUDANCA_APROVADA">Mudança aprovada (SM)</option>
                  <option value="DEFEITO">Defeito / Bug</option>
                  <option value="PEDIDO_DIRETO">Pedido direto</option>
                  <option value="PLANO_INICIAL">Plano inicial</option>
                </select>
              </Field>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400"
            >
              <PlusCircle className="h-4 w-4" /> Adicionar Item ao Backlog
            </button>
          </form>
        )}

        {formTab === "IMPLANTACOES" && (
          <form onSubmit={handleAddImplantacao} className="space-y-4">
            <p className="text-xs text-slate-400">
              Registre uma publicação de versão do aplicativo em Homologação ou Produção (métricas DORA).
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Data da publicação">
                <input type="date" value={impData} onChange={(e) => setImpData(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Ambiente de destino">
                <select value={impAmb} onChange={(e) => setImpAmb(e.target.value)} className={INPUT_CLS}>
                  <option value="PRODUCAO">Produção</option>
                  <option value="HOMOLOGACAO">Homologação</option>
                </select>
              </Field>
              <Field label="Número da versão" hint="ex: 1.61">
                <input value={impVer} onChange={(e) => setImpVer(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Quantidade de itens publicados">
                <input type="number" min={1} value={impItens} onChange={(e) => setImpItens(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Tempo até publicação" hint="horas">
                <input type="number" step="0.1" min={0} value={impTempo} onChange={(e) => setImpTempo(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Houve falha na publicação?">
                <select value={impFalhou} onChange={(e) => setImpFalhou(e.target.value)} className={INPUT_CLS}>
                  <option value="0">Não — publicação estável</option>
                  <option value="1">Sim — precisou correção</option>
                </select>
              </Field>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400"
            >
              <PlusCircle className="h-4 w-4" /> Registrar Implantação
            </button>
          </form>
        )}

        {formTab === "RISCO_MUD" && (
          <form onSubmit={handleAddOcorrencia} className="space-y-4">
            <p className="text-xs text-slate-400">
              Registre um risco materializado ou incidente imprevisto com impacto real em custo e prazo.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Descrição do ocorrido" className="sm:col-span-2">
                <input value={ocDesc} onChange={(e) => setOcDesc(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Área afetada">
                <select value={ocFrente} onChange={(e) => setOcFrente(e.target.value)} className={INPUT_CLS}>
                  <option value="AGIL">Trilha Ágil / Produto</option>
                  <option value="PREDITIVA">Operação / Apoio</option>
                </select>
              </Field>
              <Field label="Atividade / Módulo afetado" hint="ex: A27 ou EP02">
                <input value={ocAct} onChange={(e) => setOcAct(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Impacto em custo real" hint="R$">
                <input type="number" min={0} value={ocCusto} onChange={(e) => setOcCusto(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Impacto em atraso" hint="dias úteis">
                <input type="number" min={0} value={ocPrazo} onChange={(e) => setOcPrazo(e.target.value)} className={INPUT_CLS} />
              </Field>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400"
            >
              <PlusCircle className="h-4 w-4" /> Registrar Ocorrência
            </button>
          </form>
        )}

        {formTab === "REUNIOES" && (
          <div className="space-y-6">
            <form onSubmit={handleAddReuniao} className="space-y-4">
              <p className="text-xs text-slate-400">
                Registre cerimônias ágeis (Planning, Review, Retrospectiva) ou reuniões de Comitê Diretor.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Data da reunião">
                  <input type="date" value={reData} onChange={(e) => setReData(e.target.value)} className={INPUT_CLS} />
                </Field>
                <Field label="Tipo de cerimônia / reunião">
                  <select value={reTipo} onChange={(e) => setReTipo(e.target.value)} className={INPUT_CLS}>
                    <option value="PLANEJAMENTO_DA_SPRINT">Planejamento da Sprint</option>
                    <option value="REVISAO_DA_SPRINT">Revisão da Sprint</option>
                    <option value="RETROSPECTIVA">Retrospectiva</option>
                    <option value="COMITE_DIRETOR">Comitê Diretor</option>
                    <option value="STATUS_SEMANAL">Alinhamento Semanal</option>
                  </select>
                </Field>
                <Field label="Duração" hint="minutos">
                  <input type="number" min={5} value={reDur} onChange={(e) => setReDur(e.target.value)} className={INPUT_CLS} />
                </Field>
                <Field label="Número de convidados">
                  <input type="number" min={1} value={reConv} onChange={(e) => setReConv(e.target.value)} className={INPUT_CLS} />
                </Field>
                <Field label="Participantes presentes">
                  <input type="number" min={0} value={rePres} onChange={(e) => setRePres(e.target.value)} className={INPUT_CLS} />
                </Field>
                <Field label="Presença da patrocinadora">
                  <select value={rePatr} onChange={(e) => setRePatr(e.target.value)} className={INPUT_CLS}>
                    <option value="0">Ausente</option>
                    <option value="1">Presente</option>
                  </select>
                </Field>
                <Field label="Decisões tomadas">
                  <input type="number" min={0} value={reDec} onChange={(e) => setReDec(e.target.value)} className={INPUT_CLS} />
                </Field>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-400"
              >
                <PlusCircle className="h-4 w-4" /> Registrar Reunião
              </button>
            </form>

            <form onSubmit={handleAddPulso} className="space-y-4 border-t border-slate-800 pt-5">
              <p className="text-xs font-semibold text-white">Pulso de Satisfação da Equipe (Sprint S15)</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Nota média de satisfação" hint="escala de 1,00 a 5,00">
                  <input type="number" step="0.01" min={1} max={5} value={pulsoVal} onChange={(e) => setPulsoVal(e.target.value)} className={INPUT_CLS} />
                </Field>
                <Field label="Quantidade de respostas">
                  <input type="number" min={1} value={pulsoResp} onChange={(e) => setPulsoResp(e.target.value)} className={INPUT_CLS} />
                </Field>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400"
                  >
                    <PlusCircle className="h-4 w-4" /> Atualizar Pulso S15
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {formTab === "SURPRESA" && (
          <form onSubmit={handleBoletimSurpresa} className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-950/10 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <Zap className="h-4 w-4" /> Lançamento Rápido — Boletim Surpresa (Apresentação Ao Vivo)
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="text-xs font-bold text-white">1. Atualizar Avanço / Atraso</div>
                <Field label="Atividade impactada">
                  <select value={surpActId} onChange={(e) => setSurpActId(e.target.value)} className={INPUT_CLS}>
                    {db["07_atividades"].map((a) => (
                      <option key={a.id_atividade} value={a.id_atividade}>
                        {a.id_atividade} — {a.nome_atividade}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Novo percentual concluído" hint="%">
                  <input type="number" min={0} max={100} value={surpAvancoPct} onChange={(e) => setSurpAvancoPct(e.target.value)} className={INPUT_CLS} />
                </Field>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="text-xs font-bold text-white">2. Registrar Mudança Aprovada</div>
                <Field label="Descrição da mudança">
                  <input value={surpSmDesc} onChange={(e) => setSurpSmDesc(e.target.value)} className={INPUT_CLS} />
                </Field>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Custo extra" hint="R$">
                    <input type="number" value={surpSmCusto} onChange={(e) => setSurpSmCusto(e.target.value)} className={INPUT_CLS} />
                  </Field>
                  <Field label="Prazo extra" hint="du">
                    <input type="number" value={surpSmPrazo} onChange={(e) => setSurpSmPrazo(e.target.value)} className={INPUT_CLS} />
                  </Field>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="text-xs font-bold text-white">3. Mover Cartão no Quadro</div>
                <Field label="Item do backlog">
                  <select value={surpCardId} onChange={(e) => setSurpCardId(e.target.value)} className={INPUT_CLS}>
                    {db["14_backlog_itens"]
                      .filter((b) => b.status !== "CONCLUIDO")
                      .map((b) => (
                        <option key={b.id_item} value={b.id_item}>
                          {b.id_item} ({b.status}) — {b.titulo}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Nova coluna no quadro">
                  <select value={surpCardDest} onChange={(e) => setSurpCardDest(e.target.value)} className={INPUT_CLS}>
                    {["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "EM_TESTE", "CONCLUIDO"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              Lançar Boletim Surpresa e Recalcular Indicadores
            </button>
          </form>
        )}
      </div>

      {/* Histórico de Lançamentos Recentes (somente leitura; exclusão fica em Configurações) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-2 text-sm font-semibold text-white">
          Histórico de Lançamentos Recentes ({auditLogs.length} registros)
        </h3>
        <div className="max-h-48 overflow-y-auto text-xs">
          {auditLogs.length === 0 ? (
            <p className="text-slate-500">Nenhum lançamento manual registrado nesta sessão ainda.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-1.5 pr-3">Hora</th>
                  <th className="py-1.5 pr-3">Responsável</th>
                  <th className="py-1.5 pr-3">Tipo</th>
                  <th className="py-1.5">Resumo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5 pr-3 font-mono text-slate-400">{l.timestamp.slice(11, 19)}</td>
                    <td className="py-1.5 pr-3 font-semibold text-sky-300">{l.registradoPor}</td>
                    <td className="py-1.5 pr-3 font-mono text-[11px]">{l.tipo}</td>
                    <td className="py-1.5 text-slate-200">{l.resumo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
