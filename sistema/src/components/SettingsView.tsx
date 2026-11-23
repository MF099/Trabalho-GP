import React, { useState } from "react";
import Papa from "papaparse";
import {
  Cloud,
  CloudDownload,
  Database,
  FileUp,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { isSupabaseConfigured, pullStateFromSupabase, pushStateToSupabase } from "../lib/supabase";
import type { AuditEntry, CsvRow, ProjectDatabase, TableName } from "../types/project";

interface Props {
  db: ProjectDatabase;
  statusDate: string;
  operador: string;
  auditLogs: AuditEntry[];
  onChangeStatusDate: (d: string) => void;
  onUpdateDb: (nextDb: ProjectDatabase, log?: AuditEntry) => void;
  onApplyQuinzena: () => void;
  onResetBase: () => void;
  onDeleteEntry: (entryId: string) => void;
  onClearLogs: () => void;
}

export const SettingsView: React.FC<Props> = ({
  db,
  statusDate,
  operador,
  auditLogs,
  onChangeStatusDate,
  onUpdateDb,
  onApplyQuinzena,
  onResetBase,
  onDeleteEntry,
  onClearLogs,
}) => {
  const [csvTable, setCsvTable] = useState<TableName>("18_apontamento_horas");
  const [statusMsg, setStatusMsg] = useState<string>("");

  const makeLog = (tipo: string, resumo: string, dados: Record<string, unknown>): AuditEntry => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    registradoPor: operador,
    tipo,
    resumo,
    dados,
  });

  const handlePushCloud = async () => {
    setStatusMsg("Salvando dados na nuvem...");
    const res = await pushStateToSupabase(db, statusDate, operador);
    setStatusMsg(res.message);
  };

  const handlePullCloud = async () => {
    setStatusMsg("Carregando dados salvos na nuvem...");
    const res = await pullStateFromSupabase();
    if (res.ok && res.db) {
      if (res.statusDate) onChangeStatusDate(res.statusDate);
      onUpdateDb(res.db, makeLog("SYNC_NUVEM", `Base carregada da nuvem (${res.updatedBy})`, {}));
    }
    setStatusMsg(res.message);
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
        onUpdateDb(next, makeLog("IMPORT_CSV", `Importou ${res.data.length} linhas em ${csvTable}`, { table: csvTable }));
        setStatusMsg(`Arquivo ${file.name} importado com sucesso (${res.data.length} registros em ${csvTable}).`);
      },
    });
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 px-4 py-3 text-xs font-medium text-sky-200">
          {statusMsg}
        </div>
      )}

      {/* 1. Carga Automática e Reinicialização */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-bold text-white">Carga Automática e Reset de Dados</h2>
        <p className="mt-1 text-xs text-slate-400">
          Use estas opções administrativas para preencher todos os boletins da quinzena (03 a 13/11) de uma só vez ou
          restaurar a base inicial limpa de 30/10/2026.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => {
              onApplyQuinzena();
              setStatusMsg("Todos os boletins da quinzena (B1–B9 até 13/11/2026) foram carregados automaticamente.");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
          >
            <Sparkles className="h-4 w-4" /> Carregar toda a quinzena automaticamente (B1–B9 até 13/11)
          </button>
          <button
            onClick={() => {
              onResetBase();
              setStatusMsg("Base restaurada para o histórico limpo de 30/10/2026. Todos os lançamentos manuais foram removidos.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-900/40"
          >
            <RotateCcw className="h-4 w-4" /> Apagar lançamentos e voltar para 30/10 (base inicial)
          </button>
        </div>
      </div>

      {/* 2. Sincronização na Nuvem (Supabase) & Importação CSV */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Database className="h-4 w-4 text-emerald-400" />
              Sincronização na Nuvem (Supabase)
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                isSupabaseConfigured ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {isSupabaseConfigured ? "Conectado" : "Modo Local"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Banco de dados online opcional usado para salvar os dados do projeto na nuvem e sincronizar entre diferentes
            computadores. Sem conexão configurada, tudo continua salvo localmente neste navegador.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={handlePushCloud}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500"
            >
              <Cloud className="h-4 w-4" /> Salvar na Nuvem
            </button>
            <button
              onClick={handlePullCloud}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              <CloudDownload className="h-4 w-4" /> Carregar da Nuvem
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <FileUp className="h-4 w-4 text-sky-400" />
            Importação em Lote via CSV
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Substitua qualquer tabela do banco enviando um arquivo <code className="text-slate-300">.csv</code> já
            padronizado no formato do dicionário de dados.
          </p>
          <div className="mt-4 space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-300">
                Tabela de destino
              </label>
              <select
                value={csvTable}
                onChange={(e) => setCsvTable(e.target.value as TableName)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {Object.keys(db).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700">
              <FileUp className="h-4 w-4" /> Selecionar e Importar CSV
              <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* 3. Gerenciar e Apagar Lançamentos Manuais */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white">
              Gerenciar e Apagar Lançamentos ({auditLogs.length} registros)
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Remova lançamentos manuais individuais registrados incorretamente ou limpe o histórico da sessão.
            </p>
          </div>
          {auditLogs.length > 0 && (
            <button
              onClick={() => {
                onClearLogs();
                setStatusMsg("Histórico de auditoria limpo.");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpar histórico
            </button>
          )}
        </div>

        <div className="mt-4 max-h-64 overflow-y-auto text-xs">
          {auditLogs.length === 0 ? (
            <p className="text-slate-500">Nenhum lançamento manual registrado nesta sessão.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-2 pr-3">Hora</th>
                  <th className="py-2 pr-3">Responsável</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Resumo</th>
                  <th className="py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 pr-3 font-mono text-slate-400">{l.timestamp.slice(11, 19)}</td>
                    <td className="py-2 pr-3 font-semibold text-sky-300">{l.registradoPor}</td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-slate-300">{l.tipo}</td>
                    <td className="py-2 pr-3 text-slate-200">{l.resumo}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => {
                          onDeleteEntry(l.id);
                          setStatusMsg(`Registro "${l.resumo}" removido.`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/30 px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-900/40"
                      >
                        <Trash2 className="h-3 w-3" /> Apagar
                      </button>
                    </td>
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
