import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { AuditEntry, ProjectDatabase } from "../types/project";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

const STATE_ROW_ID = "g3-mare-seguros";

export interface CloudSyncResult {
  ok: boolean;
  message: string;
  updatedAt?: string;
}

export async function pushStateToSupabase(
  db: ProjectDatabase,
  statusDate: string,
  updatedBy: string
): Promise<CloudSyncResult> {
  if (!supabase) {
    return { ok: false, message: "Supabase não configurado (.env.local / variáveis de ambiente)." };
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from("war_room_state").upsert(
    {
      id: STATE_ROW_ID,
      grupo: "G3 - Maré Seguros",
      status_date: statusDate,
      payload: db,
      updated_by: updatedBy,
      updated_at: now,
    },
    { onConflict: "id" }
  );
  if (error) {
    return { ok: false, message: `Erro Supabase: ${error.message}` };
  }
  return { ok: true, message: "Base sincronizada na nuvem com sucesso.", updatedAt: now };
}

export async function pullStateFromSupabase(): Promise<{
  ok: boolean;
  db?: ProjectDatabase;
  statusDate?: string;
  updatedBy?: string;
  updatedAt?: string;
  message: string;
}> {
  if (!supabase) {
    return { ok: false, message: "Supabase não configurado." };
  }
  const { data, error } = await supabase
    .from("war_room_state")
    .select("*")
    .eq("id", STATE_ROW_ID)
    .maybeSingle();

  if (error) {
    return { ok: false, message: `Erro ao consultar Supabase: ${error.message}` };
  }
  if (!data) {
    return { ok: false, message: "Nenhum snapshot salvo ainda na tabela war_room_state." };
  }
  return {
    ok: true,
    db: data.payload as ProjectDatabase,
    statusDate: data.status_date,
    updatedBy: data.updated_by,
    updatedAt: data.updated_at,
    message: "Dados carregados do Supabase.",
  };
}

export async function logEntryToSupabase(entry: AuditEntry): Promise<void> {
  if (!supabase) return;
  await supabase.from("war_room_lancamentos").insert({
    tipo_lancamento: entry.tipo,
    registrado_por: entry.registradoPor,
    resumo: entry.resumo,
    dados: entry.dados,
  });
}

export async function fetchAuditLogFromSupabase(): Promise<AuditEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("war_room_lancamentos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id),
    timestamp: row.created_at,
    registradoPor: row.registrado_por,
    tipo: row.tipo_lancamento,
    resumo: row.resumo,
    dados: row.dados ?? {},
  }));
}
