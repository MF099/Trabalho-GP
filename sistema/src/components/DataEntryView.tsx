import React, { useState } from "react";
import Papa from "papaparse";
import { Cloud, CloudDownload, Database, FileUp, PlusCircle, RotateCcw, Sparkles, UserCheck, Zap } from "lucide-react";
import { isSupabaseConfigured, pullStateFromSupabase, pushStateToSupabase } from "../lib/supabase";
import type { AuditEntry, CsvRow, ProjectDatabase, TableName } from "../types/project";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  operador: string;
  auditLogs: AuditEntry[];
  onChangeOperador: (name: string) => void;
  onChangeStatusDate: (d: string) => void;
  onUpdateDb: (nextDb: ProjectDatabase, log?: AuditEntry) => void;
  onApplyQuinzena: () => void;
  onResetBase: () => void;
}

export const DataEntryView: React.FC<Props> = ({
  db,
  statusDate,
  operador,
  auditLogs,
  onChangeOperador,
  onChangeStatusDate,
  onUpdateDb,
  onApplyQuinzena,
  onResetBase,
}) => {
  const [formTab, setFormTab] = useState<
    "SURPRESA" | "AVANCO" | "HORAS" | "CUSTOS" | "INSPECOES" | "AGIL" | "IMPLANTACOES" | "RISCO_MUD" | "REUNIOES"
  >("SURPRESA");
  const [syncMsg, setSyncMsg] = useState<string>("");

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
  const [hrPessoa, setHrPessoa] = useState("P09");
  const [hrTipo, setHrTipo] = useState("ATIVIDADE");
  const [hrItem, setHrItem] = useState("A27");
  const [hrNorm, setHrNorm] = useState("25");
  const [hrExt, setHrExt] = useState("3.5");

  // B3 Custos form
  const [ctData, setCtData] = useState("2026-11-13");
  const [ctFrente, setCtFrente] = useState("PREDITIVA");
  const [ctCat, setCtCat] = useState("OUTROS");
  const [ctAct, setCtAct] = useState("A27");
  const [ctDoc, setCtDoc] = useState("NF-A27-002");
  const [ctDesc, setCtDesc] = useState("Despesa adicional de campo");
  const [ctVal, setCtVal] = useState("4500");

  // B5/B6 Backlog / Transição form
  const [bkId, setBkId] = useState("MS-235");
  const [bkTitulo, setBkTitulo] = useState("Novo item registrado na sprint");
  const [bkEpico, setBkEpico] = useState("EP02");
  const [bkRel, setBkRel] = useState("R2");
  const [bkPts, setBkPts] = useState("3");
  const [bkOrig, setBkOrig] = useState("MUDANCA_APROVADA");

  // B8 Risco / Mudança form
  const [ocDesc, setOcDesc] = useState("Ocorrência registrada em campo");
  const [ocFrente, setOcFrente] = useState("PREDITIVA");
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

  // B7 Impedimento / Implantação form
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

  const [csvTable, setCsvTable] = useState<TableName>("18_apontamento_horas");

  const makeLog = (tipo: string, resumo: string, dados: Record<string, unknown>): AuditEntry => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    registradoPor: operador,
    tipo,
    resumo,
    dados,
  });

  const handleBoletimSurpresa = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));

    // 1. Comunicar atraso / novo avanço na atividade
    next["17_avanco_semanal"].push({
      semana_fim: statusDate,
      id_atividade: surpActId,
      avanco_acumulado_pct: surpAvancoPct,
      situacao: Number(surpAvancoPct) >= 100 ? "CONCLUIDA" : "EM_ANDAMENTO",
      data_inicio_real: "2026-10-05",
      data_termino_real: Number(surpAvancoPct) >= 100 ? statusDate : "",
      id_responsavel: "P09",
    });

    // 2. Aprovar mudança (SM)
    const smNum = next["28_mudancas_solicitacoes"].length + 1;
    const smId = `SM-${String(smNum).padStart(3, "0")}`;
    next["28_mudancas_solicitacoes"].push({
      id_mudanca: smId,
      data_abertura: statusDate,
      id_solicitante: "PI01",
      descricao: surpSmDesc,
      tipo_mudanca: "PRAZO",
      frente: "PREDITIVA",
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
        frente: "PREDITIVA",
        categoria_custo: "OUTROS",
        id_atividade: surpActId,
        codigo_eap: next["07_atividades"].find((a) => a.id_atividade === surpActId)?.codigo_eap ?? "1.5.1",
        id_contrato: "",
        id_fornecedor: "",
        documento: smId,
        descricao: `Boletim Surpresa — ${surpSmDesc}`,
        valor_rs: surpSmCusto,
      });
    }

    // 3. Mover cartão no quadro
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
      makeLog("BOLETIM_SURPRESA", `Ao vivo: ${surpActId} (${surpAvancoPct}%), ${smId} (+R$ ${surpSmCusto}), ${surpCardId} → ${surpCardDest}`, {
        surpActId, surpAvancoPct, smId, surpCardId, surpCardDest,
      })
    );
    setSyncMsg(`Boletim surpresa lançado por ${operador}! Previsões recalculadas ao vivo.`);
  };

  const handleAddAvanco = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    next["17_avanco_semanal"].push({
      semana_fim: avSem, id_atividade: avAct, avanco_acumulado_pct: avPct, situacao: avSit,
      data_inicio_real: avIni, data_termino_real: avSit === "CONCLUIDA" ? avFim || avSem : "", id_responsavel: avResp,
    });
    onUpdateDb(next, makeLog("AVANCO_SEMANAL", `${avAct} em ${avSem}: ${avPct}% (${avSit})`, { avAct, avSem, avPct }));
    setSyncMsg("Avanço semanal registrado.");
  };

  const handleAddHoras = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    next["18_apontamento_horas"].push({
      semana_inicio: hrSem, id_pessoa: hrPessoa, tipo_item: hrTipo, id_item: hrItem,
      horas_normais: hrNorm, horas_extras: hrExt,
    });
    onUpdateDb(next, makeLog("HORAS", `${hrPessoa} · ${hrTipo} ${hrItem}: ${hrNorm}h + ${hrExt}h ext`, { hrPessoa, hrItem }));
    setSyncMsg("Apontamento de horas registrado.");
  };

  const handleAddCusto = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const eap = next["07_atividades"].find((a) => a.id_atividade === ctAct)?.codigo_eap ?? "";
    next["19_custos_realizados"].push({
      id_lancamento: `L${String(next["19_custos_realizados"].length + 1).padStart(5, "0")}`,
      data: ctData, frente: ctFrente, categoria_custo: ctCat, id_atividade: ctFrente === "PREDITIVA" ? ctAct : "",
      codigo_eap: ctFrente === "PREDITIVA" ? eap : "", id_contrato: "", id_fornecedor: "",
      documento: ctDoc, descricao: ctDesc, valor_rs: ctVal,
    });
    onUpdateDb(next, makeLog("CUSTO", `${ctDoc} (${ctFrente}): R$ ${ctVal}`, { ctDoc, ctVal }));
    setSyncMsg("Custo registrado.");
  };

  const handleAddBacklog = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    next["14_backlog_itens"].push({
      id_item: bkId, id_epico: bkEpico, tipo_item: "HISTORIA", titulo: bkTitulo, historia_de_usuario: "",
      pontos: bkPts, prioridade_moscow: "MUST", valor_de_negocio: "50",
      ordem_no_backlog: String(next["14_backlog_itens"].length + 1), id_release: bkRel,
      origem: bkOrig, id_mudanca: "", id_solicitante: "", data_criacao: statusDate,
      status: "A_FAZER", id_sprint_atual: "S15", id_responsavel: "", revisao_por_par: "", data_inicio: "", data_conclusao: "",
    });
    onUpdateDb(next, makeLog("BACKLOG", `Item ${bkId} (${bkPts} pts, ${bkRel}) criado`, { bkId, bkPts }));
    setSyncMsg(`Item ${bkId} adicionado ao backlog.`);
  };

  const handleAddOcorrencia = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const ocId = `OC-${String(next["27_riscos_ocorrencias"].length + 1).padStart(3, "0")}`;
    next["27_riscos_ocorrencias"].push({
      id_ocorrencia: ocId, data: statusDate, id_risco: "", descricao: ocDesc,
      frente: ocFrente, id_atividade: ocAct, impacto_custo_real_rs: ocCusto,
      impacto_prazo_real_du: ocPrazo, custo_ja_incluido_em_pagamentos: "NAO",
    });
    onUpdateDb(next, makeLog("OCORRENCIA", `${ocId}: ${ocDesc} (R$ ${ocCusto}, +${ocPrazo} du)`, { ocId }));
    setSyncMsg(`Ocorrência ${ocId} registrada.`);
  };

  const handleAddInspecao = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const inId = `IN-${String(next["25_inspecoes_aceite"].length + 1).padStart(3, "0")}`;
    next["25_inspecoes_aceite"].push({
      id_inspecao: inId, data: inData, id_atividade: inAct, tipo_inspecao: inTipo,
      itens_verificados: inVerif, itens_nao_conformes: inNc, resultado: inRes,
      id_fornecedor: inForn, horas_retrabalho: inRetrH, custo_retrabalho_rs: inRetrRs,
    });
    onUpdateDb(next, makeLog("INSPECAO", `${inId} (${inAct}): ${inRes} · ${inNc}/${inVerif} NC`, { inId }));
    setSyncMsg(`Inspeção ${inId} registrada.`);
  };

  const handleAddImplantacao = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const impId = `IMP-${String(next["23_implantacoes"].length + 1).padStart(3, "0")}`;
    next["23_implantacoes"].push({
      id_implantacao: impId, data: impData, id_sprint: "S15", ambiente: impAmb,
      versao: impVer, itens_implantados: impItens, tempo_ate_producao_h: impTempo,
      falhou: impFalhou, tempo_restauracao_h: impFalhou === "1" ? "2.0" : "",
    });
    onUpdateDb(next, makeLog("IMPLANTACAO", `${impId} v${impVer} (${impAmb}): ${impItens} itens`, { impId }));
    setSyncMsg(`Implantação ${impId} registrada.`);
  };

  const handleAddReuniao = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
    const reId = `RE-${String(next["33_reunioes"].length + 1).padStart(3, "0")}`;
    next["33_reunioes"].push({
      id_reuniao: reId, data: reData, tipo_reuniao: reTipo, duracao_min: reDur,
      convidados: reConv, presentes: rePres, patrocinador_presente: rePatr,
      decisoes_tomadas: reDec, pendencias_abertas: "0", ata_publicada: "1",
    });
    onUpdateDb(next, makeLog("REUNIAO", `${reId} (${reTipo} em ${reData}): ${rePres}/${reConv} presentes`, { reId }));
    setSyncMsg(`Reunião ${reId} registrada.`);
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
    setSyncMsg("Pulso da sprint S15 registrado.");
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
        next[csvTable] = res.data;
        onUpdateDb(next, makeLog("IMPORT_CSV", `Importou ${res.data.length} linhas para ${csvTable}`, { table: csvTable }));
        setSyncMsg(`Importado ${file.name} (${res.data.length} linhas) em ${csvTable}.`);
      },
    });
  };

  const handlePushCloud = async () => {
    setSyncMsg("Sincronizando com Supabase...");
    const res = await pushStateToSupabase(db, statusDate, operador);
    setSyncMsg(res.message);
  };

  const handlePullCloud = async () => {
    setSyncMsg("Carregando do Supabase...");
    const res = await pullStateFromSupabase();
    if (res.ok && res.db) {
      if (res.statusDate) onChangeStatusDate(res.statusDate);
      onUpdateDb(res.db, makeLog("PULL_SUPABASE", `Base carregada da nuvem (${res.updatedBy})`, {}));
    }
    setSyncMsg(res.message);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Operador + Quinzena + Supabase */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <UserCheck className="h-4 w-4 text-sky-400" />
            Quem está lançando agora? (Exigência: ≥3 pessoas)
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={operador}
              onChange={(e) => onChangeOperador(e.target.value)}
              placeholder="Seu nome"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
            />
            {["Matheus", "Colega 2", "Colega 3"].map((n) => (
              <button
                key={n}
                onClick={() => onChangeOperador(n)}
                className={`rounded-lg px-2.5 py-1 text-xs ${operador === n ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
            <button
              onClick={onApplyQuinzena}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <Sparkles className="h-3.5 w-3.5" /> Completar/Conferir Quinzena B1–B9 (até 13/11)
            </button>
            <button
              onClick={onResetBase}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Voltar para 30/10 (CSV limpo)
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Database className="h-4 w-4 text-emerald-400" />
              Banco na Nuvem (Supabase) & Importação CSV (R1·R2)
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSupabaseConfigured ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
              {isSupabaseConfigured ? "Conectado (.env)" : "Modo Local"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handlePushCloud}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
            >
              <Cloud className="h-3.5 w-3.5" /> Salvar Estado no Supabase
            </button>
            <button
              onClick={handlePullCloud}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
            >
              <CloudDownload className="h-3.5 w-3.5" /> Carregar do Supabase
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
            <select
              value={csvTable}
              onChange={(e) => setCsvTable(e.target.value as TableName)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
            >
              {Object.keys(db).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700">
              <FileUp className="h-3.5 w-3.5" /> Importar CSV
              <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
            </label>
          </div>
          {syncMsg && <p className="mt-2 text-xs text-sky-300">{syncMsg}</p>}
        </div>
      </div>

      {/* Abas de Lançamento Manual */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { id: "SURPRESA", label: "⚡ Boletim Surpresa (Ao Vivo)" },
            { id: "AVANCO", label: "B1 · Avanço Semanal" },
            { id: "HORAS", label: "B2 · Folha de Horas" },
            { id: "CUSTOS", label: "B3 · Custos Pagos" },
            { id: "INSPECOES", label: "B4 · Inspeções" },
            { id: "AGIL", label: "B5/B6 · Backlog & Sprint" },
            { id: "IMPLANTACOES", label: "B7 · Implantações DORA" },
            { id: "RISCO_MUD", label: "B8 · Ocorrências" },
            { id: "REUNIOES", label: "B9 · Reuniões & Pulso" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFormTab(t.id as typeof formTab)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                formTab === t.id ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {formTab === "SURPRESA" && (
          <form onSubmit={handleBoletimSurpresa} className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-950/10 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <Zap className="h-4 w-4" /> Lançamento Ao Vivo do Boletim Surpresa (4 minutos na apresentação)
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-xs font-semibold text-white">1. Atraso / Avanço em Atividade</div>
                <select value={surpActId} onChange={(e) => setSurpActId(e.target.value)} className="w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white">
                  {db["07_atividades"].map((a) => (
                    <option key={a.id_atividade} value={a.id_atividade}>{a.id_atividade} — {a.nome_atividade}</option>
                  ))}
                </select>
                <input type="number" min={0} max={100} value={surpAvancoPct} onChange={(e) => setSurpAvancoPct(e.target.value)} placeholder="Avanço %" className="w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white" />
              </div>

              <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-xs font-semibold text-white">2. Mudança Aprovada (SM)</div>
                <input value={surpSmDesc} onChange={(e) => setSurpSmDesc(e.target.value)} placeholder="Descrição da mudança" className="w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={surpSmCusto} onChange={(e) => setSurpSmCusto(e.target.value)} placeholder="Custo R$" className="w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white" />
                  <input type="number" value={surpSmPrazo} onChange={(e) => setSurpSmPrazo(e.target.value)} placeholder="Prazo du" className="w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white" />
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-xs font-semibold text-white">3. Mover Cartão no Quadro</div>
                <select value={surpCardId} onChange={(e) => setSurpCardId(e.target.value)} className="w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white">
                  {db["14_backlog_itens"].filter((b) => b.status !== "CONCLUIDO").map((b) => (
                    <option key={b.id_item} value={b.id_item}>{b.id_item} ({b.status}) — {b.titulo}</option>
                  ))}
                </select>
                <select value={surpCardDest} onChange={(e) => setSurpCardDest(e.target.value)} className="w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white">
                  {["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "EM_TESTE", "CONCLUIDO"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400">
              Lançar Boletim Surpresa e Recalcular Previsão
            </button>
          </form>
        )}

        {formTab === "AVANCO" && (
          <form onSubmit={handleAddAvanco} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <input type="date" value={avSem} onChange={(e) => setAvSem(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={avAct} onChange={(e) => setAvAct(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              {db["07_atividades"].map((a) => <option key={a.id_atividade} value={a.id_atividade}>{a.id_atividade} — {a.nome_atividade}</option>)}
            </select>
            <input type="number" min={0} max={100} value={avPct} onChange={(e) => setAvPct(e.target.value)} placeholder="% Avanço" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={avSit} onChange={(e) => setAvSit(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="EM_ANDAMENTO">EM_ANDAMENTO</option>
              <option value="CONCLUIDA">CONCLUIDA</option>
            </select>
            <input type="date" value={avIni} onChange={(e) => setAvIni(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="date" value={avFim} onChange={(e) => setAvFim(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={avResp} onChange={(e) => setAvResp(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              {db["04_equipe"].map((p) => <option key={p.id_pessoa} value={p.id_pessoa}>{p.id_pessoa} {p.nome}</option>)}
            </select>
            <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white">
              <PlusCircle className="h-4 w-4" /> Registrar Avanço
            </button>
          </form>
        )}

        {formTab === "HORAS" && (
          <form onSubmit={handleAddHoras} className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <input type="date" value={hrSem} onChange={(e) => setHrSem(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={hrPessoa} onChange={(e) => setHrPessoa(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              {db["04_equipe"].map((p) => <option key={p.id_pessoa} value={p.id_pessoa}>{p.id_pessoa} {p.nome}</option>)}
            </select>
            <select value={hrTipo} onChange={(e) => setHrTipo(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="ATIVIDADE">ATIVIDADE</option>
              <option value="SPRINT">SPRINT</option>
              <option value="GESTAO">GESTAO</option>
            </select>
            <input value={hrItem} onChange={(e) => setHrItem(e.target.value)} placeholder="A27 / S15 / GESTAO" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" step="0.5" value={hrNorm} onChange={(e) => setHrNorm(e.target.value)} placeholder="Horas normais" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" step="0.5" value={hrExt} onChange={(e) => setHrExt(e.target.value)} placeholder="Horas extras" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <button type="submit" className="col-span-full inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white md:col-span-1">
              <PlusCircle className="h-4 w-4" /> Registrar Horas
            </button>
          </form>
        )}

        {formTab === "CUSTOS" && (
          <form onSubmit={handleAddCusto} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <input type="date" value={ctData} onChange={(e) => setCtData(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={ctFrente} onChange={(e) => setCtFrente(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="PREDITIVA">PREDITIVA</option>
              <option value="AGIL">AGIL</option>
              <option value="GESTAO">GESTAO</option>
            </select>
            <select value={ctCat} onChange={(e) => setCtCat(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              {["SERVICO_CONTRATADO", "EQUIPAMENTO", "MATERIAL", "LICENCAS_E_NUVEM", "OUTROS", "INDIRETO"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input value={ctAct} onChange={(e) => setCtAct(e.target.value)} placeholder="Atividade (ex: A27)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input value={ctDoc} onChange={(e) => setCtDoc(e.target.value)} placeholder="Documento (NF-...)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input value={ctDesc} onChange={(e) => setCtDesc(e.target.value)} placeholder="Descrição" className="col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" step="0.01" value={ctVal} onChange={(e) => setCtVal(e.target.value)} placeholder="Valor R$" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white">
              <PlusCircle className="h-4 w-4" /> Lançar Custo
            </button>
          </form>
        )}

        {formTab === "AGIL" && (
          <form onSubmit={handleAddBacklog} className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <input value={bkId} onChange={(e) => setBkId(e.target.value)} placeholder="ID (MS-235)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input value={bkTitulo} onChange={(e) => setBkTitulo(e.target.value)} placeholder="Título do item" className="col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={bkEpico} onChange={(e) => setBkEpico(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              {db["13_epicos"].map((ep) => <option key={ep.id_epico} value={ep.id_epico}>{ep.id_epico} — {ep.nome_epico}</option>)}
            </select>
            <select value={bkRel} onChange={(e) => setBkRel(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              {["R1", "R2", "R3"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input type="number" value={bkPts} onChange={(e) => setBkPts(e.target.value)} placeholder="Pontos" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={bkOrig} onChange={(e) => setBkOrig(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              {["MUDANCA_APROVADA", "DEFEITO", "PEDIDO_DIRETO", "PLANO_INICIAL"].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white">
              <PlusCircle className="h-4 w-4" /> Adicionar ao Backlog
            </button>
          </form>
        )}

        {formTab === "RISCO_MUD" && (
          <form onSubmit={handleAddOcorrencia} className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <input value={ocDesc} onChange={(e) => setOcDesc(e.target.value)} placeholder="Descrição da ocorrência" className="col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={ocFrente} onChange={(e) => setOcFrente(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="PREDITIVA">PREDITIVA</option>
              <option value="AGIL">AGIL</option>
            </select>
            <input value={ocAct} onChange={(e) => setOcAct(e.target.value)} placeholder="Atividade (ex: A27)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" value={ocCusto} onChange={(e) => setOcCusto(e.target.value)} placeholder="Custo R$" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" value={ocPrazo} onChange={(e) => setOcPrazo(e.target.value)} placeholder="Atraso du" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white">
              <PlusCircle className="h-4 w-4" /> Registrar Ocorrência
            </button>
          </form>
        )}

        {formTab === "INSPECOES" && (
          <form onSubmit={handleAddInspecao} className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <input type="date" value={inData} onChange={(e) => setInData(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={inAct} onChange={(e) => setInAct(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              {db["07_atividades"].map((a) => <option key={a.id_atividade} value={a.id_atividade}>{a.id_atividade} — {a.nome_atividade}</option>)}
            </select>
            <select value={inTipo} onChange={(e) => setInTipo(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="LISTA_DE_VERIFICACAO">LISTA_DE_VERIFICACAO</option>
              <option value="AUDITORIA_DOCUMENTAL">AUDITORIA_DOCUMENTAL</option>
              <option value="TESTE_DE_ACEITACAO_DO_USUARIO">TESTE_ACEITACAO</option>
            </select>
            <input type="number" value={inVerif} onChange={(e) => setInVerif(e.target.value)} placeholder="Verificados" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" value={inNc} onChange={(e) => setInNc(e.target.value)} placeholder="Não conformes" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={inRes} onChange={(e) => setInRes(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="APROVADO">APROVADO</option>
              <option value="APROVADO_COM_RESSALVA">APROVADO_COM_RESSALVA</option>
              <option value="REPROVADO">REPROVADO</option>
            </select>
            <input value={inForn} onChange={(e) => setInForn(e.target.value)} placeholder="Fornecedor (F09 ou vazio)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" step="0.1" value={inRetrH} onChange={(e) => setInRetrH(e.target.value)} placeholder="Retrabalho (h)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" step="0.01" value={inRetrRs} onChange={(e) => setInRetrRs(e.target.value)} placeholder="Custo retrabalho R$" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white">
              <PlusCircle className="h-4 w-4" /> Registrar Inspeção
            </button>
          </form>
        )}

        {formTab === "IMPLANTACOES" && (
          <form onSubmit={handleAddImplantacao} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <input type="date" value={impData} onChange={(e) => setImpData(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={impAmb} onChange={(e) => setImpAmb(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="PRODUCAO">PRODUCAO</option>
              <option value="HOMOLOGACAO">HOMOLOGACAO</option>
            </select>
            <input value={impVer} onChange={(e) => setImpVer(e.target.value)} placeholder="Versão (ex: 1.61)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" value={impItens} onChange={(e) => setImpItens(e.target.value)} placeholder="Itens implantados" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input type="number" step="0.1" value={impTempo} onChange={(e) => setImpTempo(e.target.value)} placeholder="Tempo publicação (h)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <select value={impFalhou} onChange={(e) => setImpFalhou(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="0">Sem falha</option>
              <option value="1">Falhou</option>
            </select>
            <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white">
              <PlusCircle className="h-4 w-4" /> Registrar Implantação
            </button>
          </form>
        )}

        {formTab === "REUNIOES" && (
          <div className="space-y-4">
            <form onSubmit={handleAddReuniao} className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <input type="date" value={reData} onChange={(e) => setReData(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
              <select value={reTipo} onChange={(e) => setReTipo(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
                {["STATUS_SEMANAL", "COMITE_DIRETOR", "PLANEJAMENTO_DA_SPRINT", "REVISAO_DA_SPRINT", "RETROSPECTIVA"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input type="number" value={reDur} onChange={(e) => setReDur(e.target.value)} placeholder="Duração (min)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
              <input type="number" value={reConv} onChange={(e) => setReConv(e.target.value)} placeholder="Convidados" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
              <input type="number" value={rePres} onChange={(e) => setRePres(e.target.value)} placeholder="Presentes" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
              <select value={rePatr} onChange={(e) => setRePatr(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
                <option value="0">Patrocinador ausente</option>
                <option value="1">Patrocinador presente</option>
              </select>
              <input type="number" value={reDec} onChange={(e) => setReDec(e.target.value)} placeholder="Decisões" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
              <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white">
                <PlusCircle className="h-4 w-4" /> Registrar Reunião
              </button>
            </form>

            <form onSubmit={handleAddPulso} className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-3">
              <input type="number" step="0.01" value={pulsoVal} onChange={(e) => setPulsoVal(e.target.value)} placeholder="Pulso S15 (1 a 5)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
              <input type="number" value={pulsoResp} onChange={(e) => setPulsoResp(e.target.value)} placeholder="Respostas" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
              <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white">
                <PlusCircle className="h-4 w-4" /> Registrar Pulso S15
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Histórico de Lançamentos por Membro */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-2 text-sm font-semibold text-white">
          Trilha de Auditoria de Lançamentos pelas Telas ({auditLogs.length} registros)
        </h3>
        <div className="max-h-48 overflow-y-auto text-xs">
          {auditLogs.length === 0 ? (
            <p className="text-slate-500">Nenhum lançamento manual registrado nesta sessão ainda.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-1.5">Hora</th>
                  <th className="py-1.5">Responsável</th>
                  <th className="py-1.5">Tipo</th>
                  <th className="py-1.5">Resumo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5 font-mono text-slate-400">{l.timestamp.slice(11, 19)}</td>
                    <td className="py-1.5 font-semibold text-sky-300">{l.registradoPor}</td>
                    <td className="py-1.5 font-mono text-[11px]">{l.tipo}</td>
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
