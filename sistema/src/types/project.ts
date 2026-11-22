export type CsvRow = Record<string, string>;

export interface ProjectDatabase {
  "01_projeto_parametros": CsvRow[];
  "02_caso_de_negocio": CsvRow[];
  "03_partes_interessadas": CsvRow[];
  "04_equipe": CsvRow[];
  "05_matriz_alcadas": CsvRow[];
  "06_eap": CsvRow[];
  "07_atividades": CsvRow[];
  "08_dependencias": CsvRow[];
  "09_orcamento_linha_de_base": CsvRow[];
  "10_marcos": CsvRow[];
  "11_calendario": CsvRow[];
  "12_compressao_opcoes": CsvRow[];
  "13_epicos": CsvRow[];
  "14_backlog_itens": CsvRow[];
  "15_sprints": CsvRow[];
  "16_releases": CsvRow[];
  "17_avanco_semanal": CsvRow[];
  "18_apontamento_horas": CsvRow[];
  "19_custos_realizados": CsvRow[];
  "20_sprint_itens": CsvRow[];
  "21_itens_transicoes": CsvRow[];
  "22_impedimentos": CsvRow[];
  "23_implantacoes": CsvRow[];
  "24_defeitos": CsvRow[];
  "25_inspecoes_aceite": CsvRow[];
  "26_riscos_registro": CsvRow[];
  "27_riscos_ocorrencias": CsvRow[];
  "28_mudancas_solicitacoes": CsvRow[];
  "29_fornecedores": CsvRow[];
  "30_contratos": CsvRow[];
  "31_contratos_medicoes": CsvRow[];
  "32_propostas_fornecedores": CsvRow[];
  "33_reunioes": CsvRow[];
  "34_engajamento_mensal": CsvRow[];
  "35_pulso_equipe": CsvRow[];
  "36_okr_medicoes": CsvRow[];
  "37_funil_piloto_semanal": CsvRow[];
  "38_elementos_3d": CsvRow[];
  "39_cargos_salarios": CsvRow[];
  "40_alocacao_planejada": CsvRow[];
  "41_produtividade_referencia": CsvRow[];
  "42_producao_semanal": CsvRow[];
  "43_cenarios": CsvRow[];
  "44_cenario_atividades": CsvRow[];
  "45_cenario_backlog": CsvRow[];
  "46_cenario_recursos": CsvRow[];
}

export type TableName = keyof ProjectDatabase;

export interface AuditEntry {
  id: string;
  timestamp: string;
  registradoPor: string;
  tipo: string;
  resumo: string;
  dados: Record<string, unknown>;
}
