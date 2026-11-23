import React, { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { buildCalendarHelpers, fmtBRL0, fmtDateBR, fmtNum, type ActivityCPM, type NetworkResult } from "../engine/calculations";
import type { ProjectDatabase } from "../types/project";

interface Props {
  db: ProjectDatabase;
  network: NetworkResult;
  statusDate: string;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Frente preditiva do projeto: EAP (tabela 06) com os pacotes e as atividades de cada um,
 * e o Gantt linha de base × previsão das 42 atividades (incluindo as 3 releases como marcos).
 * - Buscar (por código ou nome) filtra a EAP e o Gantt ao mesmo tempo.
 * - Clicar numa atividade da EAP destaca a linha dela no Gantt e rola até ela.
 * - Clicar num pacote destaca todas as atividades dele no Gantt.
 */
export const EapGanttView: React.FC<Props> = ({ db, network, statusDate }) => {
  const [pacoteSel, setPacoteSel] = useState<string | null>(null);
  const [ativSel, setAtivSel] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [soCritico, setSoCritico] = useState(false);
  const ganttRef = useRef<HTMLDivElement>(null);

  const calH = useMemo(() => buildCalendarHelpers(db["11_calendario"]), [db]);
  const statusDu = calH.lastDuOnOrBefore(statusDate);
  const contratualDu = calH.lastDuOnOrBefore("2027-01-22");

  const pessoas = useMemo(() => new Map(db["04_equipe"].map((p) => [p.id_pessoa, p.nome])), [db]);

  // ---- Busca: atividades que batem com o texto (código ou nome) ----
  const termo = norm(busca.trim());
  const bate = (a: ActivityCPM) => !termo || norm(`${a.id} ${a.nome}`).includes(termo);
  const algumaBusca = termo.length > 0;

  // ---- EAP: pacotes com avanço ponderado pela duração da linha de base ----
  const eap = db["06_eap"];
  const atividadesPorPacote = useMemo(() => {
    const m = new Map<string, ActivityCPM[]>();
    for (const a of network.activities) m.set(a.codigoEap, [...(m.get(a.codigoEap) ?? []), a]);
    for (const [k, v] of m) m.set(k, [...v].sort((x, y) => x.forecastEs - y.forecastEs));
    return m;
  }, [network]);

  const avancoDe = (a: ActivityCPM) => (a.situacao === "CONCLUIDA" ? 100 : a.avancoPct);
  const resumoPacote = (codigo: string) => {
    const acts = atividadesPorPacote.get(codigo) ?? [];
    const peso = acts.reduce((s, a) => s + a.durLb, 0);
    const avanco = peso > 0 ? acts.reduce((s, a) => s + a.durLb * avancoDe(a), 0) / peso : 0;
    const orcamento = acts.reduce((s, a) => s + a.orcamento, 0);
    const critico = acts.some((a) => a.criticaForecast);
    const fim = acts.reduce((mx, a) => (a.forecastEndDate > mx ? a.forecastEndDate : mx), "");
    return { acts, avanco, orcamento, critico, fim };
  };

  const togglePacote = (codigo: string) => {
    setAbertos((prev) => {
      const n = new Set(prev);
      if (n.has(codigo)) n.delete(codigo);
      else n.add(codigo);
      return n;
    });
  };
  const todosPacotes = eap.filter((e) => e.tipo_elemento === "PACOTE_DE_TRABALHO").map((e) => e.codigo_eap);
  const tudoAberto = abertos.size >= todosPacotes.length;

  const selecionarAtividade = (id: string) => {
    const novo = ativSel === id ? null : id;
    setAtivSel(novo);
    setPacoteSel(null);
    if (novo) {
      // rola o Gantt até a linha da atividade
      requestAnimationFrame(() => {
        const row = ganttRef.current?.querySelector<HTMLElement>(`[data-ativ="${novo}"]`);
        const box = ganttRef.current;
        if (row && box) {
          box.scrollTo({ top: row.offsetTop - box.clientHeight / 2, behavior: "smooth" });
          box.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    }
  };

  const limparSelecao = () => {
    setAtivSel(null);
    setPacoteSel(null);
    setBusca("");
  };

  // ---- Gantt ----
  const maxDu = Math.max(network.forecastEndDu, network.duracaoLbDu, contratualDu) + 5;
  const pctX = (du: number) => `${Math.max(0, Math.min(100, ((du - 1) / maxDu) * 100))}%`;
  const largura = (ini: number, fim: number) => `${Math.max(0.4, ((fim - ini + 1) / maxDu) * 100)}%`;

  const ticks = useMemo(() => {
    const t: { du: number; label: string }[] = [];
    let ultimoMes = "";
    for (let du = 1; du <= maxDu; du++) {
      const d = calH.duToDate.get(du);
      if (!d) continue;
      const mes = d.slice(0, 7);
      if (mes !== ultimoMes) {
        ultimoMes = mes;
        const m = Number(d.slice(5, 7)) - 1;
        // mês muito curto no início (ex.: projeto começa em 23/02) — mantém só o seguinte para não sobrepor
        if (t.length > 0 && du - t[t.length - 1].du < 8) t.pop();
        t.push({ du, label: m === 0 ? `${MESES[m]}/${d.slice(2, 4)}` : MESES[m] });
      }
    }
    return t;
  }, [calH, maxDu]);

  const entregas = eap.filter((e) => e.tipo_elemento === "ENTREGA");
  const linhasGantt = entregas.map((ent) => {
    const pacotes = eap.filter((p) => p.codigo_pai === ent.codigo_eap).map((p) => p.codigo_eap);
    const acts = network.activities
      .filter((a) => pacotes.includes(a.codigoEap))
      .filter((a) => !soCritico || a.criticaForecast)
      .filter(bate)
      .sort((a, b) => a.forecastEs - b.forecastEs);
    return { ent, acts };
  });
  const totalGantt = linhasGantt.reduce((s, l) => s + l.acts.length, 0);

  const destaqueAtivo = ativSel !== null || pacoteSel !== null;
  const ativSelObj = ativSel ? network.activities.find((a) => a.id === ativSel) : undefined;

  return (
    <div className="space-y-6">
      {/* EAP */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">EAP do projeto</h3>
            <p className="text-xs text-slate-400">
              6 entregas preditivas e o produto digital (1.7), cujas releases entram na rede como marcos. Abra um pacote
              para ver as atividades; clique numa atividade para achá-la no Gantt.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus-within:border-sky-500">
              <Search className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setAtivSel(null);
                }}
                placeholder="Buscar atividade (ex.: A27, piloto)"
                aria-label="Buscar atividade na EAP e no Gantt"
                className="w-52 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
              {busca && (
                <button onClick={() => setBusca("")} aria-label="Limpar busca" className="text-slate-500 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
            <button
              onClick={() => setAbertos(tudoAberto ? new Set() : new Set(todosPacotes))}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
            >
              {tudoAberto ? "Recolher atividades" : "Mostrar todas as atividades"}
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="text-left text-xs">
            <thead>
              <tr>
                <th>EAP</th>
                <th>Entrega / pacote / atividade</th>
                <th>Responsável</th>
                <th className="text-right">Orçamento</th>
                <th className="text-right">Avanço</th>
                <th>Término previsto</th>
              </tr>
            </thead>
            <tbody>
              {eap
                .filter((e) => e.tipo_elemento !== "PROJETO")
                .map((e) => {
                  const ehEntrega = e.tipo_elemento === "ENTREGA";
                  if (ehEntrega) {
                    const temAlgo = !algumaBusca || eap.some((p) => p.codigo_pai === e.codigo_eap && resumoPacote(p.codigo_eap).acts.some(bate));
                    if (!temAlgo) return null;
                    return (
                      <tr key={e.codigo_eap} className="bg-slate-800/40">
                        <td className="font-mono text-sky-300">{e.codigo_eap}</td>
                        <td colSpan={5} className="font-semibold text-white">
                          {e.nome}
                        </td>
                      </tr>
                    );
                  }
                  const r = resumoPacote(e.codigo_eap);
                  const atsVisiveis = r.acts.filter(bate);
                  if (algumaBusca && atsVisiveis.length === 0) return null;
                  const aberto = algumaBusca || abertos.has(e.codigo_eap);
                  const sel = pacoteSel === e.codigo_eap;
                  return (
                    <React.Fragment key={e.codigo_eap}>
                      <tr
                        onClick={() => {
                          togglePacote(e.codigo_eap);
                          setPacoteSel(sel ? null : e.codigo_eap);
                          setAtivSel(null);
                        }}
                        className={`cursor-pointer ${sel ? "linha-ativa" : ""}`}
                      >
                        <td className="font-mono text-sky-300">{e.codigo_eap}</td>
                        <td className="text-slate-200">
                          <span className="inline-flex items-center gap-1.5 pl-3">
                            {aberto ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            )}
                            <span className="font-medium">{e.nome}</span>
                            <span className="text-[11px] text-slate-500">({r.acts.length} ativ.)</span>
                            {e.disciplina === "AGI" && (
                              <span className="rounded bg-indigo-500/25 px-1.5 py-0.5 text-[10px] text-indigo-300">ágil</span>
                            )}
                            {r.critico && (
                              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">crítico</span>
                            )}
                          </span>
                        </td>
                        <td className="text-slate-300">{pessoas.get(e.id_responsavel) ?? e.id_responsavel}</td>
                        <td className="text-right font-mono">{r.orcamento > 0 ? fmtBRL0(r.orcamento) : ""}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full ${r.avanco >= 99.5 ? "bg-emerald-400" : "bg-sky-400"}`}
                                style={{ width: `${Math.min(100, r.avanco)}%` }}
                              />
                            </div>
                            <span className="w-9 font-mono">{fmtNum(r.avanco, 0)}%</span>
                          </div>
                        </td>
                        <td className="font-mono text-slate-300">{fmtDateBR(r.fim)}</td>
                      </tr>
                      {aberto &&
                        atsVisiveis.map((a) => {
                          const asel = ativSel === a.id;
                          return (
                            <tr
                              key={a.id}
                              onClick={() => selecionarAtividade(a.id)}
                              className={`cursor-pointer ${asel ? "linha-ativa" : ""}`}
                              title="Clique para achar no Gantt"
                            >
                              <td className="font-mono text-slate-500">{a.id}</td>
                              <td className="text-slate-300">
                                <span className="block pl-10">
                                  {a.nome}
                                  {a.tipo === "MARCO_AGIL" && (
                                    <span className="ml-2 rounded bg-indigo-500/25 px-1.5 py-0.5 text-[10px] text-indigo-300">release</span>
                                  )}
                                  {a.criticaForecast && (
                                    <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">crítica</span>
                                  )}
                                </span>
                              </td>
                              <td />
                              <td className="text-right font-mono text-slate-400">{a.orcamento > 0 ? fmtBRL0(a.orcamento) : ""}</td>
                              <td className="text-right font-mono text-slate-400">{fmtNum(avancoDe(a), 0)}%</td>
                              <td className="font-mono text-slate-400">{fmtDateBR(a.forecastEndDate)}</td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
          {algumaBusca && totalGantt === 0 && (
            <p className="mt-2 text-xs text-amber-300">Nenhuma atividade encontrada para "{busca}".</p>
          )}
        </div>
      </div>

      {/* Gantt */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Gantt: linha de base × previsão</h3>
            <p className="text-xs text-slate-400">
              Barra fina cinza = linha de base · barra cheia = previsão em {fmtDateBR(statusDate)} · vermelho = caminho
              crítico · roxo = release (marco ágil). Mesma rede do ProjectLibre.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={soCritico} onChange={(e) => setSoCritico(e.target.checked)} />
            Só caminho crítico
          </label>
        </div>

        {(destaqueAtivo || algumaBusca) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-950/30 px-3 py-2 text-xs text-slate-200">
            <span>
              {ativSelObj
                ? `Mostrando ${ativSelObj.id} · ${ativSelObj.nome} — ${fmtDateBR(ativSelObj.forecastStartDate)} a ${fmtDateBR(ativSelObj.forecastEndDate)}`
                : pacoteSel
                ? `Destacando o pacote ${pacoteSel}`
                : `Filtrando por "${busca}" (${totalGantt} atividade${totalGantt === 1 ? "" : "s"})`}
            </span>
            <button onClick={limparSelecao} className="ml-auto rounded border border-slate-600 px-2 py-0.5 text-slate-300 hover:bg-slate-800">
              Limpar
            </button>
          </div>
        )}

        <div ref={ganttRef} className="relative mt-3 max-h-[560px] overflow-auto rounded-xl border border-slate-800 bg-[#0b121a]">
          <div className="min-w-[760px]">
            {/* Eixo de meses */}
            <div className="sticky top-0 z-10 flex border-b border-slate-800 bg-[#0d1520] text-[10px] text-slate-400">
              <div className="w-56 shrink-0 px-3 py-2 font-semibold uppercase tracking-wide">Atividade</div>
              <div className="relative h-8 flex-1">
                {ticks.map((t) => (
                  <span key={t.du} className="absolute top-2 -translate-x-1/2 whitespace-nowrap" style={{ left: pctX(t.du) }}>
                    {t.label}
                  </span>
                ))}
              </div>
            </div>

            {linhasGantt.map(({ ent, acts }) =>
              acts.length === 0 ? null : (
                <div key={ent.codigo_eap}>
                  <div className="border-b border-slate-800/70 bg-slate-800/30 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
                    {ent.codigo_eap} · {ent.nome}
                  </div>
                  {acts.map((a) => {
                    const marco = a.tipo === "MARCO_AGIL";
                    const destacado = ativSel ? ativSel === a.id : pacoteSel ? pacoteSel === a.codigoEap : true;
                    const ehSel = ativSel === a.id;
                    const cor = a.criticaForecast ? "bg-rose-400" : marco ? "bg-indigo-400" : a.situacao === "CONCLUIDA" ? "bg-emerald-500/70" : "bg-sky-400";
                    return (
                      <div
                        key={a.id}
                        data-ativ={a.id}
                        onClick={() => selecionarAtividade(a.id)}
                        className={`flex cursor-pointer border-b border-slate-800/40 transition-opacity ${destacado ? "" : "opacity-25"} ${
                          ehSel ? "bg-sky-500/15 outline outline-1 outline-sky-400/60" : "hover:bg-slate-800/30"
                        }`}
                        title={`${a.id} · ${a.nome}\nLB: du ${a.es}–${a.ef} · Previsão: ${fmtDateBR(a.forecastStartDate)} a ${fmtDateBR(a.forecastEndDate)} · Avanço ${avancoDe(a)}%`}
                      >
                        <div className="w-56 shrink-0 truncate px-3 py-1 text-[11px] text-slate-300">
                          <span className="mr-1.5 font-mono text-sky-300">{a.id}</span>
                          {a.nome}
                        </div>
                        <div className="relative h-6 flex-1">
                          {/* linhas de referência */}
                          <div className="absolute inset-y-0 w-px bg-amber-300/60" style={{ left: pctX(statusDu) }} />
                          <div className="absolute inset-y-0 w-px border-l border-dashed border-rose-300/50" style={{ left: pctX(contratualDu) }} />
                          {/* linha de base */}
                          <div className="absolute top-1 h-1 rounded bg-slate-500/70" style={{ left: pctX(a.es), width: largura(a.es, a.ef) }} />
                          {/* previsão */}
                          <div
                            className={`absolute top-2.5 h-2.5 rounded ${cor}`}
                            style={{ left: pctX(a.forecastEs), width: largura(a.forecastEs, a.forecastEf) }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span><span className="mr-1 inline-block h-2 w-3 rounded bg-amber-300/70 align-middle" />Data de status</span>
          <span><span className="mr-1 inline-block h-2 w-3 rounded border border-dashed border-rose-300 align-middle" />Término contratual (22/01/2027)</span>
          <span><span className="mr-1 inline-block h-2 w-3 rounded bg-emerald-500/70 align-middle" />Concluída</span>
          <span><span className="mr-1 inline-block h-2 w-3 rounded bg-indigo-400 align-middle" />Release (marco ágil)</span>
          <span><span className="mr-1 inline-block h-2 w-3 rounded bg-rose-400 align-middle" />Caminho crítico</span>
        </div>
      </div>
    </div>
  );
};
