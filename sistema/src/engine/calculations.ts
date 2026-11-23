import type { CsvRow, ProjectDatabase } from "../types/project";

export const num = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export const fmtBRL = (v: number): string =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export const fmtBRL0 = (v: number): string =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const fmtNum = (v: number, dec = 1): string =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const fmtDateBR = (iso: string): string => {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export function getParamMap(db: ProjectDatabase): Record<string, string> {
  const m: Record<string, string> = {};
  for (const r of db["01_projeto_parametros"]) m[r.parametro] = r.valor;
  return m;
}

export interface CalendarHelpers {
  duToDate: Map<number, string>;
  dateToDu: Map<string, number>;
  lastDuOnOrBefore: (d: string) => number;
  nextDuOnOrAfter: (d: string) => number;
  countWorkingDaysBetween: (startIso: string, endIso: string) => number;
  calendarDaysBetween: (startIso: string, endIso: string) => number;
}

export function buildCalendarHelpers(cal: CsvRow[]): CalendarHelpers {
  const duToDate = new Map<number, string>();
  const dateToDu = new Map<string, number>();
  const sorted = [...cal].sort((a, b) => a.data.localeCompare(b.data));
  for (const r of sorted) {
    if (r.dia_util_projeto) {
      const du = Number(r.dia_util_projeto);
      duToDate.set(du, r.data);
      dateToDu.set(r.data, du);
    }
  }
  const lastDuOnOrBefore = (d: string) => {
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].data <= d && sorted[i].dia_util_projeto) {
        return Number(sorted[i].dia_util_projeto);
      }
    }
    return 1;
  };
  const nextDuOnOrAfter = (d: string) => {
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].data >= d && sorted[i].dia_util_projeto) {
        return Number(sorted[i].dia_util_projeto);
      }
    }
    return sorted.length;
  };
  const countWorkingDaysBetween = (startIso: string, endIso: string) => {
    let count = 0;
    for (const r of sorted) {
      if (r.data >= startIso && r.data <= endIso && r.dia_util === "1") count++;
    }
    return count;
  };
  const calendarDaysBetween = (startIso: string, endIso: string) => {
    const a = new Date(startIso + "T00:00:00Z").getTime();
    const b = new Date(endIso + "T00:00:00Z").getTime();
    return Math.round((b - a) / 86400000);
  };
  return { duToDate, dateToDu, lastDuOnOrBefore, nextDuOnOrAfter, countWorkingDaysBetween, calendarDaysBetween };
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ============================================================================
// CONVENÇÕES 1, 2, 11: REDE PERT/CPM & PREVISÃO DE TÉRMINO
// ============================================================================
export interface ActivityCPM {
  id: string;
  nome: string;
  codigoEap: string;
  disciplina: string;
  tipo: string;
  o: number;
  m: number;
  p: number;
  durLb: number;
  sigma: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  folga: number;
  criticaLb: boolean;
  avancoPct: number;
  situacao: string;
  dataInicioReal: string;
  dataTerminoReal: string;
  forecastEs: number;
  forecastEf: number;
  forecastLs: number;
  forecastLf: number;
  forecastFolga: number;
  criticaForecast: boolean;
  forecastStartDate: string;
  forecastEndDate: string;
  orcamento: number;
}

export interface AgileMetrics {
  velocidadesSprints: { id: string; numero: number; dataInicio: string; dataFim: string; pontosPlanejados: number; pontosConcluidos: number; itensConcluidos: number }[];
  velocidadeMedia: number;
  pontosTotaisBacklog: number;
  pontosConcluidosTotal: number;
  itensTotaisBacklog: number;
  itensConcluidosTotal: number;
  pontosRestantesR1: number;
  pontosRestantesR2: number;
  pontosRestantesR3: number;
  sprintsRestantesR1: number;
  sprintsRestantesR2: number;
  sprintsRestantesR3: number;
  dataPrevistaR1: string;
  dataPrevistaR2: string;
  dataPrevistaR3: string;
  duPrevistoR1: number;
  duPrevistoR2: number;
  duPrevistoR3: number;
  tempoCicloMedioDu: number;
  leadTimeMedioDu: number;
  wipMedioLittle: number;
  dora: {
    totalProducao: number;
    freqPorSemana: number;
    leadTimeMedianaH: number;
    taxaFalhaPct: number;
    mttrMediaH: number;
  };
  custoRealPorPonto: number;
}

export function computeAgileMetrics(
  db: ProjectDatabase,
  statusDate: string,
  calH: CalendarHelpers,
  overrideBacklog?: CsvRow[],
  extraVelocityPerSprintAfterRamp?: { gain: number; rampSprints: number }[]
): AgileMetrics {
  const sprints = [...db["15_sprints"]].sort((a, b) => Number(a.numero) - Number(b.numero));
  const backlog = overrideBacklog ?? db["14_backlog_itens"];
  const sprintItens = db["20_sprint_itens"];
  const params = getParamMap(db);
  const fatorHe = num(params.fator_hora_extra, 1.5);
  const eqCost = new Map(db["04_equipe"].map((p) => [p.id_pessoa, num(p.custo_hora_rs)]));

  const backlogMap = new Map(backlog.map((b) => [b.id_item, b]));

  // Pontos concluídos por sprint
  const velocidadesSprints = sprints
    .filter((s) => s.data_fim <= statusDate || s.data_inicio <= statusDate)
    .filter((s) => s.data_fim <= statusDate)
    .map((s) => {
      const itemsInS = sprintItens.filter((si) => si.id_sprint === s.id_sprint);
      // Fallback: se sprint S15 ainda não tiver linhas em 20_sprint_itens com concluido_na_sprint=1, derivar de backlog concluido até statusDate?
      // Mantemos 20_sprint_itens como fonte oficial, e ao lançar B5/B6 atualizamos 20_sprint_itens também!
      const ptsPlan = itemsInS.reduce((acc, si) => acc + num(si.pontos), 0);
      const concl = itemsInS.filter((si) => si.concluido_na_sprint === "1");
      const ptsDone = concl.reduce((acc, si) => acc + num(si.pontos), 0);
      return {
        id: s.id_sprint,
        numero: Number(s.numero),
        dataInicio: s.data_inicio,
        dataFim: s.data_fim,
        pontosPlanejados: ptsPlan,
        pontosConcluidos: ptsDone,
        itensConcluidos: concl.length,
      };
    });

  const last5 = velocidadesSprints.slice(-5);
  const velocidadeMedia =
    last5.length > 0
      ? last5.reduce((a, b) => a + b.pontosConcluidos, 0) / last5.length
      : num(params.velocidade_planejada_pontos, 17.3);

  const lastClosedSprint = velocidadesSprints[velocidadesSprints.length - 1];
  const lastSprintNum = lastClosedSprint ? lastClosedSprint.numero : 14;
  const lastSprintEnd = lastClosedSprint ? lastClosedSprint.dataFim : "2026-10-30";

  const activeItems = backlog.filter((b) => b.prioridade_moscow !== "WONT");
  const isDone = (b: CsvRow) =>
    b.status === "CONCLUIDO" && (!b.data_conclusao || b.data_conclusao <= statusDate);

  const pontosTotaisBacklog = activeItems.reduce((a, b) => a + num(b.pontos), 0);
  const pontosConcluidosTotal = backlog
    .filter((b) => isDone(b))
    .reduce((a, b) => a + num(b.pontos), 0);
  const itensTotaisBacklog = backlog.length;
  const itensConcluidosTotal = backlog.filter((b) => isDone(b)).length;

  const remPts = (releases: string[]) =>
    activeItems
      .filter((b) => !isDone(b) && releases.includes(b.id_release))
      .reduce((a, b) => a + num(b.pontos), 0);

  const pontosRestantesR1 = remPts(["R1"]);
  const pontosRestantesR2 = remPts(["R1", "R2"]);
  const pontosRestantesR3 = remPts(["R1", "R2", "R3"]);

  const sprintsNeeded = (pts: number) => {
    if (pts <= 0) return 0;
    if (!extraVelocityPerSprintAfterRamp || extraVelocityPerSprintAfterRamp.length === 0) {
      return Math.ceil(pts / (velocidadeMedia || 1));
    }
    let done = 0;
    let sp = 0;
    while (done < pts - 1e-9 && sp < 100) {
      sp++;
      let v = velocidadeMedia;
      for (const r of extraVelocityPerSprintAfterRamp) {
        if (sp > r.rampSprints) v += r.gain;
      }
      done += v;
    }
    return sp;
  };

  const sprintsRestantesR1 = sprintsNeeded(pontosRestantesR1);
  const sprintsRestantesR2 = sprintsNeeded(pontosRestantesR2);
  const sprintsRestantesR3 = sprintsNeeded(pontosRestantesR3);

  const sprintEndInfo = (offsetSprints: number, fallbackDate: string): { date: string; du: number } => {
    if (offsetSprints === 0) {
      const r1Real = db["16_releases"].find((r) => r.id_release === "R1")?.data_real;
      const d = r1Real || fallbackDate;
      return { date: d, du: calH.lastDuOnOrBefore(d) };
    }
    const targetNum = lastSprintNum + offsetSprints;
    const found = sprints.find((s) => Number(s.numero) === targetNum);
    const endDate = found
      ? found.data_fim
      : addDaysIso(lastSprintEnd, offsetSprints * 14);
    return { date: endDate, du: calH.lastDuOnOrBefore(endDate) };
  };

  const r1Info = sprintEndInfo(sprintsRestantesR1, "2026-07-10");
  const r2Info = sprintEndInfo(sprintsRestantesR2, lastSprintEnd);
  const r3Info = sprintEndInfo(sprintsRestantesR3, lastSprintEnd);

  // Cycle time & lead time (Convenção 9)
  const transByItem = new Map<string, CsvRow[]>();
  for (const t of db["21_itens_transicoes"]) {
    if (t.data <= statusDate) {
      const arr = transByItem.get(t.id_item) ?? [];
      arr.push(t);
      transByItem.set(t.id_item, arr);
    }
  }
  let sumCycle = 0;
  let cntCycle = 0;
  let sumLead = 0;
  let cntLead = 0;
  for (const b of backlog) {
    if (!isDone(b) || !b.data_conclusao) continue;
    const tr = (transByItem.get(b.id_item) ?? []).sort((a, c) => a.data.localeCompare(c.data));
    const firstInProg = tr.find((t) => t.status_destino === "EM_ANDAMENTO")?.data || b.data_inicio;
    if (firstInProg) {
      const ct = Math.max(1, calH.countWorkingDaysBetween(firstInProg, b.data_conclusao));
      sumCycle += ct;
      cntCycle++;
    }
    if (b.data_criacao) {
      const lt = Math.max(1, calH.countWorkingDaysBetween(b.data_criacao, b.data_conclusao));
      sumLead += lt;
      cntLead++;
    }
  }
  const tempoCicloMedioDu = cntCycle > 0 ? sumCycle / cntCycle : 0;
  const leadTimeMedioDu = cntLead > 0 ? sumLead / cntLead : 0;
  const totalDuAgile = Math.max(1, calH.countWorkingDaysBetween(params.data_inicio_sprint_1 || "2026-04-20", statusDate));
  const vazao = cntCycle / totalDuAgile;
  const wipMedioLittle = vazao * tempoCicloMedioDu;

  // DORA (Convenção 13)
  const impls = db["23_implantacoes"].filter((i) => i.data <= statusDate);
  const prods = impls.filter((i) => i.ambiente === "PRODUCAO");
  const weeksAgile = Math.max(1, totalDuAgile / 5);
  const leadTimesH = impls.map((i) => num(i.tempo_ate_producao_h)).sort((a, b) => a - b);
  const mid = Math.floor(leadTimesH.length / 2);
  const leadTimeMedianaH =
    leadTimesH.length === 0
      ? 0
      : leadTimesH.length % 2 === 1
      ? leadTimesH[mid]
      : (leadTimesH[mid - 1] + leadTimesH[mid]) / 2;
  const falhas = impls.filter((i) => i.falhou === "1");
  const mttrMediaH =
    falhas.length > 0 ? falhas.reduce((a, b) => a + num(b.tempo_restauracao_h), 0) / falhas.length : 0;

  // Custo real da frente ágil para custo/ponto (Convenção 22)
  let crAgil = db["19_custos_realizados"]
    .filter((c) => c.frente === "AGIL" && c.data <= statusDate)
    .reduce((a, c) => a + num(c.valor_rs), 0);
  for (const h of db["18_apontamento_horas"]) {
    const semFim = addDaysIso(h.semana_inicio, 4);
    if (semFim <= statusDate && h.tipo_item === "SPRINT") {
      crAgil += (num(h.horas_normais) + num(h.horas_extras) * fatorHe) * (eqCost.get(h.id_pessoa) ?? 0);
    }
  }
  const custoRealPorPonto = pontosConcluidosTotal > 0 ? crAgil / pontosConcluidosTotal : 0;

  // Avoid unused warning
  void backlogMap;

  return {
    velocidadesSprints,
    velocidadeMedia,
    pontosTotaisBacklog,
    pontosConcluidosTotal,
    itensTotaisBacklog,
    itensConcluidosTotal,
    pontosRestantesR1,
    pontosRestantesR2,
    pontosRestantesR3,
    sprintsRestantesR1,
    sprintsRestantesR2,
    sprintsRestantesR3,
    dataPrevistaR1: r1Info.date,
    dataPrevistaR2: r2Info.date,
    dataPrevistaR3: r3Info.date,
    duPrevistoR1: r1Info.du,
    duPrevistoR2: r2Info.du,
    duPrevistoR3: r3Info.du,
    tempoCicloMedioDu,
    leadTimeMedioDu,
    wipMedioLittle,
    dora: {
      totalProducao: prods.length,
      freqPorSemana: prods.length / weeksAgile,
      leadTimeMedianaH,
      taxaFalhaPct: impls.length > 0 ? (falhas.length / impls.length) * 100 : 0,
      mttrMediaH,
    },
    custoRealPorPonto,
  };
}

export interface NetworkResult {
  activities: ActivityCPM[];
  duracaoLbDu: number;
  terminoLbDate: string;
  criticalPathLb: string[];
  sigmaCaminhoCriticoLb: number;
  forecastEndDu: number;
  forecastEndDate: string;
  criticalPathForecast: string[];
  atrasoContratualDu: number;
}

export function computeNetwork(
  db: ProjectDatabase,
  statusDate: string,
  calH: CalendarHelpers,
  agile: AgileMetrics,
  scenarioMods?: {
    actMods?: CsvRow[];
  }
): NetworkResult {
  const statusDu = calH.lastDuOnOrBefore(statusDate);

  // Orçamento por atividade
  const orcMap = new Map<string, number>();
  for (const r of db["09_orcamento_linha_de_base"]) {
    orcMap.set(r.id_atividade, (orcMap.get(r.id_atividade) ?? 0) + num(r.valor_orcado_rs));
  }

  // Último avanço até statusDate
  const latestAv = new Map<string, CsvRow>();
  for (const r of db["17_avanco_semanal"]) {
    if (r.semana_fim <= statusDate) {
      const prev = latestAv.get(r.id_atividade);
      if (!prev || r.semana_fim >= prev.semana_fim) latestAv.set(r.id_atividade, r);
    }
  }

  // Marcos ágeis já entregues (tabela 10: data_real até a data de status) → id_atividade → data real
  const marcoEntregue = new Map<string, string>();
  for (const m of db["10_marcos"] ?? []) {
    if (m.data_real && m.data_real <= statusDate) marcoEntregue.set(m.id_atividade, m.data_real);
  }
  const marcoAgilConcluido = (u: string) => nodes.get(u)?.tipo === "MARCO_AGIL" && marcoEntregue.has(u);

  // Nodes & edges base
  const nodes = new Map<string, {
    id: string; nome: string; eap: string; disc: string; tipo: string;
    o: number; m: number; p: number; durLb: number; sigma: number;
  }>();
  for (const a of db["07_atividades"]) {
    const o = num(a.duracao_otimista_du);
    const m = num(a.duracao_mais_provavel_du);
    const p = num(a.duracao_pessimista_du);
    const durLb = a.tipo_atividade === "ESTIMADA" ? Math.ceil((o + 4 * m + p) / 6) : num(a.duracao_fixa_du);
    const sigma = a.tipo_atividade === "ESTIMADA" ? (p - o) / 6 : 0;
    nodes.set(a.id_atividade, {
      id: a.id_atividade, nome: a.nome_atividade, eap: a.codigo_eap,
      disc: a.disciplina, tipo: a.tipo_atividade, o, m, p, durLb, sigma,
    });
  }

  const basePreds = new Map<string, { pred: string; tipo: string; lag: number }[]>();
  const baseSuccs = new Map<string, { succ: string; tipo: string; lag: number }[]>();
  for (const d of db["08_dependencias"]) {
    const pArr = basePreds.get(d.id_sucessora) ?? [];
    pArr.push({ pred: d.id_predecessora, tipo: d.tipo_dependencia, lag: num(d.defasagem_du) });
    basePreds.set(d.id_sucessora, pArr);
    const sArr = baseSuccs.get(d.id_predecessora) ?? [];
    sArr.push({ succ: d.id_sucessora, tipo: d.tipo_dependencia, lag: num(d.defasagem_du) });
    baseSuccs.set(d.id_predecessora, sArr);
  }

  // Topo sort LB
  const topoSort = (nodeIds: string[], predsMap: Map<string, { pred: string; tipo: string; lag: number }[]>) => {
    const inDeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const id of nodeIds) {
      const ps = predsMap.get(id) ?? [];
      inDeg.set(id, ps.length);
      for (const e of ps) {
        const arr = adj.get(e.pred) ?? [];
        arr.push(id);
        adj.set(e.pred, arr);
      }
    }
    const q = nodeIds.filter((id) => (inDeg.get(id) ?? 0) === 0);
    const order: string[] = [];
    while (q.length > 0) {
      const u = q.shift()!;
      order.push(u);
      for (const v of adj.get(u) ?? []) {
        const d = (inDeg.get(v) ?? 0) - 1;
        inDeg.set(v, d);
        if (d === 0) q.push(v);
      }
    }
    return order;
  };

  const baseOrder = topoSort(Array.from(nodes.keys()), basePreds);
  const esLb = new Map<string, number>();
  const efLb = new Map<string, number>();
  for (const u of baseOrder) {
    const node = nodes.get(u)!;
    let s = 1;
    for (const e of basePreds.get(u) ?? []) {
      const cand = e.tipo === "TI" ? (efLb.get(e.pred) ?? 0) + 1 + e.lag : (esLb.get(e.pred) ?? 1) + e.lag;
      if (cand > s) s = cand;
    }
    esLb.set(u, s);
    efLb.set(u, s + node.durLb - 1);
  }
  const duracaoLbDu = Math.max(...Array.from(efLb.values()), 1);
  const lsLb = new Map<string, number>();
  const lfLb = new Map<string, number>();
  for (let i = baseOrder.length - 1; i >= 0; i--) {
    const u = baseOrder[i];
    const node = nodes.get(u)!;
    let f = duracaoLbDu;
    for (const e of baseSuccs.get(u) ?? []) {
      const cand =
        e.tipo === "TI"
          ? (lsLb.get(e.succ) ?? duracaoLbDu) - 1 - e.lag
          : (lsLb.get(e.succ) ?? duracaoLbDu) - e.lag + node.durLb - 1;
      if (cand < f) f = cand;
    }
    lfLb.set(u, f);
    lsLb.set(u, f - node.durLb + 1);
  }
  const criticalPathLb = baseOrder.filter((u) => lsLb.get(u) === esLb.get(u));
  const sigmaCaminhoCriticoLb = Math.sqrt(
    criticalPathLb.reduce((acc, u) => acc + Math.pow(nodes.get(u)!.sigma, 2), 0)
  );

  // Now Forecast network (with optional scenario mods — Convenção 11 & 21)
  const fNodes = new Map(nodes);
  const fPreds = new Map<string, { pred: string; tipo: string; lag: number }[]>();
  for (const [k, v] of basePreds) fPreds.set(k, [...v]);
  const excluded = new Set<string>();
  const alteredDur = new Map<string, number>();

  for (const mod of scenarioMods?.actMods ?? []) {
    const aid = mod.id_atividade;
    if (mod.acao === "EXCLUIR") {
      excluded.add(aid);
      alteredDur.set(aid, 0);
    } else if (mod.acao === "ALTERAR_DURACAO") {
      alteredDur.set(aid, num(mod.duracao_du));
    } else if (mod.acao === "INCLUIR") {
      const dur = num(mod.duracao_du);
      fNodes.set(aid, {
        id: aid, nome: mod.nome_atividade, eap: "CENARIO", disc: mod.disciplina,
        tipo: "ESTIMADA", o: dur, m: dur, p: dur, durLb: dur, sigma: 0,
      });
      if (mod.predecessoras) {
        const ps = mod.predecessoras.split(";").filter(Boolean).map((s) => {
          const [pred, tipo, lag] = s.split(":");
          return { pred, tipo, lag: num(lag) };
        });
        fPreds.set(aid, [...(fPreds.get(aid) ?? []), ...ps]);
      }
      if (mod.sucessoras) {
        for (const s of mod.sucessoras.split(";").filter(Boolean)) {
          const [succ, tipo, lag] = s.split(":");
          const arr = fPreds.get(succ) ?? [];
          arr.push({ pred: aid, tipo, lag: num(lag) });
          fPreds.set(succ, arr);
        }
      }
    }
  }

  const fSuccs = new Map<string, { succ: string; tipo: string; lag: number }[]>();
  for (const [u, ps] of fPreds) {
    for (const e of ps) {
      const arr = fSuccs.get(e.pred) ?? [];
      arr.push({ succ: u, tipo: e.tipo, lag: e.lag });
      fSuccs.set(e.pred, arr);
    }
  }

  const fOrder = topoSort(Array.from(fNodes.keys()), fPreds);
  const fEs = new Map<string, number>();
  const fEf = new Map<string, number>();
  const fDur = new Map<string, number>();

  for (const u of fOrder) {
    const node = fNodes.get(u)!;
    const av = latestAv.get(u);
    if (excluded.has(u)) {
      let s = statusDu + 1;
      for (const e of fPreds.get(u) ?? []) {
        const cand = e.tipo === "TI" ? (fEf.get(e.pred) ?? 0) + 1 + e.lag : (fEs.get(e.pred) ?? 1) + e.lag;
        if (cand > s) s = cand;
      }
      fEs.set(u, s);
      fEf.set(u, s - 1);
      fDur.set(u, 0);
      continue;
    }
    if (av && av.situacao === "CONCLUIDA") {
      const s = calH.nextDuOnOrAfter(av.data_inicio_real);
      const f = calH.lastDuOnOrBefore(av.data_termino_real);
      fEs.set(u, s);
      fEf.set(u, f);
      fDur.set(u, Math.max(1, f - s + 1));
      continue;
    }
    if (node.tipo === "MARCO_AGIL") {
      // Interface entre as trilhas: a release é um marco da rede preditiva.
      // Início: depois das predecessoras (a release anterior), nunca antes do previsto na LB.
      // Sem isso a R3 "começaria" antes da R2 terminar, ganharia uma duração artificial
      // e o passo de volta tiraria a R2 do caminho crítico.
      let s = av?.data_inicio_real ? calH.nextDuOnOrAfter(av.data_inicio_real) : esLb.get(u) ?? 40;
      for (const e of fPreds.get(u) ?? []) {
        const cand = e.tipo === "TI" ? (fEf.get(e.pred) ?? 0) + 1 + e.lag : (fEs.get(e.pred) ?? 1) + e.lag;
        if (cand > s) s = cand;
      }
      // Término: data real do marco (tabela 10) se já entregue; senão a previsão da release (Conv. 11).
      let f = efLb.get(u) ?? s;
      const entregue = marcoEntregue.get(u);
      if (entregue) {
        f = calH.lastDuOnOrBefore(entregue);
      } else if (u === "A40") {
        f = agile.duPrevistoR1;
      } else if (u === "A41") {
        f = agile.duPrevistoR2;
      } else if (u === "A42") {
        f = agile.duPrevistoR3;
      }
      if (s > f) s = f;
      fEs.set(u, s);
      fEf.set(u, f);
      fDur.set(u, Math.max(1, f - s + 1));
      continue;
    }
    if (av && num(av.avanco_acumulado_pct) > 0) {
      const pct = num(av.avanco_acumulado_pct) / 100;
      let rem = Math.ceil(node.durLb * (1 - pct));
      if (alteredDur.has(u)) {
        const delta = node.durLb - alteredDur.get(u)!;
        rem = Math.max(1, rem - delta);
      }
      const s = av.data_inicio_real ? calH.nextDuOnOrAfter(av.data_inicio_real) : statusDu;
      const f = statusDu + rem;
      fEs.set(u, s);
      fEf.set(u, f);
      fDur.set(u, Math.max(1, f - s + 1));
      continue;
    }
    // Não iniciada
    const dur = alteredDur.has(u) ? alteredDur.get(u)! : node.durLb;
    let s = statusDu + 1;
    for (const e of fPreds.get(u) ?? []) {
      const cand = e.tipo === "TI" ? (fEf.get(e.pred) ?? 0) + 1 + e.lag : (fEs.get(e.pred) ?? 1) + e.lag;
      if (cand > s) s = cand;
    }
    fEs.set(u, s);
    fEf.set(u, s + dur - 1);
    fDur.set(u, dur);
  }

  const forecastEndDu = Math.max(...Array.from(fEf.values()), statusDu);
  const fLs = new Map<string, number>();
  const fLf = new Map<string, number>();
  for (let i = fOrder.length - 1; i >= 0; i--) {
    const u = fOrder[i];
    const dur = fDur.get(u) ?? 0;
    let f = forecastEndDu;
    for (const e of fSuccs.get(u) ?? []) {
      const cand =
        e.tipo === "TI"
          ? (fLs.get(e.succ) ?? forecastEndDu) - 1 - e.lag
          : (fLs.get(e.succ) ?? forecastEndDu) - e.lag + dur - 1;
      if (cand < f) f = cand;
    }
    fLf.set(u, f);
    fLs.set(u, f - dur + 1);
  }

  const criticalPathForecast = fOrder.filter((u) => {
    const av = latestAv.get(u);
    if (av && av.situacao === "CONCLUIDA") return false;
    if (marcoAgilConcluido(u)) return false;
    return !excluded.has(u) && fLs.get(u) === fEs.get(u);
  });

  const duToDateSafe = (du: number) => {
    if (calH.duToDate.has(du)) return calH.duToDate.get(du)!;
    const maxKey = Math.max(...Array.from(calH.duToDate.keys()));
    return addDaysIso(calH.duToDate.get(maxKey)!, Math.ceil((du - maxKey) * 1.4));
  };

  const activities: ActivityCPM[] = fOrder.map((u) => {
    const n = fNodes.get(u)!;
    const av = latestAv.get(u);
    const fEsVal = fEs.get(u) ?? 1;
    const fEfVal = fEf.get(u) ?? 1;
    const fLsVal = fLs.get(u) ?? fEsVal;
    const fLfVal = fLf.get(u) ?? fEfVal;
    return {
      id: n.id,
      nome: n.nome,
      codigoEap: n.eap,
      disciplina: n.disc,
      tipo: n.tipo,
      o: n.o,
      m: n.m,
      p: n.p,
      durLb: n.durLb,
      sigma: n.sigma,
      es: esLb.get(u) ?? fEsVal,
      ef: efLb.get(u) ?? fEfVal,
      ls: lsLb.get(u) ?? fLsVal,
      lf: lfLb.get(u) ?? fLfVal,
      folga: (lsLb.get(u) ?? fLsVal) - (esLb.get(u) ?? fEsVal),
      criticaLb: criticalPathLb.includes(u),
      avancoPct: marcoAgilConcluido(u) ? 100 : av ? num(av.avanco_acumulado_pct) : 0,
      situacao: excluded.has(u) ? "EXCLUIDA" : marcoAgilConcluido(u) ? "CONCLUIDA" : av ? av.situacao : "NAO_INICIADA",
      dataInicioReal: av?.data_inicio_real ?? "",
      dataTerminoReal: av?.data_termino_real ?? "",
      forecastEs: fEsVal,
      forecastEf: fEfVal,
      forecastLs: fLsVal,
      forecastLf: fLfVal,
      forecastFolga: Math.max(0, fLsVal - fEsVal),
      criticaForecast: criticalPathForecast.includes(u),
      forecastStartDate: duToDateSafe(fEsVal),
      forecastEndDate: duToDateSafe(fEfVal),
      orcamento: orcMap.get(u) ?? 0,
    };
  });

  const params = getParamMap(db);
  const contratualDu = calH.lastDuOnOrBefore(params.data_termino_contratual || "2027-01-22");
  const atrasoContratualDu = Math.max(0, forecastEndDu - contratualDu);

  return {
    activities,
    duracaoLbDu,
    terminoLbDate: duToDateSafe(duracaoLbDu),
    criticalPathLb,
    sigmaCaminhoCriticoLb,
    forecastEndDu,
    forecastEndDate: duToDateSafe(forecastEndDu),
    criticalPathForecast,
    atrasoContratualDu,
  };
}

// ============================================================================
// CONVENÇÕES 3, 4, 5, 6, 7: VALOR AGREGADO (EVM)
// ============================================================================
export interface EVMSummary {
  ontPred: number;
  ontAgil: number;
  ontTotal: number;
  vpPred: number;
  vpAgil: number;
  vpTotal: number;
  vaPred: number;
  vaAgil: number;
  vaTotal: number;
  crPred: number;
  crAgil: number;
  crGestao: number;
  crTotal: number;
  idpPred: number;
  idcPred: number;
  idpAgil: number;
  idcAgil: number;
  idpTotal: number;
  idcTotal: number;
  entTotal: number;
  idptTotal: number;
  entregas: {
    codigo: string;
    nome: string;
    ont: number;
    vp: number;
    va: number;
    cr: number;
    idp: number;
    idc: number;
  }[];
  curvaS: { data: string; label: string; vp: number; va: number; cr: number }[];
}

export function computeEVM(
  db: ProjectDatabase,
  targetDate: string,
  calH: CalendarHelpers,
  network: NetworkResult
): EVMSummary {
  const params = getParamMap(db);
  const fatorHe = num(params.fator_hora_extra, 1.5);
  const eqCost = new Map(db["04_equipe"].map((p) => [p.id_pessoa, num(p.custo_hora_rs)]));
  const actMap = new Map(network.activities.map((a) => [a.id, a]));

  const evalEvmAtDate = (d: string) => {
    const du = calH.lastDuOnOrBefore(d);
    const latestAv = new Map<string, number>();
    for (const r of db["17_avanco_semanal"]) {
      if (r.semana_fim <= d) {
        const prev = latestAv.get(r.id_atividade);
        const val = num(r.avanco_acumulado_pct);
        if (prev === undefined || val >= prev) latestAv.set(r.id_atividade, val);
      }
    }

    let ontPred = 0;
    let vpPred = 0;
    let vaPred = 0;
    for (const a of network.activities) {
      if (a.tipo === "MARCO_AGIL" || a.codigoEap === "CENARIO") continue;
      ontPred += a.orcamento;
      if (du >= a.ef) vpPred += a.orcamento;
      else if (du >= a.es) vpPred += a.orcamento * ((du - a.es + 1) / Math.max(1, a.durLb));
      vaPred += a.orcamento * ((latestAv.get(a.id) ?? 0) / 100);
    }

    const plannedSprints = db["15_sprints"].filter((s) => s.planejada_na_linha_de_base === "1");
    const ontAgil = plannedSprints.reduce((acc, s) => acc + num(s.orcamento_sprint_rs), 0);
    let vpAgil = 0;
    for (const s of plannedSprints) {
      if (s.data_fim <= d) {
        vpAgil += num(s.orcamento_sprint_rs);
      } else if (s.data_inicio <= d) {
        const totalDu = Math.max(1, num(s.dias_uteis));
        const elapsed = calH.countWorkingDaysBetween(s.data_inicio, d);
        vpAgil += num(s.orcamento_sprint_rs) * Math.min(1, elapsed / totalDu);
      }
    }

    const lbItems = db["14_backlog_itens"].filter(
      (b) => b.origem === "PLANO_INICIAL" && b.prioridade_moscow !== "WONT"
    );
    const lbPtsTotal = lbItems.reduce((acc, b) => acc + num(b.pontos), 0);
    const lbPtsDone = lbItems
      .filter((b) => b.status === "CONCLUIDO" && b.data_conclusao && b.data_conclusao <= d)
      .reduce((acc, b) => acc + num(b.pontos), 0);
    const vaAgil = lbPtsTotal > 0 ? ontAgil * (lbPtsDone / lbPtsTotal) : 0;

    let crPred = 0;
    let crAgil = 0;
    let crGestao = 0;
    for (const c of db["19_custos_realizados"]) {
      if (c.data > d) continue;
      const v = num(c.valor_rs);
      if (c.frente === "PREDITIVA") crPred += v;
      else if (c.frente === "AGIL") crAgil += v;
      else if (c.frente === "GESTAO") crGestao += v;
    }
    for (const h of db["18_apontamento_horas"]) {
      const semFim = addDaysIso(h.semana_inicio, 4);
      if (semFim > d) continue;
      const cost = (num(h.horas_normais) + num(h.horas_extras) * fatorHe) * (eqCost.get(h.id_pessoa) ?? 0);
      if (h.tipo_item === "ATIVIDADE") crPred += cost;
      else if (h.tipo_item === "SPRINT") crAgil += cost;
      else if (h.tipo_item === "GESTAO") crGestao += cost;
    }

    return { ontPred, ontAgil, vpPred, vpAgil, vaPred, vaAgil, crPred, crAgil, crGestao };
  };

  const cur = evalEvmAtDate(targetDate);
  const ontTotal = cur.ontPred + cur.ontAgil;
  const vpTotal = cur.vpPred + cur.vpAgil;
  const vaTotal = cur.vaPred + cur.vaAgil;
  const crTotal = cur.crPred + cur.crAgil;

  const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);
  const idpTotal = safeDiv(vaTotal, vpTotal);
  const idcTotal = safeDiv(vaTotal, crTotal);
  const entTotal = idcTotal > 0 ? ontTotal / idcTotal : ontTotal;
  const idptTotal = ontTotal - crTotal !== 0 ? (ontTotal - vaTotal) / (ontTotal - crTotal) : 0;

  // Entregas (1.1 a 1.6)
  const entregasEap = db["06_eap"].filter((e) => e.tipo_elemento === "ENTREGA" && e.codigo_eap !== "1.7");
  const targetDu = calH.lastDuOnOrBefore(targetDate);
  const latestAvTarget = new Map<string, number>();
  for (const r of db["17_avanco_semanal"]) {
    if (r.semana_fim <= targetDate) {
      const prev = latestAvTarget.get(r.id_atividade);
      const val = num(r.avanco_acumulado_pct);
      if (prev === undefined || val >= prev) latestAvTarget.set(r.id_atividade, val);
    }
  }

  const entregas = entregasEap.map((ent) => {
    const actsEnt = network.activities.filter(
      (a) => a.tipo !== "MARCO_AGIL" && a.codigoEap.startsWith(ent.codigo_eap + ".")
    );
    const ont = actsEnt.reduce((a, b) => a + b.orcamento, 0);
    const vp = actsEnt.reduce((a, b) => {
      if (targetDu >= b.ef) return a + b.orcamento;
      if (targetDu >= b.es) return a + b.orcamento * ((targetDu - b.es + 1) / Math.max(1, b.durLb));
      return a;
    }, 0);
    const va = actsEnt.reduce((a, b) => a + b.orcamento * ((latestAvTarget.get(b.id) ?? 0) / 100), 0);
    const actIds = new Set(actsEnt.map((a) => a.id));
    let cr = db["19_custos_realizados"]
      .filter((c) => c.data <= targetDate && c.frente === "PREDITIVA" && (actIds.has(c.id_atividade) || c.codigo_eap.startsWith(ent.codigo_eap + ".")))
      .reduce((a, c) => a + num(c.valor_rs), 0);
    for (const h of db["18_apontamento_horas"]) {
      const semFim = addDaysIso(h.semana_inicio, 4);
      if (semFim <= targetDate && h.tipo_item === "ATIVIDADE" && actIds.has(h.id_item)) {
        cr += (num(h.horas_normais) + num(h.horas_extras) * fatorHe) * (eqCost.get(h.id_pessoa) ?? 0);
      }
    }
    return {
      codigo: ent.codigo_eap,
      nome: ent.nome,
      ont,
      vp,
      va,
      cr,
      idp: safeDiv(va, vp),
      idc: safeDiv(va, cr),
    };
  });

  // Curva S mensal + data de corte + statusDate
  const pontosCurva = [
    "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31", "2026-06-30",
    "2026-07-31", "2026-08-31", "2026-09-25", "2026-10-30",
  ];
  if (targetDate > "2026-10-30" && !pontosCurva.includes(targetDate)) {
    pontosCurva.push(targetDate);
  }
  const curvaS = pontosCurva
    .filter((d) => d <= targetDate || d <= "2026-10-30")
    .filter((d) => d <= targetDate)
    .map((d) => {
      const e = evalEvmAtDate(d);
      return {
        data: d,
        label: fmtDateBR(d).slice(0, 5),
        vp: Math.round((e.vpPred + e.vpAgil) / 100) / 10,
        va: Math.round((e.vaPred + e.vaAgil) / 100) / 10,
        cr: Math.round((e.crPred + e.crAgil) / 100) / 10,
      };
    });

  void actMap;
  return {
    ontPred: cur.ontPred,
    ontAgil: cur.ontAgil,
    ontTotal,
    vpPred: cur.vpPred,
    vpAgil: cur.vpAgil,
    vpTotal,
    vaPred: cur.vaPred,
    vaAgil: cur.vaAgil,
    vaTotal,
    crPred: cur.crPred,
    crAgil: cur.crAgil,
    crGestao: cur.crGestao,
    crTotal,
    idpPred: safeDiv(cur.vaPred, cur.vpPred),
    idcPred: safeDiv(cur.vaPred, cur.crPred),
    idpAgil: safeDiv(cur.vaAgil, cur.vpAgil),
    idcAgil: safeDiv(cur.vaAgil, cur.crAgil),
    idpTotal,
    idcTotal,
    entTotal,
    idptTotal,
    entregas,
    curvaS,
  };
}

// ============================================================================
// CONVENÇÕES 21, 22, 23: SIMULADOR DE CENÁRIOS (C1-C6 E COMBINAÇÕES)
// ============================================================================
export interface ScenarioSimulation {
  idKey: string;
  nome: string;
  scenarioIds: string[];
  terminoPrevistoDate: string;
  terminoPrevistoDu: number;
  atrasoContratualDu: number;
  mesesAtraso: number;
  entCenario: number;
  custoAtraso: number;
  vpl: number;
  paybackAnos: number | null;
  resultadoLiquido: number;
  fluxoAnual: { ano: number; investimento: number; beneficio: number; custoOp: number; fluxoLiquido: number; fluxoAcumulado: number }[];
  criticalPath: string[];
  oQueSePerde: string;
}

export function simulateScenarios(
  db: ProjectDatabase,
  statusDate: string,
  calH: CalendarHelpers,
  baseAgile: AgileMetrics,
  baseEvm: EVMSummary,
  baseNet: NetworkResult,
  scenarioIds: string[]
): ScenarioSimulation {
  const params = getParamMap(db);
  const tma = num(params.taxa_minima_de_atratividade_aa, 0.14);
  const custoAtrasoDu = num(params.custo_do_atraso_por_du_rs, 5400);

  const selected = db["43_cenarios"].filter((c) => scenarioIds.includes(c.id_cenario));
  const actMods = db["44_cenario_atividades"].filter((a) => scenarioIds.includes(a.id_cenario));
  const backMods = db["45_cenario_backlog"].filter((b) => scenarioIds.includes(b.id_cenario));
  const recMods = db["46_cenario_recursos"].filter((r) => scenarioIds.includes(r.id_cenario));

  // Backlog modificado
  const exclIds = new Set(backMods.filter((b) => b.acao === "EXCLUIR").map((b) => b.id_item));
  const inclMods = backMods.filter((b) => b.acao === "INCLUIR");
  const modBacklog = [
    ...db["14_backlog_itens"].filter((b) => !exclIds.has(b.id_item)),
    ...inclMods.map((x) => ({
      id_item: x.id_item,
      id_epico: x.id_epico,
      tipo_item: "HISTORIA",
      titulo: x.titulo,
      pontos: x.pontos,
      prioridade_moscow: "MUST",
      id_release: x.id_release,
      origem: "MUDANCA_APROVADA",
      status: "A_FAZER",
    })),
  ];

  const rampRecs = recMods.map((r) => ({
    gain: num(r.quantidade) * num(r.ganho_velocidade_pontos_por_sprint),
    rampSprints: num(r.sprints_de_rampa),
  }));

  const simAgile = computeAgileMetrics(db, statusDate, calH, modBacklog, rampRecs);
  const simNet = computeNetwork(db, statusDate, calH, simAgile, { actMods });

  // Convenção 22: ENT do cenário
  const costTab44 = actMods.reduce((acc, a) => acc + num(a.custo_adicional_rs), 0);
  const ptsIncl = inclMods.reduce((acc, b) => acc + num(b.pontos), 0);
  const ptsExcl = db["14_backlog_itens"]
    .filter((b) => exclIds.has(b.id_item))
    .reduce((acc, b) => acc + num(b.pontos), 0);
  const costRec = recMods.reduce(
    (acc, r) => acc + num(r.quantidade) * num(r.custo_mensal_rs) * num(r.meses),
    0
  );
  const invAdd = selected.reduce((acc, c) => acc + num(c.investimento_adicional_rs), 0);

  const entCenario =
    baseEvm.entTotal +
    costTab44 +
    (ptsIncl - ptsExcl) * baseAgile.custoRealPorPonto +
    costRec +
    invAdd;

  const custoAtraso = simNet.atrasoContratualDu * custoAtrasoDu;

  // Convenção 23: Fluxo de caixa, VPL, payback, resultado
  const varBenPct = selected.reduce((acc, c) => acc + num(c.variacao_beneficio_pct), 0) / 100;
  const varCop = selected.reduce((acc, c) => acc + num(c.variacao_custo_operacional_anual_rs), 0);

  const calDaysDelay = Math.max(0, calH.calendarDaysBetween(baseNet.terminoLbDate, simNet.forecastEndDate));
  let mesesAtraso = calDaysDelay / 30.4;

  // Parcela antecipada (ex: C6)
  const cAnt = selected.find((c) => num(c.parcela_beneficio_antecipada_pct) > 0 && c.id_atividade_gatilho);
  if (cAnt) {
    const gat = simNet.activities.find((a) => a.id === cAnt.id_atividade_gatilho);
    if (gat) {
      const gatDelayDays = Math.max(0, calH.calendarDaysBetween(baseNet.terminoLbDate, gat.forecastEndDate));
      const pAnt = num(cAnt.parcela_beneficio_antecipada_pct) / 100;
      mesesAtraso = pAnt * (gatDelayDays / 30.4) + (1 - pAnt) * (calDaysDelay / 30.4);
    }
  }

  let acum = 0;
  let vpl = 0;
  const fluxoAnual = db["02_caso_de_negocio"].map((row) => {
    const ano = Number(row.ano);
    let investimento = num(row.investimento_rs);
    let beneficio = num(row.beneficio_bruto_rs) * (1 + varBenPct);
    let custoOp = ano >= 1 ? num(row.custo_operacional_rs) + varCop : num(row.custo_operacional_rs);

    if (ano === 0) {
      investimento += entCenario - baseEvm.ontTotal;
    }
    let fluxoLiquido = beneficio - custoOp - investimento;
    if (ano === 1) {
      fluxoLiquido = fluxoLiquido * Math.max(0, 1 - mesesAtraso / 12);
    }
    acum += fluxoLiquido;
    vpl += fluxoLiquido / Math.pow(1 + tma, ano);
    return { ano, investimento, beneficio, custoOp, fluxoLiquido, fluxoAcumulado: acum };
  });

  // Payback simples com interpolação
  let paybackAnos: number | null = null;
  for (let i = 1; i < fluxoAnual.length; i++) {
    if (fluxoAnual[i - 1].fluxoAcumulado < 0 && fluxoAnual[i].fluxoAcumulado >= 0) {
      const prev = fluxoAnual[i - 1];
      const curr = fluxoAnual[i];
      paybackAnos = prev.ano + Math.abs(prev.fluxoAcumulado) / Math.max(1, curr.fluxoLiquido);
      break;
    }
  }

  const lossNotes: Record<string, string> = {
    C1: "Mantém o atraso de 32 du (R$ 172,8 mil de custo do atraso) e estouro de orçamento sem ação corretiva.",
    C2: "Aumenta desembolso imediato (+R$ 214,7 mil em compressão e reforço) e exige horas extras/equipe temporária.",
    C3: "Remove análise automática de danos (IA) e medição pós-lançamento; reduz benefício bruto (−1%) e entrega produto incompleto.",
    C4: "Amplia prazo para 44+ du de atraso e exige maior investimento inicial (+R$ 210 mil), pressionando caixa e equipe.",
    C5: "Descarta desenvolvimento próprio já investido no épico EP03 e cria dependência permanente de licença anual de terceiro.",
    C6: "Exige preparação operacional de onda 1 (+R$ 34,8 mil) e operação em paralelo entre praça piloto e expansão.",
  };

  return {
    idKey: scenarioIds.join("+"),
    nome: selected.map((s) => `${s.id_cenario} (${s.nome_cenario})`).join(" + "),
    scenarioIds,
    terminoPrevistoDate: simNet.forecastEndDate,
    terminoPrevistoDu: simNet.forecastEndDu,
    atrasoContratualDu: simNet.atrasoContratualDu,
    mesesAtraso,
    entCenario,
    custoAtraso,
    vpl,
    paybackAnos,
    resultadoLiquido: vpl - custoAtraso,
    fluxoAnual,
    criticalPath: simNet.criticalPathForecast,
    oQueSePerde: scenarioIds.map((id) => lossNotes[id] ?? "").filter(Boolean).join(" "),
  };
}

// ============================================================================
// CONFERÊNCIA DOS 13 NÚMEROS DE CONTROLE DO DOSSIÊ
// ============================================================================
export interface ControlCheck {
  label: string;
  obtido: number;
  esperado3010: number;
  esperado1311: number;
  format: "int" | "dec1" | "brl";
}

export function computeControlChecks(db: ProjectDatabase): ControlCheck[] {
  const horas = db["18_apontamento_horas"];
  const custos = db["19_custos_realizados"];
  const backlog = db["14_backlog_itens"];
  const trans = db["21_itens_transicoes"];
  const avanco = db["17_avanco_semanal"];
  const prod = db["42_producao_semanal"];
  const folha = db["39_cargos_salarios"];

  const sumHoras = horas.reduce((a, r) => a + num(r.horas_normais) + num(r.horas_extras), 0);
  const sumCustos = custos.reduce((a, r) => a + num(r.valor_rs), 0);
  const sumCustosPred = custos
    .filter((r) => r.frente === "PREDITIVA")
    .reduce((a, r) => a + num(r.valor_rs), 0);
  const conclBacklog = backlog.filter((r) => r.status === "CONCLUIDO");
  const ptsConcl = conclBacklog.reduce((a, r) => a + num(r.pontos), 0);
  const sumHh = prod.reduce((a, r) => a + num(r.hh_trabalhadas), 0);
  const sumFolha = folha.reduce((a, r) => {
    const enc = num(r.encargos_pct);
    return a + num(r.remuneracao_mensal_rs) * (1 + (enc > 1 ? enc / 100 : enc)) + num(r.beneficios_mensais_rs);
  }, 0);

  return [
    { label: "Horas apontadas (tab. 18)", obtido: sumHoras, esperado3010: 12579.5, esperado1311: 13319.5, format: "dec1" },
    { label: "Linhas apontamento horas (tab. 18)", obtido: horas.length, esperado3010: 418, esperado1311: 441, format: "int" },
    { label: "Custos lançados (tab. 19)", obtido: sumCustos, esperado3010: 2116731.44, esperado1311: 2205598.81, format: "brl" },
    { label: "Custos frente preditiva (tab. 19)", obtido: sumCustosPred, esperado3010: 1694947.79, esperado1311: 1725923.75, format: "brl" },
    { label: "Lançamentos de custo (tab. 19)", obtido: custos.length, esperado3010: 117, esperado1311: 121, format: "int" },
    { label: "Itens no backlog (tab. 14)", obtido: backlog.length, esperado3010: 129, esperado1311: 134, format: "int" },
    { label: "Itens concluídos (tab. 14)", obtido: conclBacklog.length, esperado3010: 98, esperado1311: 102, format: "int" },
    { label: "Pontos concluídos (tab. 14)", obtido: ptsConcl, esperado3010: 282, esperado1311: 291, format: "int" },
    { label: "Transições de status (tab. 21)", obtido: trans.length, esperado3010: 452, esperado1311: 479, format: "int" },
    { label: "Informes de avanço (tab. 17)", obtido: avanco.length, esperado3010: 147, esperado1311: 152, format: "int" },
    { label: "Homens-hora equipes (tab. 42)", obtido: sumHh, esperado3010: 4899, esperado1311: 4899, format: "int" },
    { label: "Linhas produção semanal (tab. 42)", obtido: prod.length, esperado3010: 38, esperado1311: 38, format: "int" },
    { label: "Folha mensal (tab. 39)", obtido: sumFolha, esperado3010: 288603.6, esperado1311: 288603.6, format: "brl" },
  ];
}
