import type { AuditEntry, ProjectDatabase } from "../types/project";

/**
 * Aplica os Boletins B1-B9 do Dossiê do Grupo 3 (Quinzena de campo: 03 a 13/11/2026)
 * quando o grupo valida/completa a quinzena ou confere os totais de 13/11.
 * Na apresentação e entrega, o grupo também pode lançar cada registro manualmente pelas telas (R3).
 */
export function applyQuinzenaBoletins(
  db: ProjectDatabase,
  operadores: [string, string, string] = ["Membro 1", "Membro 2", "Membro 3"]
): { nextDb: ProjectDatabase; logs: AuditEntry[] } {
  const next: ProjectDatabase = JSON.parse(JSON.stringify(db));
  const logs: AuditEntry[] = [];
  const now = new Date().toISOString();

  // B1. Avanço semanal (5 linhas)
  const b1Rows = [
    { semana_fim: "2026-11-06", id_atividade: "A27", avanco_acumulado_pct: "60", situacao: "EM_ANDAMENTO", data_inicio_real: "2026-10-05", data_termino_real: "", id_responsavel: "P09" },
    { semana_fim: "2026-11-06", id_atividade: "A29", avanco_acumulado_pct: "25", situacao: "EM_ANDAMENTO", data_inicio_real: "2026-10-22", data_termino_real: "", id_responsavel: "P09" },
    { semana_fim: "2026-11-06", id_atividade: "A34", avanco_acumulado_pct: "100", situacao: "CONCLUIDA", data_inicio_real: "2026-10-27", data_termino_real: "2026-11-04", id_responsavel: "P09" },
    { semana_fim: "2026-11-13", id_atividade: "A27", avanco_acumulado_pct: "75", situacao: "EM_ANDAMENTO", data_inicio_real: "2026-10-05", data_termino_real: "", id_responsavel: "P09" },
    { semana_fim: "2026-11-13", id_atividade: "A29", avanco_acumulado_pct: "35", situacao: "EM_ANDAMENTO", data_inicio_real: "2026-10-22", data_termino_real: "", id_responsavel: "P09" },
  ];
  for (const r of b1Rows) {
    if (!next["17_avanco_semanal"].some((x) => x.semana_fim === r.semana_fim && x.id_atividade === r.id_atividade)) {
      next["17_avanco_semanal"].push(r);
    }
  }
  logs.push({ id: "B1", timestamp: now, registradoPor: operadores[0], tipo: "B1_AVANCO", resumo: "5 informes semanais (06/11 e 13/11: A27, A29, A34 concluída)", dados: { count: 5 } });

  // B2. Folhas de horas (23 linhas = 740h)
  const b2Rows = [
    ["2026-11-02", "P01", "GESTAO", "GESTAO", "32.0", "0.0"],
    ["2026-11-02", "P02", "GESTAO", "GESTAO", "32.0", "0.0"],
    ["2026-11-02", "P09", "ATIVIDADE", "A27", "15.5", "7.5"],
    ["2026-11-02", "P09", "ATIVIDADE", "A29", "9.5", "4.0"],
    ["2026-11-02", "P09", "ATIVIDADE", "A34", "7.0", "3.0"],
    ["2026-11-02", "P11", "SPRINT", "S15", "32.0", "0.0"],
    ["2026-11-02", "P12", "SPRINT", "S15", "32.0", "0.0"],
    ["2026-11-02", "P13", "SPRINT", "S15", "32.0", "0.0"],
    ["2026-11-02", "P15", "SPRINT", "S15", "32.0", "0.0"],
    ["2026-11-02", "P16", "SPRINT", "S15", "32.0", "0.0"],
    ["2026-11-02", "P17", "SPRINT", "S15", "32.0", "0.0"],
    ["2026-11-02", "P18", "SPRINT", "S15", "32.0", "0.0"],
    ["2026-11-09", "P01", "GESTAO", "GESTAO", "40.0", "0.0"],
    ["2026-11-09", "P02", "GESTAO", "GESTAO", "40.0", "0.0"],
    ["2026-11-09", "P09", "ATIVIDADE", "A27", "25.0", "3.5"],
    ["2026-11-09", "P09", "ATIVIDADE", "A29", "15.0", "2.0"],
    ["2026-11-09", "P11", "SPRINT", "S15", "40.0", "0.0"],
    ["2026-11-09", "P12", "SPRINT", "S15", "40.0", "0.0"],
    ["2026-11-09", "P13", "SPRINT", "S15", "40.0", "0.0"],
    ["2026-11-09", "P15", "SPRINT", "S15", "40.0", "0.0"],
    ["2026-11-09", "P16", "SPRINT", "S15", "40.0", "0.0"],
    ["2026-11-09", "P17", "SPRINT", "S15", "40.0", "0.0"],
    ["2026-11-09", "P18", "SPRINT", "S15", "40.0", "0.0"],
  ];
  for (const [semana_inicio, id_pessoa, tipo_item, id_item, horas_normais, horas_extras] of b2Rows) {
    if (!next["18_apontamento_horas"].some((x) => x.semana_inicio === semana_inicio && x.id_pessoa === id_pessoa && x.tipo_item === tipo_item && x.id_item === id_item)) {
      next["18_apontamento_horas"].push({ semana_inicio, id_pessoa, tipo_item, id_item, horas_normais, horas_extras });
    }
  }
  logs.push({ id: "B2", timestamp: now, registradoPor: operadores[0], tipo: "B2_HORAS", resumo: "23 apontamentos das semanas 02/11 e 09/11 (+740,0 h)", dados: { count: 23 } });

  // B3. Custos pagos na quinzena (4 lançamentos)
  const b3Rows = [
    { id_lancamento: "L00118", data: "2026-11-04", frente: "PREDITIVA", categoria_custo: "OUTROS", id_atividade: "A27", codigo_eap: "1.5.1", id_contrato: "", id_fornecedor: "", documento: "NF-A27-001", descricao: "Taxas, viagens e despesas — Conduzir o piloto com 40 oficinas credenciadas e 25 corretores", valor_rs: "30975.96" },
    { id_lancamento: "L00119", data: "2026-11-07", frente: "GESTAO", categoria_custo: "INDIRETO", id_atividade: "", codigo_eap: "", id_contrato: "", id_fornecedor: "", documento: "NF-GES-2611-45", descricao: "Escritório do projeto, veículos e comunicação", valor_rs: "8035.22" },
    { id_lancamento: "L00120", data: "2026-11-10", frente: "AGIL", categoria_custo: "LICENCAS_E_NUVEM", id_atividade: "", codigo_eap: "", id_contrato: "CT02", id_fornecedor: "F02", documento: "NF-NUV-2611", descricao: "Nuvem, licenças e ferramentas do time", valor_rs: "44599.44" },
    { id_lancamento: "L00121", data: "2026-11-13", frente: "GESTAO", categoria_custo: "INDIRETO", id_atividade: "", codigo_eap: "", id_contrato: "", id_fornecedor: "", documento: "NF-GES-2611-30", descricao: "Seguros, taxas e auditorias", valor_rs: "5256.75" },
  ];
  for (const r of b3Rows) {
    if (!next["19_custos_realizados"].some((x) => x.documento === r.documento)) {
      next["19_custos_realizados"].push(r);
    }
  }
  logs.push({ id: "B3", timestamp: now, registradoPor: operadores[1], tipo: "B3_CUSTOS", resumo: "4 pagamentos da quinzena (+R$ 88.867,37)", dados: { count: 4 } });

  // B4. Inspeções (3 linhas)
  const b4Rows = [
    { id_inspecao: "IN-056", data: "2026-11-04", id_atividade: "A29", tipo_inspecao: "LISTA_DE_VERIFICACAO", itens_verificados: "50", itens_nao_conformes: "1", resultado: "APROVADO", id_fornecedor: "F09", horas_retrabalho: "4.1", custo_retrabalho_rs: "450.59" },
    { id_inspecao: "IN-057", data: "2026-11-04", id_atividade: "A34", tipo_inspecao: "LISTA_DE_VERIFICACAO", itens_verificados: "38", itens_nao_conformes: "0", resultado: "APROVADO", id_fornecedor: "", horas_retrabalho: "0.0", custo_retrabalho_rs: "0.00" },
    { id_inspecao: "IN-058", data: "2026-11-11", id_atividade: "A27", tipo_inspecao: "LISTA_DE_VERIFICACAO", itens_verificados: "26", itens_nao_conformes: "2", resultado: "APROVADO_COM_RESSALVA", id_fornecedor: "", horas_retrabalho: "10.6", custo_retrabalho_rs: "1527.91" },
  ];
  for (const r of b4Rows) {
    if (!next["25_inspecoes_aceite"].some((x) => x.id_inspecao === r.id_inspecao)) {
      next["25_inspecoes_aceite"].push(r);
    }
  }

  // B5. Sprint S15 + 5 novos itens MS-230..MS-234 + 5 defeitos DF-035..DF-039
  const s15 = next["15_sprints"].find((s) => s.id_sprint === "S15");
  if (s15) {
    s15.pessoas_dia_disponiveis = "27";
    s15.horas_extras_autorizadas = "NAO";
    s15.meta_da_sprint = "Avançar o épico Vistoria por foto";
  }
  const newBacklog = [
    { id_item: "MS-230", id_epico: "EP07", tipo_item: "BUG", titulo: "Corrigir a falha em: Criar um cupom para o evento de lançamento (erro 1)", historia_de_usuario: "", pontos: "1", prioridade_moscow: "MUST", valor_de_negocio: "30", ordem_no_backlog: "130", id_release: "R2", origem: "DEFEITO", id_mudanca: "", id_solicitante: "", data_criacao: "2026-11-05", status: "A_FAZER", id_sprint_atual: "", id_responsavel: "", revisao_por_par: "", data_inicio: "", data_conclusao: "" },
    { id_item: "MS-231", id_epico: "EP07", tipo_item: "BUG", titulo: "Corrigir a falha em: Criar um cupom para o evento de lançamento (erro n)", historia_de_usuario: "", pontos: "1", prioridade_moscow: "MUST", valor_de_negocio: "30", ordem_no_backlog: "131", id_release: "R2", origem: "DEFEITO", id_mudanca: "", id_solicitante: "", data_criacao: "2026-11-05", status: "EM_REVISAO", id_sprint_atual: "S15", id_responsavel: "P15", revisao_por_par: "1", data_inicio: "2026-11-13", data_conclusao: "" },
    { id_item: "MS-232", id_epico: "EP07", tipo_item: "BUG", titulo: "Corrigir a falha em: Criar um cupom para o evento de lançamento (erro 3)", historia_de_usuario: "", pontos: "1", prioridade_moscow: "MUST", valor_de_negocio: "20", ordem_no_backlog: "132", id_release: "R2", origem: "DEFEITO", id_mudanca: "", id_solicitante: "", data_criacao: "2026-11-05", status: "A_FAZER", id_sprint_atual: "", id_responsavel: "", revisao_por_par: "", data_inicio: "", data_conclusao: "" },
    { id_item: "MS-233", id_epico: "EP07", tipo_item: "BUG", titulo: "Corrigir a falha em: Criar um cupom para o evento de lançamento (erro 4)", historia_de_usuario: "", pontos: "2", prioridade_moscow: "MUST", valor_de_negocio: "20", ordem_no_backlog: "133", id_release: "R2", origem: "DEFEITO", id_mudanca: "", id_solicitante: "", data_criacao: "2026-11-12", status: "A_FAZER", id_sprint_atual: "", id_responsavel: "", revisao_por_par: "", data_inicio: "", data_conclusao: "" },
    { id_item: "MS-234", id_epico: "EP07", tipo_item: "BUG", titulo: "Corrigir a falha em: Criar um cupom para o evento de lançamento (tela t)", historia_de_usuario: "", pontos: "2", prioridade_moscow: "MUST", valor_de_negocio: "35", ordem_no_backlog: "134", id_release: "R2", origem: "DEFEITO", id_mudanca: "", id_solicitante: "", data_criacao: "2026-11-13", status: "EM_ANDAMENTO", id_sprint_atual: "S15", id_responsavel: "P18", revisao_por_par: "", data_inicio: "2026-11-13", data_conclusao: "" },
  ];
  for (const r of newBacklog) {
    if (!next["14_backlog_itens"].some((x) => x.id_item === r.id_item)) next["14_backlog_itens"].push(r);
  }
  const newDefs = [
    { id_defeito: "DF-035", id_item_defeito: "MS-230", id_item_origem: "MS-222", severidade: "MEDIA", ambiente_detectado: "HOMOLOGACAO", data_abertura: "2026-11-05", data_resolucao: "" },
    { id_defeito: "DF-036", id_item_defeito: "MS-231", id_item_origem: "MS-222", severidade: "MEDIA", ambiente_detectado: "HOMOLOGACAO", data_abertura: "2026-11-05", data_resolucao: "" },
    { id_defeito: "DF-037", id_item_defeito: "MS-232", id_item_origem: "MS-222", severidade: "BAIXA", ambiente_detectado: "HOMOLOGACAO", data_abertura: "2026-11-05", data_resolucao: "" },
    { id_defeito: "DF-038", id_item_defeito: "MS-233", id_item_origem: "MS-222", severidade: "BAIXA", ambiente_detectado: "TESTE", data_abertura: "2026-11-12", data_resolucao: "" },
    { id_defeito: "DF-039", id_item_defeito: "MS-234", id_item_origem: "MS-222", severidade: "MEDIA", ambiente_detectado: "PRODUCAO", data_abertura: "2026-11-13", data_resolucao: "" },
  ];
  for (const r of newDefs) {
    if (!next["24_defeitos"].some((x) => x.id_defeito === r.id_defeito)) next["24_defeitos"].push(r);
  }

  const s15Items: [string, string, string, string][] = [
    ["MS-158", "3", "TRANSBORDO", "0"],
    ["MS-223", "1", "TRANSBORDO", "1"],
    ["MS-224", "8", "TRANSBORDO", "0"],
    ["MS-227", "1", "TRANSBORDO", "1"],
    ["MS-228", "2", "TRANSBORDO", "1"],
    ["MS-159", "5", "PLANEJAMENTO", "1"],
    ["MS-160", "8", "PLANEJAMENTO", "0"],
    ["MS-161", "3", "PLANEJAMENTO", "0"],
    ["MS-231", "1", "ADICIONADO_DURANTE", "0"],
    ["MS-234", "2", "ADICIONADO_DURANTE", "0"],
  ];
  for (const [id_item, pontos, origem_na_sprint, concluido_na_sprint] of s15Items) {
    if (!next["20_sprint_itens"].some((x) => x.id_sprint === "S15" && x.id_item === id_item)) {
      next["20_sprint_itens"].push({ id_sprint: "S15", id_item, pontos, origem_na_sprint, concluido_na_sprint });
    }
  }

  // B6. 27 transições + atualização dos status no backlog
  const b6Moves: [string, string, string, string, string][] = [
    ["2026-11-03", "MS-159", "A_FAZER", "EM_ANDAMENTO", "P16"],
    ["2026-11-03", "MS-223", "EM_REVISAO", "EM_TESTE", "P16"],
    ["2026-11-03", "MS-223", "EM_TESTE", "CONCLUIDO", "P17"],
    ["2026-11-05", "MS-158", "EM_ANDAMENTO", "EM_REVISAO", "P18"],
    ["2026-11-05", "MS-158", "EM_REVISAO", "EM_TESTE", "P18"],
    ["2026-11-05", "MS-158", "EM_TESTE", "EM_ANDAMENTO", "P17"],
    ["2026-11-06", "MS-228", "EM_ANDAMENTO", "EM_REVISAO", "P18"],
    ["2026-11-09", "MS-227", "EM_ANDAMENTO", "EM_REVISAO", "P18"],
    ["2026-11-09", "MS-227", "EM_REVISAO", "EM_TESTE", "P18"],
    ["2026-11-09", "MS-228", "EM_REVISAO", "EM_TESTE", "P18"],
    ["2026-11-09", "MS-227", "EM_TESTE", "CONCLUIDO", "P17"],
    ["2026-11-09", "MS-228", "EM_TESTE", "CONCLUIDO", "P17"],
    ["2026-11-10", "MS-159", "EM_ANDAMENTO", "EM_REVISAO", "P16"],
    ["2026-11-10", "MS-158", "EM_ANDAMENTO", "EM_REVISAO", "P18"],
    ["2026-11-11", "MS-224", "EM_ANDAMENTO", "EM_REVISAO", "P15"],
    ["2026-11-11", "MS-160", "A_FAZER", "EM_ANDAMENTO", "P16"],
    ["2026-11-11", "MS-161", "A_FAZER", "EM_ANDAMENTO", "P18"],
    ["2026-11-11", "MS-158", "EM_REVISAO", "EM_TESTE", "P18"],
    ["2026-11-11", "MS-159", "EM_REVISAO", "EM_TESTE", "P16"],
    ["2026-11-11", "MS-224", "EM_REVISAO", "EM_TESTE", "P15"],
    ["2026-11-11", "MS-158", "EM_TESTE", "EM_ANDAMENTO", "P17"],
    ["2026-11-12", "MS-158", "EM_ANDAMENTO", "EM_REVISAO", "P15"],
    ["2026-11-12", "MS-158", "EM_REVISAO", "EM_TESTE", "P15"],
    ["2026-11-12", "MS-159", "EM_TESTE", "CONCLUIDO", "P17"],
    ["2026-11-13", "MS-231", "A_FAZER", "EM_ANDAMENTO", "P15"],
    ["2026-11-13", "MS-231", "EM_ANDAMENTO", "EM_REVISAO", "P15"],
    ["2026-11-13", "MS-234", "A_FAZER", "EM_ANDAMENTO", "P18"],
  ];
  if (next["21_itens_transicoes"].length === 452) {
    b6Moves.forEach(([data, id_item, status_origem, status_destino, id_pessoa], idx) => {
      next["21_itens_transicoes"].push({
        id_transicao: `TR-${String(453 + idx).padStart(4, "0")}`,
        id_item,
        data,
        status_origem,
        status_destino,
        id_pessoa,
      });
    });
  }
  const updateBacklogStatus = (id: string, status: string, dataInicio?: string, dataConc?: string, resp?: string) => {
    const b = next["14_backlog_itens"].find((x) => x.id_item === id);
    if (b) {
      b.status = status;
      b.id_sprint_atual = "S15";
      if (dataInicio && !b.data_inicio) b.data_inicio = dataInicio;
      if (dataConc) b.data_conclusao = dataConc;
      if (resp) b.id_responsavel = resp;
    }
  };
  updateBacklogStatus("MS-223", "CONCLUIDO", undefined, "2026-11-03", "P17");
  updateBacklogStatus("MS-227", "CONCLUIDO", undefined, "2026-11-09", "P17");
  updateBacklogStatus("MS-228", "CONCLUIDO", undefined, "2026-11-09", "P17");
  updateBacklogStatus("MS-159", "CONCLUIDO", "2026-11-03", "2026-11-12", "P17");
  updateBacklogStatus("MS-158", "EM_TESTE", undefined, undefined, "P15");
  updateBacklogStatus("MS-224", "EM_TESTE", undefined, undefined, "P15");
  updateBacklogStatus("MS-160", "EM_ANDAMENTO", "2026-11-11", undefined, "P16");
  updateBacklogStatus("MS-161", "EM_ANDAMENTO", "2026-11-11", undefined, "P18");
  logs.push({ id: "B5B6", timestamp: now, registradoPor: operadores[1], tipo: "B5B6_AGIL", resumo: "Sprint S15 executada: 5 bugs, 27 transições, 4 concluídos (9 pts)", dados: { sprints: "S15" } });

  // B7. Impedimentos e implantações
  const ip14 = { id_impedimento: "IP-014", id_item: "MS-161", data_abertura: "2026-11-12", data_fechamento: "", tipo_impedimento: "AGUARDANDO_OUTRO_TIME", dias_uteis_bloqueado: "", id_pessoa: "P18" };
  if (!next["22_impedimentos"].some((x) => x.id_impedimento === "IP-014")) next["22_impedimentos"].push(ip14);
  const ip12 = next["22_impedimentos"].find((x) => x.id_impedimento === "IP-012");
  if (ip12) { ip12.data_fechamento = "2026-11-06"; ip12.dias_uteis_bloqueado = "6"; }
  const ip13 = next["22_impedimentos"].find((x) => x.id_impedimento === "IP-013");
  if (ip13) { ip13.data_fechamento = "2026-11-06"; ip13.dias_uteis_bloqueado = "5"; }

  const b7Impls = [
    { id_implantacao: "IMP-055", data: "2026-11-03", id_sprint: "S15", ambiente: "HOMOLOGACAO", versao: "1.55", itens_implantados: "5", tempo_ate_producao_h: "47.4", falhou: "0", tempo_restauracao_h: "" },
    { id_implantacao: "IMP-056", data: "2026-11-04", id_sprint: "S15", ambiente: "HOMOLOGACAO", versao: "1.56", itens_implantados: "5", tempo_ate_producao_h: "21.2", falhou: "0", tempo_restauracao_h: "" },
    { id_implantacao: "IMP-057", data: "2026-11-04", id_sprint: "S15", ambiente: "PRODUCAO", versao: "1.57", itens_implantados: "3", tempo_ate_producao_h: "20.1", falhou: "0", tempo_restauracao_h: "" },
    { id_implantacao: "IMP-058", data: "2026-11-05", id_sprint: "S15", ambiente: "HOMOLOGACAO", versao: "1.58", itens_implantados: "5", tempo_ate_producao_h: "28.5", falhou: "0", tempo_restauracao_h: "" },
    { id_implantacao: "IMP-059", data: "2026-11-06", id_sprint: "S15", ambiente: "HOMOLOGACAO", versao: "1.59", itens_implantados: "1", tempo_ate_producao_h: "15.0", falhou: "0", tempo_restauracao_h: "" },
    { id_implantacao: "IMP-060", data: "2026-11-06", id_sprint: "S15", ambiente: "PRODUCAO", versao: "1.60", itens_implantados: "4", tempo_ate_producao_h: "31.4", falhou: "0", tempo_restauracao_h: "" },
    { id_implantacao: "IMP-061", data: "2026-11-11", id_sprint: "S15", ambiente: "PRODUCAO", versao: "1.61", itens_implantados: "3", tempo_ate_producao_h: "50.2", falhou: "0", tempo_restauracao_h: "" },
  ];
  for (const r of b7Impls) {
    if (!next["23_implantacoes"].some((x) => x.id_implantacao === r.id_implantacao)) next["23_implantacoes"].push(r);
  }

  // B8. Ocorrência OC-008
  if (!next["27_riscos_ocorrencias"].some((x) => x.id_ocorrencia === "OC-008")) {
    next["27_riscos_ocorrencias"].push({
      id_ocorrencia: "OC-008",
      data: "2026-11-09",
      id_risco: "",
      descricao: "Credencial exposta em repositório de código",
      frente: "PREDITIVA",
      id_atividade: "A27",
      impacto_custo_real_rs: "2900.00",
      impacto_prazo_real_du: "4",
      custo_ja_incluido_em_pagamentos: "NAO",
    });
  }

  // B9. Reuniões, engajamento nov, pulso S15, funil piloto
  const b9Reunioes = [
    { id_reuniao: "RE-087", data: "2026-11-03", tipo_reuniao: "PLANEJAMENTO_DA_SPRINT", duracao_min: "120", convidados: "8", presentes: "8", patrocinador_presente: "0", decisoes_tomadas: "1", pendencias_abertas: "0", ata_publicada: "1" },
    { id_reuniao: "RE-088", data: "2026-11-03", tipo_reuniao: "STATUS_SEMANAL", duracao_min: "75", convidados: "9", presentes: "8", patrocinador_presente: "0", decisoes_tomadas: "1", pendencias_abertas: "3", ata_publicada: "0" },
    { id_reuniao: "RE-089", data: "2026-11-10", tipo_reuniao: "STATUS_SEMANAL", duracao_min: "90", convidados: "11", presentes: "9", patrocinador_presente: "0", decisoes_tomadas: "0", pendencias_abertas: "5", ata_publicada: "1" },
    { id_reuniao: "RE-090", data: "2026-11-12", tipo_reuniao: "COMITE_DIRETOR", duracao_min: "120", convidados: "6", presentes: "4", patrocinador_presente: "1", decisoes_tomadas: "3", pendencias_abertas: "3", ata_publicada: "1" },
    { id_reuniao: "RE-091", data: "2026-11-13", tipo_reuniao: "RETROSPECTIVA", duracao_min: "60", convidados: "8", presentes: "8", patrocinador_presente: "0", decisoes_tomadas: "1", pendencias_abertas: "1", ata_publicada: "1" },
    { id_reuniao: "RE-092", data: "2026-11-13", tipo_reuniao: "REVISAO_DA_SPRINT", duracao_min: "60", convidados: "11", presentes: "10", patrocinador_presente: "0", decisoes_tomadas: "0", pendencias_abertas: "3", ata_publicada: "1" },
  ];
  for (const r of b9Reunioes) {
    if (!next["33_reunioes"].some((x) => x.id_reuniao === r.id_reuniao)) next["33_reunioes"].push(r);
  }
  const b9Eng = [
    ["PI01", "NEUTRO", "6.0", "1"], ["PI02", "RESISTENTE", "2.7", "0"], ["PI03", "APOIA", "8.0", "3"],
    ["PI04", "LIDERA", "8.7", "5"], ["PI05", "APOIA", "7.4", "4"], ["PI06", "NEUTRO", "5.1", "3"],
    ["PI07", "APOIA", "7.9", "5"], ["PI08", "APOIA", "7.7", "5"], ["PI09", "APOIA", "6.6", "4"],
    ["PI10", "APOIA", "8.0", "4"], ["PI11", "NEUTRO", "6.6", "3"], ["PI12", "APOIA", "8.2", "4"],
    ["PI13", "APOIA", "7.4", "2"],
  ];
  for (const [id_parte, nivel_engajamento, satisfacao, interacoes_no_mes] of b9Eng) {
    if (!next["34_engajamento_mensal"].some((x) => x.mes === "2026-11-01" && x.id_parte === id_parte)) {
      next["34_engajamento_mensal"].push({ mes: "2026-11-01", id_parte, nivel_engajamento, satisfacao, interacoes_no_mes });
    }
  }
  if (!next["35_pulso_equipe"].some((x) => x.id_sprint === "S15")) {
    next["35_pulso_equipe"].push({ id_sprint: "S15", satisfacao_media: "3.94", respostas: "6" });
  }
  const b9Funil = [
    { semana_inicio: "2026-11-02", alcance: "2256", cadastros: "416", ativados: "231", ativos_na_semana: "1192", retidos_4_semanas: "446", receita_rs: "0.00", indicacoes: "35", nps: "46", chamados_suporte: "46" },
    { semana_inicio: "2026-11-09", semana_fim: "", alcance: "2289", cadastros: "424", ativados: "245", ativos_na_semana: "1192", retidos_4_semanas: "531", receita_rs: "0.00", indicacoes: "31", nps: "55", chamados_suporte: "48" },
  ];
  for (const r of b9Funil) {
    if (!next["37_funil_piloto_semanal"].some((x) => x.semana_inicio === r.semana_inicio)) {
      next["37_funil_piloto_semanal"].push({
        semana_inicio: r.semana_inicio, alcance: r.alcance, cadastros: r.cadastros, ativados: r.ativados,
        ativos_na_semana: r.ativos_na_semana, retidos_4_semanas: r.retidos_4_semanas, receita_rs: r.receita_rs,
        indicacoes: r.indicacoes, nps: r.nps, chamados_suporte: r.chamados_suporte,
      });
    }
  }
  logs.push({ id: "B7B9", timestamp: now, registradoPor: operadores[2], tipo: "B7B9_OPERACAO", resumo: "Impedimentos, 7 implantações, OC-008, 6 reuniões, engajamento nov, pulso S15 e funil", dados: { count: 29 } });

  return { nextDb: next, logs };
}
