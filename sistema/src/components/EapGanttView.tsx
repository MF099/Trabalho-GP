import React, { useMemo, useState } from "react";
import { buildCalendarHelpers, fmtBRL0, fmtDateBR, fmtNum, type ActivityCPM, type NetworkResult } from "../engine/calculations";
import type { ProjectDatabase } from "../types/project";

interface Props {
  db: ProjectDatabase;
  network: NetworkResult;
  statusDate: string;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Frente preditiva do projeto: EAP (tabela 06) com o avanço de cada pacote e um Gantt
 * linha de base × previsão das 42 atividades (incluindo as 3 releases como marcos),
 * para conferir com o ProjectLibre. Clicar num pacote da EAP destaca as atividades dele no Gantt.
 */
export const EapGanttView: React.FC<Props> = ({ db, network, statusDate }) => {
  const [pacoteSel, setPacoteSel] = useState<string | null>(null);
  const [soCritico, setSoCritico] = useState(false);

  const calH = useMemo(() => buildCalendarHelpers(db["11_calendario"]), [db]);
  const statusDu = calH.lastDuOnOrBefore(statusDate);
  const contratualDu = calH.lastDuOnOrBefore("2027-01-22");

  const pessoas = useMemo(() => new Map(db["04_equipe"].map((p) => [p.id_pessoa, p.nome])), [db]);

  // ---- EAP: pacotes com avanço ponderado pela duração da linha de base ----
  const eap = db["06_eap"];
  const atividadesPorPacote = useMemo(() => {
    const m = new Map<string, ActivityCPM[]>();
    for (const a of network.activities) m.set(a.codigoEap, [...(m.get(a.codigoEap) ?? []), a]);
    return m;
  }, [network]);

  const resumoPacote = (codigo: string) => {
    const acts = atividadesPorPacote.get(codigo) ?? [];
    const peso = acts.reduce((s, a) => s + a.durLb, 0);
    const avanco = peso > 0 ? acts.reduce((s, a) => s + a.durLb * (a.situacao === "CONCLUIDA" ? 100 : a.avancoPct), 0) / peso : 0;
    const orcamento = acts.reduce((s, a) => s + a.orcamento, 0);
    const critico = acts.some((a) => a.criticaForecast);
    const fim = acts.reduce((mx, a) => (a.forecastEndDate > mx ? a.forecastEndDate : mx), "");
    return { acts, avanco, orcamento, critico, fim };
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
      .sort((a, b) => a.forecastEs - b.forecastEs);
    return { ent, acts };
  });

  return (
    <div className="space-y-6">
      {/* EAP */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-white">EAP do projeto</h3>
        <p className="text-xs text-slate-400">
          6 entregas preditivas e o produto digital (1.7), cujas releases entram na rede como marcos. Clique num pacote
          para vê-lo no Gantt.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="text-left text-xs">
            <thead>
              <tr>
                <th>EAP</th>
                <th>Entrega / pacote</th>
                <th>Responsável</th>
                <th>Atividades</th>
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
                  const r = ehEntrega ? null : resumoPacote(e.codigo_eap);
                  const sel = pacoteSel === e.codigo_eap;
                  return (
                    <tr
                      key={e.codigo_eap}
                      onClick={() => !ehEntrega && setPacoteSel(sel ? null : e.codigo_eap)}
                      className={`${ehEntrega ? "bg-slate-800/40" : "cursor-pointer"} ${sel ? "linha-ativa" : ""}`}
                    >
                      <td className="font-mono text-sky-300">{e.codigo_eap}</td>
                      <td className={ehEntrega ? "font-semibold text-white" : "pl-6 text-slate-200"}>
                        {e.nome}
                        {e.disciplina === "AGI" && (
                          <span className="ml-2 rounded bg-indigo-500/25 px-1.5 py-0.5 text-[10px] text-indigo-300">ágil</span>
                        )}
                        {r?.critico && (
                          <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">crítico</span>
                        )}
                      </td>
                      <td className="text-slate-300">{ehEntrega ? "" : pessoas.get(e.id_responsavel) ?? e.id_responsavel}</td>
                      <td className="font-mono text-slate-400">{r ? r.acts.map((a) => a.id).join(", ") : ""}</td>
                      <td className="text-right font-mono">{r && r.orcamento > 0 ? fmtBRL0(r.orcamento) : ""}</td>
                      <td className="text-right">
                        {r && (
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full ${r.avanco >= 99.5 ? "bg-emerald-400" : "bg-sky-400"}`}
                                style={{ width: `${Math.min(100, r.avanco)}%` }}
                              />
                            </div>
                            <span className="w-9 font-mono">{fmtNum(r.avanco, 0)}%</span>
                          </div>
                        )}
                      </td>
                      <td className="font-mono text-slate-300">{r ? fmtDateBR(r.fim) : ""}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
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

        <div className="mt-3 max-h-[560px] overflow-auto rounded-xl border border-slate-800 bg-[#0b121a]">
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
                    const destacado = pacoteSel === null || pacoteSel === a.codigoEap;
                    const cor = a.criticaForecast ? "bg-rose-400" : marco ? "bg-indigo-400" : a.situacao === "CONCLUIDA" ? "bg-emerald-500/70" : "bg-sky-400";
                    return (
                      <div
                        key={a.id}
                        className={`flex border-b border-slate-800/40 transition-opacity ${destacado ? "" : "opacity-25"}`}
                        title={`${a.id} · ${a.nome}\nLB: du ${a.es}–${a.ef} · Previsão: ${fmtDateBR(a.forecastStartDate)} a ${fmtDateBR(a.forecastEndDate)} · Avanço ${a.situacao === "CONCLUIDA" ? 100 : a.avancoPct}%`}
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
