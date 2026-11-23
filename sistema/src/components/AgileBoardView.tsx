import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDaysIso, fmtDateBR, fmtNum, num, type AgileMetrics } from "../engine/calculations";
import type { ProjectDatabase } from "../types/project";
import { Detalhes } from "./ui";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  agile: AgileMetrics;
  onMoveCard: (itemId: string, toStatus: string) => void;
}

const COLUMNS = ["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "EM_TESTE", "CONCLUIDO"] as const;

export const AgileBoardView: React.FC<Props> = ({ db, statusDate, agile, onMoveCard }) => {
  const closedOrActiveSprints = db["15_sprints"]
    .filter((s) => s.data_inicio <= statusDate)
    .sort((a, b) => Number(a.numero) - Number(b.numero));
  const [selectedSprint, setSelectedSprint] = useState<string>(
    closedOrActiveSprints[closedOrActiveSprints.length - 1]?.id_sprint ?? "S14"
  );
  const [releaseFilter, setReleaseFilter] = useState<string>("ALL");

  const sprintObj = db["15_sprints"].find((s) => s.id_sprint === selectedSprint);
  const itemsInSprint = db["20_sprint_itens"].filter((si) => si.id_sprint === selectedSprint);
  const totalSprintPts = itemsInSprint.reduce((a, b) => a + num(b.pontos), 0);

  // Burndown da sprint selecionada (M5)
  const sprintDays: string[] = [];
  if (sprintObj) {
    for (const calRow of db["11_calendario"]) {
      if (calRow.data >= sprintObj.data_inicio && calRow.data <= sprintObj.data_fim && calRow.dia_util === "1") {
        sprintDays.push(calRow.data);
      }
    }
  }
  const backlogMap = new Map(db["14_backlog_itens"].map((b) => [b.id_item, b]));
  const burndownData = sprintDays.map((day, idx) => {
    const donePts = itemsInSprint.reduce((acc, si) => {
      const b = backlogMap.get(si.id_item);
      if (si.concluido_na_sprint === "1" && b?.data_conclusao && b.data_conclusao <= day) {
        return acc + num(si.pontos);
      }
      return acc;
    }, 0);
    const ideal =
      sprintDays.length > 0
        ? Math.max(0, totalSprintPts * (1 - (idx + 1) / sprintDays.length))
        : 0;
    return {
      dia: fmtDateBR(day).slice(0, 5),
      restante: Math.max(0, totalSprintPts - donePts),
      ideal: Math.round(ideal * 10) / 10,
    };
  });

  // Kanban cards: itens na sprint atual ou filtro de release
  const sprintItemIds = new Set(itemsInSprint.map((i) => i.id_item));
  const kanbanItems = db["14_backlog_itens"].filter((b) => {
    if (releaseFilter !== "ALL" && b.id_release !== releaseFilter) return false;
    if (sprintItemIds.size > 0 && releaseFilter === "ALL") return sprintItemIds.has(b.id_item);
    return true;
  });

  const openImps = db["22_impedimentos"].filter((i) => !i.data_fechamento);
  const pulso = db["35_pulso_equipe"];

  return (
    <div className="space-y-6">
      {/* KPIs Ágeis + DORA */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Ritmo da equipe</div>
          <div className="mt-1 text-xl font-bold text-white">{fmtNum(agile.velocidadeMedia, 1)} pts/sprint</div>
          <div className="mt-1 text-xs text-slate-400">Meta: 17,3 pts/sprint</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Release 2 prevista</div>
          <div className="mt-1 text-xl font-bold text-sky-300">{fmtDateBR(agile.dataPrevistaR2)}</div>
          <div className="mt-1 text-xs text-slate-400">Libera a entrada em operação</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Release 3 prevista</div>
          <div className="mt-1 text-xl font-bold text-white">{fmtDateBR(agile.dataPrevistaR3)}</div>
          <div className="mt-1 text-xs text-slate-400">Fim do escopo ágil</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Impedimentos abertos</div>
          <div className="mt-1 text-xl font-bold text-white">{openImps.length}</div>
          <div className="mt-1 text-xs text-slate-400">Bloqueios que travam a equipe</div>
        </div>
      </div>

      <Detalhes titulo="Métricas de fluxo e DORA (folha M5)">
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300 md:grid-cols-2">
          <p>
            Tempo de ciclo: <strong className="text-white">{fmtNum(agile.tempoCicloMedioDu, 1)} du</strong> · Lead
            time: <strong className="text-white">{fmtNum(agile.leadTimeMedioDu, 1)} du</strong> · WIP médio (Little):{" "}
            <strong className="text-white">{fmtNum(agile.wipMedioLittle, 1)} itens</strong>
          </p>
          <p>
            Implantações: <strong className="text-white">{fmtNum(agile.dora.freqPorSemana, 2)}/semana</strong> ·
            Falha: <strong className="text-white">{fmtNum(agile.dora.taxaFalhaPct, 1)}%</strong> · Lead mediana:{" "}
            {fmtNum(agile.dora.leadTimeMedianaH, 1)} h · MTTR: {fmtNum(agile.dora.mttrMediaH, 1)} h
          </p>
          <p>
            R2: {agile.sprintsRestantesR2} sprints restantes · R3: {agile.sprintsRestantesR3} sprints ·{" "}
            {agile.pontosRestantesR3} pts
          </p>
        </div>
      </Detalhes>

      {/* Gráficos: Burndown & Velocidade */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Burndown da sprint</h3>
              <p className="text-xs text-slate-400">Pontos que faltam a cada dia ({totalSprintPts} no total)</p>
            </div>
            <select
              value={selectedSprint}
              onChange={(e) => setSelectedSprint(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-white"
            >
              {closedOrActiveSprints.map((s) => (
                <option key={s.id_sprint} value={s.id_sprint}>
                  {s.id_sprint} ({fmtDateBR(s.data_inicio).slice(0, 5)}–{fmtDateBR(s.data_fim).slice(0, 5)})
                </option>
              ))}
            </select>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="dia" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                <Legend />
                <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#64748b" strokeDasharray="5 5" />
                <Line type="stepAfter" dataKey="restante" name="Restante Real" stroke="#38bdf8" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-sm font-semibold text-white">Velocidade por sprint</h3>
          <p className="mb-3 text-xs text-slate-400">Pontos colocados na sprint × pontos concluídos</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agile.velocidadesSprints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="id" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                <Legend />
                <Bar dataKey="pontosPlanejados" name="Na Sprint" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pontosConcluidos" name="Concluídos" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quadro Kanban Interativo */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Quadro da {releaseFilter === "ALL" ? `sprint ${selectedSprint}` : `release ${releaseFilter}`}
            </h3>
            <p className="text-xs text-slate-400">Mude o status no cartão para mover o item.</p>
          </div>
          <div className="flex gap-2">
            {["ALL", "R1", "R2", "R3"].map((r) => (
              <button
                key={r}
                onClick={() => setReleaseFilter(r)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  releaseFilter === r ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-300"
                }`}
              >
                {r === "ALL" ? `Sprint ${selectedSprint}` : `Release ${r}`}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {COLUMNS.map((col) => {
            const colItems = kanbanItems.filter((b) => b.status === col);
            return (
              <div key={col} className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-1.5 text-xs font-semibold text-slate-300">
                  <span>{col.replace("_", " ")}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">
                    {colItems.length}
                  </span>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {colItems.map((item) => (
                    <div key={item.id_item} className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-indigo-300">{item.id_item}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                          {item.pontos} pt
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-200">{item.titulo}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] text-slate-400">
                        <span>{item.origem === "PEDIDO_DIRETO" ? "⚠ DIRETO" : item.tipo_item}</span>
                        <select
                          value={item.status}
                          onChange={(e) => onMoveCard(item.id_item, e.target.value)}
                          className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-200"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {colItems.length === 0 && (
                    <div className="py-4 text-center text-[11px] text-slate-600">Sem cartões</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Defeitos recentes e Pulso da equipe */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-2 text-sm font-semibold text-white">Pulso da Equipe Ágil (1 a 5)</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pulso}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="id_sprint" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[2, 5]} stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                <Line type="monotone" dataKey="satisfacao_media" name="Satisfação Média" stroke="#34d399" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-2 text-sm font-semibold text-white">
            Defeitos por Ambiente ({db["24_defeitos"].length} registrados)
          </h3>
          <p className="mb-2 text-xs text-rose-300">
            Alerta: o pedido direto MS-222 originou {db["24_defeitos"].filter((d) => d.id_item_origem === "MS-222").length} defeitos!
          </p>
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-1">Defeito</th>
                  <th className="py-1">Item BUG</th>
                  <th className="py-1">Origem</th>
                  <th className="py-1">Ambiente</th>
                  <th className="py-1">Sev.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[...db["24_defeitos"]].reverse().slice(0, 12).map((d) => (
                  <tr key={d.id_defeito}>
                    <td className="py-1 font-mono text-sky-300">{d.id_defeito}</td>
                    <td className="py-1 font-mono">{d.id_item_defeito}</td>
                    <td className="py-1 font-mono text-amber-300">{d.id_item_origem}</td>
                    <td className="py-1">{d.ambiente_detectado}</td>
                    <td className="py-1">{d.severidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
void addDaysIso;
