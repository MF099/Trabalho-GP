import type { CsvRow, ProjectDatabase } from "../types/project";
import { addDaysIso, num, type CalendarHelpers, getParamMap } from "./calculations";

// ============================================================================
// CONVENÇÕES 17, 18, 19, 20: PESSOAS, FOLHA, ALOCAÇÃO, REAJUSTE E PRODUTIVIDADE
// ============================================================================
export interface PersonStats {
  id: string;
  nome: string;
  papel: string;
  frente: string;
  disciplina: string;
  vinculo: string;
  custoHora: number;
  custoMensal: number;
  alocacaoPct: number;
  horasNormais: number;
  horasExtras: number;
  horasTotais: number;
  custoTotalProjeto: number;
  capacidadeHoras: number;
  utilizacaoPct: number;
  desvioAlocacaoMesesFechados: number;
  impactoReajusteRs: number;
  pontosConcluidosAgil: number;
  horasSprintAgil: number;
  pontosPorHora: number | null;
  custoPorPonto: number | null;
  meses: { mes: string; planejado: number; apontado: number; desvioPct: number }[];
}

export function computePeopleAndProductivity(
  db: ProjectDatabase,
  statusDate: string,
  forecastEndDate: string,
  calH: CalendarHelpers
) {
  const params = getParamMap(db);
  const fatorHe = num(params.fator_hora_extra, 1.5);
  const horasPorDia = num(params.horas_por_dia, 8);
  const folhaMap = new Map(db["39_cargos_salarios"].map((f) => [f.id_pessoa, f]));
  const alocList = db["40_alocacao_planejada"];

  // Horas apontadas em semanas encerradas até statusDate
  const horasValidas = db["18_apontamento_horas"].filter(
    (h) => addDaysIso(h.semana_inicio, 4) <= statusDate
  );

  // Meses fechados até statusDate (se statusDate = 2026-11-13, meses fechados são <= 2026-10)
  const statusYm = statusDate.slice(0, 7);
  const lastDayOfMonth = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(Date.UTC(y, m, 0));
    return d.toISOString().slice(0, 10);
  };
  const isMonthClosed = (ym: string) => lastDayOfMonth(ym) <= statusDate;

  // Pontos concluídos por responsável (itens concluídos até statusDate)
  const ptsByDev = new Map<string, number>();
  for (const b of db["14_backlog_itens"]) {
    if (b.status === "CONCLUIDO" && (!b.data_conclusao || b.data_conclusao <= statusDate) && b.id_responsavel) {
      ptsByDev.set(b.id_responsavel, (ptsByDev.get(b.id_responsavel) ?? 0) + num(b.pontos));
    }
  }

  const people: PersonStats[] = db["04_equipe"].map((p) => {
    const pid = p.id_pessoa;
    const f = folhaMap.get(pid);
    const rem = f ? num(f.remuneracao_mensal_rs) : 0;
    const encRaw = f ? num(f.encargos_pct) : 0;
    const enc = encRaw > 1 ? encRaw / 100 : encRaw;
    const ben = f ? num(f.beneficios_mensais_rs) : 0;
    const custoMensal = rem * (1 + enc) + ben;
    const custoHora = num(p.custo_hora_rs);

    const pHoras = horasValidas.filter((h) => h.id_pessoa === pid);
    const horasNormais = pHoras.reduce((a, h) => a + num(h.horas_normais), 0);
    const horasExtras = pHoras.reduce((a, h) => a + num(h.horas_extras), 0);
    const horasTotais = horasNormais + horasExtras;
    const custoTotalProjeto = (horasNormais + horasExtras * fatorHe) * custoHora;

    const pEnd = p.data_saida && p.data_saida < statusDate ? p.data_saida : statusDate;
    const duNoProj = Math.max(0, calH.countWorkingDaysBetween(p.data_entrada, pEnd));
    const alocacaoPct = num(p.alocacao_pct, 100);
    const capacidadeHoras = duNoProj * horasPorDia * (alocacaoPct / 100);
    const utilizacaoPct = capacidadeHoras > 0 ? (horasTotais / capacidadeHoras) * 100 : 0;

    // Mes a mes: alocação planejada x apontada (semana pertence ao mês de semana_inicio)
    const hoursByYm = new Map<string, number>();
    for (const h of pHoras) {
      const ym = h.semana_inicio.slice(0, 7);
      hoursByYm.set(ym, (hoursByYm.get(ym) ?? 0) + num(h.horas_normais) + num(h.horas_extras));
    }
    const planByYm = new Map<string, number>();
    for (const al of alocList.filter((a) => a.id_pessoa === pid)) {
      planByYm.set(al.mes.slice(0, 7), num(al.horas_planejadas));
    }
    const allYms = Array.from(new Set([...hoursByYm.keys(), ...planByYm.keys()]))
      .filter((ym) => ym <= statusYm)
      .sort();

    let desvioAlocacaoMesesFechados = 0;
    const meses = allYms.map((ym) => {
      const plan = planByYm.get(ym) ?? 0;
      const apont = hoursByYm.get(ym) ?? 0;
      if (isMonthClosed(ym)) desvioAlocacaoMesesFechados += apont - plan;
      const desvioPct = plan > 0 ? ((apont - plan) / plan) * 100 : apont > 0 ? 100 : 0;
      return { mes: ym, planejado: plan, apontado: apont, desvioPct };
    });

    // Convenção 19: Reajuste
    const closedYms = allYms.filter((ym) => isMonthClosed(ym));
    const last3 = closedYms.slice(-3);
    const avgLast3 =
      last3.length > 0
        ? last3.reduce((a, ym) => a + (hoursByYm.get(ym) ?? 0), 0) / last3.length
        : 0;
    let impactoReajusteRs = 0;
    if (f && f.mes_do_reajuste && num(f.reajuste_previsto_pct) > 0) {
      const reajPctRaw = num(f.reajuste_previsto_pct);
      const reajPct = reajPctRaw > 1 ? reajPctRaw / 100 : reajPctRaw;
      const reajYm = f.mes_do_reajuste.slice(0, 7);
      const nextMonthDate = new Date(statusDate.slice(0, 7) + "-01T00:00:00Z");
      nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
      const nextYm = nextMonthDate.toISOString().slice(0, 7);
      const startYm = reajYm > nextYm ? reajYm : nextYm;
      const endYm = forecastEndDate.slice(0, 7);
      if (startYm <= endYm && (!p.data_saida || p.data_saida.slice(0, 7) >= startYm)) {
        const [sy, sm] = startYm.split("-").map(Number);
        const [ey, em] = endYm.split("-").map(Number);
        const mesesReaj = Math.max(0, (ey - sy) * 12 + (em - sm) + 1);
        impactoReajusteRs = avgLast3 * mesesReaj * custoHora * reajPct;
      }
    }

    const horasSprintAgil = pHoras
      .filter((h) => h.tipo_item === "SPRINT")
      .reduce((a, h) => a + num(h.horas_normais) + num(h.horas_extras), 0);
    const custoSprintAgil = pHoras
      .filter((h) => h.tipo_item === "SPRINT")
      .reduce((a, h) => a + (num(h.horas_normais) + num(h.horas_extras) * fatorHe) * custoHora, 0);
    const pts = ptsByDev.get(pid) ?? 0;

    return {
      id: pid,
      nome: p.nome,
      papel: p.papel,
      frente: p.frente,
      disciplina: p.disciplina,
      vinculo: p.vinculo,
      custoHora,
      custoMensal,
      alocacaoPct,
      horasNormais,
      horasExtras,
      horasTotais,
      custoTotalProjeto,
      capacidadeHoras,
      utilizacaoPct,
      desvioAlocacaoMesesFechados,
      impactoReajusteRs,
      pontosConcluidosAgil: pts,
      horasSprintAgil,
      pontosPorHora: horasSprintAgil > 0 && pts > 0 ? pts / horasSprintAgil : null,
      custoPorPonto: pts > 0 && custoSprintAgil > 0 ? custoSprintAgil / pts : null,
      meses,
    };
  });

  // Convenção 20: Produtividade de fornecedores (tabelas 41 e 42)
  const actMap = new Map(db["07_atividades"].map((a) => [a.id_atividade, a]));
  const fornecMap = new Map(db["29_fornecedores"].map((f) => [f.id_fornecedor, f.nome]));
  const contMap = new Map(db["30_contratos"].map((c) => [c.id_contrato, c]));

  const supplierProductivity = db["41_produtividade_referencia"].map((ref) => {
    const prods = db["42_producao_semanal"]
      .filter((p) => p.id_atividade === ref.id_atividade && p.semana_fim <= statusDate)
      .sort((a, b) => a.semana_fim.localeCompare(b.semana_fim));
    const qtdExec = prods.reduce((a, p) => a + num(p.quantidade_executada), 0);
    const hhTot = prods.reduce((a, p) => a + num(p.hh_trabalhadas), 0);
    const efetivoMedio =
      prods.length > 0 ? prods.reduce((a, p) => a + num(p.efetivo_medio), 0) / prods.length : 0;
    const last3 = prods.slice(-3);
    const efetivo3Sem =
      last3.length > 0 ? last3.reduce((a, p) => a + num(p.efetivo_medio), 0) / last3.length : 0;

    const prodReal = hhTot > 0 ? qtdExec / hhTot : 0;
    const prodPlan = num(ref.produtividade_planejada);
    const eqPlan = num(ref.equipe_planejada_pessoas);
    const ip = prodPlan > 0 ? prodReal / prodPlan : 0;
    const ie = eqPlan > 0 ? efetivoMedio / eqPlan : 0;
    const qtdRest = Math.max(0, num(ref.quantidade_total) - qtdExec);
    const durRest =
      qtdRest <= 0
        ? 0
        : prodReal * efetivo3Sem * horasPorDia > 0
        ? Math.ceil(qtdRest / (prodReal * efetivo3Sem * horasPorDia))
        : 0;

    const cont = contMap.get(ref.id_contrato);
    const fornecedor = cont ? fornecMap.get(cont.id_fornecedor) ?? cont.id_fornecedor : "Interno";

    let diagnostico = "Equilibrado";
    if (ip < 0.85 && ie >= 0.9) diagnostico = "Baixo rendimento (produtividade)";
    else if (ie < 0.85 && ip >= 0.9) diagnostico = "Falta de efetivo (gente)";
    else if (ip < 0.85 && ie < 0.85) diagnostico = "Falta de efetivo + baixo rendimento";

    return {
      idAtividade: ref.id_atividade,
      nomeAtividade: actMap.get(ref.id_atividade)?.nome_atividade ?? ref.servico,
      servico: ref.servico,
      unidade: ref.unidade,
      fornecedor,
      qtdTotal: num(ref.quantidade_total),
      qtdExec,
      hhTot,
      prodPlan,
      prodReal,
      ip,
      eqPlan,
      efetivoMedio,
      efetivo3Sem,
      ie,
      durRest,
      diagnostico,
    };
  });

  return {
    folhaMensalTotal: people.reduce((a, p) => a + p.custoMensal, 0),
    impactoReajusteTotal: people.reduce((a, p) => a + p.impactoReajusteRs, 0),
    people,
    supplierProductivity,
  };
}

// ============================================================================
// CONVENÇÕES 12, 14, 15: RISCOS, ALÇADAS, CONTRATOS, MULTAS E FORNECEDORES
// ============================================================================
export function computeGovernanceAndProcurement(db: ProjectDatabase, statusDate: string) {
  const params = getParamMap(db);
  const ontTotal =
    db["09_orcamento_linha_de_base"].reduce((a, r) => a + num(r.valor_orcado_rs), 0) +
    db["15_sprints"]
      .filter((s) => s.planejada_na_linha_de_base === "1")
      .reduce((a, s) => a + num(s.orcamento_sprint_rs), 0);

  // Riscos (Convenção 12)
  const riscos = db["26_riscos_registro"].map((r) => {
    const prob = num(r.probabilidade_pct);
    const impCusto = num(r.impacto_custo_rs);
    const vme = (prob / 100) * impCusto;
    // Faixas 5x5 do Dossiê M6
    const pBin = prob <= 10 ? 1 : prob <= 30 ? 2 : prob <= 50 ? 3 : prob <= 70 ? 4 : 5;
    const impPct = (impCusto / ontTotal) * 100;
    const iBin = impPct < 0.25 ? 1 : impPct < 0.5 ? 2 : impPct < 1.0 ? 3 : impPct < 2.0 ? 4 : 5;
    return {
      id_risco: r.id_risco,
      tipo_risco: r.tipo_risco,
      categoria: r.categoria,
      descricao: r.descricao,
      status: r.status,
      prob,
      impCusto,
      vme,
      pBin,
      iBin,
      impPrazo: num(r.impacto_prazo_du),
    };
  });

  const ameacasAbertas = riscos.filter((r) => r.tipo_risco === "AMEACA" && r.status === "ABERTO");
  const exposicaoTotalVme = ameacasAbertas.reduce((a, r) => a + r.vme, 0);
  const reservaContingencia = num(params.reserva_de_contingencia_rs, 73000);

  // Auditoria de Alçadas (tabela 05 x tabela 28)
  const alcadaMap = new Map(db["05_matriz_alcadas"].map((a) => [a.nivel_decisor, a]));
  const mudancasAuditadas = db["28_mudancas_solicitacoes"].map((m) => {
    const alc = alcadaMap.get(m.nivel_decisor);
    const violacoes: string[] = [];
    if (m.status === "APROVADA" && alc) {
      if (alc.pode_alterar_escopo === "NAO" && m.tipo_mudanca === "ESCOPO") {
        violacoes.push("Nível sem permissão para alterar escopo");
      }
      if (alc.limite_custo_rs && num(m.impacto_custo_rs) > num(alc.limite_custo_rs)) {
        violacoes.push(`Custo acima do limite (R$ ${num(alc.limite_custo_rs).toLocaleString("pt-BR")})`);
      }
      if (alc.limite_prazo_du && num(m.impacto_prazo_du) > num(alc.limite_prazo_du)) {
        violacoes.push(`Prazo acima do limite (${alc.limite_prazo_du} du)`);
      }
    }
    return {
      id_mudanca: m.id_mudanca,
      tipo_mudanca: m.tipo_mudanca,
      nivel_decisor: m.nivel_decisor,
      status: m.status,
      impacto_custo_rs: m.impacto_custo_rs,
      impacto_prazo_du: m.impacto_prazo_du,
      descricao: m.descricao,
      violacoes,
      conformeAlcada: violacoes.length === 0,
    };
  });

  // Scope creep (PEDIDO_DIRETO)
  const pedidosDiretos = db["14_backlog_itens"].filter((b) => b.origem === "PEDIDO_DIRETO");
  const bugsDePedidosDiretos = db["24_defeitos"].filter((d) =>
    pedidosDiretos.some((p) => p.id_item === d.id_item_origem)
  );

  // Contratos e multas (Convenção 14)
  const fornMap = new Map(db["29_fornecedores"].map((f) => [f.id_fornecedor, f]));
  const inspList = db["25_inspecoes_aceite"].filter((i) => i.data <= statusDate);
  const contratos = db["30_contratos"].map((c) => {
    const meds = db["31_contratos_medicoes"].filter((m) => m.id_contrato === c.id_contrato);
    const valorContratado = num(c.valor_contratado_rs);
    const valorPago = meds.reduce((a, m) => a + num(m.valor_pago_rs), 0);
    const lastMed = meds[meds.length - 1];
    let diasAtraso = 0;
    if (lastMed && lastMed.data_prevista) {
      const refDate = lastMed.data_real || (statusDate > lastMed.data_prevista ? statusDate : "");
      if (refDate && refDate > lastMed.data_prevista) {
        diasAtraso = Math.round(
          (new Date(refDate + "T00:00:00Z").getTime() - new Date(lastMed.data_prevista + "T00:00:00Z").getTime()) /
            86400000
        );
      }
    }
    const multaPctDia = num(c.multa_atraso_pct_dia);
    const tetoPct = num(c.teto_multa_pct);
    const multaCalc =
      c.tipo_contrato === "PRECO_FIXO" && diasAtraso > 0
        ? Math.min(valorContratado * (tetoPct / 100), diasAtraso * (multaPctDia / 100) * valorContratado)
        : 0;
    const inspFornecedor = inspList.filter((i) => i.id_fornecedor === c.id_fornecedor);
    const reprovacoes = inspFornecedor.filter((i) => i.resultado === "REPROVADO").length;
    const retrabalhoRs = inspFornecedor.reduce((a, i) => a + num(i.custo_retrabalho_rs), 0);

    return {
      id_contrato: c.id_contrato,
      id_fornecedor: c.id_fornecedor,
      tipo_contrato: c.tipo_contrato,
      fornecedorNome: fornMap.get(c.id_fornecedor)?.nome ?? c.id_fornecedor,
      valorContratado,
      valorPago,
      variacaoValor: valorPago - valorContratado,
      diasAtraso,
      multaEstimadaRs: multaCalc,
      reprovacoes,
      retrabalhoRs,
    };
  });

  // Seleção de fornecedores (Convenção 15)
  const props = db["32_propostas_fornecedores"];
  const minPreco = Math.min(...props.map((p) => num(p.preco_rs)));
  const minPrazo = Math.min(...props.map((p) => num(p.prazo_du)));
  const maxExp = Math.max(...props.map((p) => num(p.projetos_similares)), 1);
  const maxGar = Math.max(...props.map((p) => num(p.garantia_meses)), 1);

  const wPreco = num(params.peso_criterio_preco, 0.35);
  const wTec = num(params.peso_criterio_tecnica, 0.3);
  const wPrazo = num(params.peso_criterio_prazo, 0.15);
  const wExp = num(params.peso_criterio_experiencia, 0.1);
  const wGar = num(params.peso_criterio_garantia, 0.1);

  const propostasAvaliadas = props
    .map((p) => {
      const nPreco = minPreco / num(p.preco_rs);
      const nTec = num(p.nota_tecnica) / 10;
      const nPrazo = minPrazo / num(p.prazo_du);
      const nExp = num(p.projetos_similares) / maxExp;
      const nGar = num(p.garantia_meses) / maxGar;
      const notaFinal = wPreco * nPreco + wTec * nTec + wPrazo * nPrazo + wExp * nExp + wGar * nGar;
      const historicoReprov = inspList.filter(
        (i) => i.id_fornecedor === p.id_fornecedor && i.resultado === "REPROVADO"
      ).length;
      const historicoOcorr = db["27_riscos_ocorrencias"].filter(
        (o) => (p.id_fornecedor === "F04" && (o.id_risco === "R06" || o.id_risco === "R09"))
      ).length;
      return {
        id_proposta: p.id_proposta,
        id_fornecedor: p.id_fornecedor,
        preco_rs: p.preco_rs,
        prazo_du: p.prazo_du,
        nota_tecnica: p.nota_tecnica,
        projetos_similares: p.projetos_similares,
        garantia_meses: p.garantia_meses,
        fornecedorNome: fornMap.get(p.id_fornecedor)?.nome ?? p.id_fornecedor,
        nPreco,
        nTec,
        nPrazo,
        nExp,
        nGar,
        notaFinal,
        alertaHistorico: historicoReprov > 0 || historicoOcorr > 0,
        historicoReprov,
        historicoOcorr,
      };
    })
    .sort((a, b) => b.notaFinal - a.notaFinal);

  return {
    riscos,
    ameacasAbertas,
    exposicaoTotalVme,
    reservaContingencia,
    mudancasAuditadas,
    pedidosDiretos,
    bugsDePedidosDiretos,
    contratos,
    propostasAvaliadas,
  };
}

// ============================================================================
// COMPRESSÃO DE SUB-REDE M4 (PASSO A PASSO)
// ============================================================================
export function computeM4Compression(db: ProjectDatabase, targetReductionDu = 5) {
  const m1Ids = new Set(["A22", "A23", "A24", "A25", "A26", "A27", "A28", "A29", "A30", "A31", "A34", "A35"]);
  const acts = db["07_atividades"].filter((a) => m1Ids.has(a.id_atividade));
  const deps = db["08_dependencias"].filter((d) => m1Ids.has(d.id_predecessora) && m1Ids.has(d.id_sucessora));
  const compMap = new Map(db["12_compressao_opcoes"].map((c) => [c.id_atividade, c]));

  const durs = new Map<string, number>();
  for (const a of acts) {
    durs.set(
      a.id_atividade,
      Math.ceil((num(a.duracao_otimista_du) + 4 * num(a.duracao_mais_provavel_du) + num(a.duracao_pessimista_du)) / 6)
    );
  }

  const evalSub = () => {
    const preds = new Map<string, CsvRow[]>();
    const succs = new Map<string, CsvRow[]>();
    for (const d of deps) {
      preds.set(d.id_sucessora, [...(preds.get(d.id_sucessora) ?? []), d]);
      succs.set(d.id_predecessora, [...(succs.get(d.id_predecessora) ?? []), d]);
    }
    const inDeg = new Map(acts.map((a) => [a.id_atividade, (preds.get(a.id_atividade) ?? []).length]));
    const q = acts.filter((a) => (inDeg.get(a.id_atividade) ?? 0) === 0).map((a) => a.id_atividade);
    const order: string[] = [];
    while (q.length) {
      const u = q.shift()!;
      order.push(u);
      for (const e of succs.get(u) ?? []) {
        const nd = (inDeg.get(e.id_sucessora) ?? 0) - 1;
        inDeg.set(e.id_sucessora, nd);
        if (nd === 0) q.push(e.id_sucessora);
      }
    }
    const es = new Map<string, number>();
    const ef = new Map<string, number>();
    for (const u of order) {
      let s = 1;
      for (const e of preds.get(u) ?? []) {
        const lag = num(e.defasagem_du);
        const cand = e.tipo_dependencia === "TI" ? (ef.get(e.id_predecessora) ?? 0) + 1 + lag : (es.get(e.id_predecessora) ?? 1) + lag;
        if (cand > s) s = cand;
      }
      es.set(u, s);
      ef.set(u, s + (durs.get(u) ?? 0) - 1);
    }
    const durTotal = Math.max(...Array.from(ef.values()));
    const ls = new Map<string, number>();
    const lf = new Map<string, number>();
    for (let i = order.length - 1; i >= 0; i--) {
      const u = order[i];
      const dur = durs.get(u) ?? 0;
      let f = durTotal;
      for (const e of succs.get(u) ?? []) {
        const lag = num(e.defasagem_du);
        const cand =
          e.tipo_dependencia === "TI"
            ? (ls.get(e.id_sucessora) ?? durTotal) - 1 - lag
            : (ls.get(e.id_sucessora) ?? durTotal) - lag + dur - 1;
        if (cand < f) f = cand;
      }
      lf.set(u, f);
      ls.set(u, f - dur + 1);
    }
    const crit = order.filter((u) => ls.get(u) === es.get(u));
    return { durTotal, crit };
  };

  const steps: { passo: number; atividade: string; custoDia: number; custoAcum: number; novoPrazo: number; caminhoCritico: string }[] = [];
  const init = evalSub();
  let curDur = init.durTotal;
  let custoAcum = 0;

  for (let step = 1; step <= targetReductionDu; step++) {
    const { crit } = evalSub();
    // Try reducing each compressible activity in critical path by 1 day and pick cheapest that actually lowers curDur
    const candidates = crit
      .map((id) => ({ id, opt: compMap.get(id) }))
      .filter((c): c is { id: string; opt: CsvRow } => Boolean(c.opt) && (durs.get(c.id) ?? 0) > num(c.opt!.duracao_minima_du))
      .sort((a, b) => num(a.opt.custo_adicional_por_du_rs) - num(b.opt.custo_adicional_por_du_rs));

    let chosen: { id: string; custo: number; newDur: number; newCrit: string[] } | null = null;
    for (const cand of candidates) {
      const prev = durs.get(cand.id)!;
      durs.set(cand.id, prev - 1);
      const res = evalSub();
      if (res.durTotal < curDur) {
        chosen = { id: cand.id, custo: num(cand.opt.custo_adicional_por_du_rs), newDur: res.durTotal, newCrit: res.crit };
        break;
      }
      durs.set(cand.id, prev);
    }
    if (!chosen) break;
    curDur = chosen.newDur;
    custoAcum += chosen.custo;
    steps.push({
      passo: step,
      atividade: chosen.id,
      custoDia: chosen.custo,
      custoAcum,
      novoPrazo: curDur,
      caminhoCritico: chosen.newCrit.join(" → "),
    });
  }

  return { prazoInicial: init.durTotal, critInicial: init.crit, steps };
}
