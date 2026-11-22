# CONTEXTO.md — Grupo 3: Maré Seguros (ENGN62 · 2026.2)

> **Leia este arquivo no início de toda conversa ou tarefa com IA.** Ele resume o caso do Grupo 3, a estrutura de dados, os números de controle, as convenções oficiais de cálculo e as entregas exigidas.

---

## 1. Resumo do Caso

- **Grupo:** Grupo 3 — **Maré Seguros** (`Salvador/BA`, Produto Digital)
- **Projeto:** Aplicativo de aviso de sinistro com vistoria por foto, análise de danos por IA e acompanhamento do conserto na rede de oficinas credenciadas.
- **Objetivo aprovado (Termo de Abertura):** Reduzir o prazo médio de regulação de sinistros de **11 para 4 dias** e o custo por sinistro regulado em **18% em 12 meses**.
- **Patrocinador:** Diretora de Operações — Samara Guimarães (`PI01`)
- **Início do projeto (dia útil 1):** `2026-02-23`
- **Término contratual:** `2027-01-22` (data da linha de base sai do cálculo da rede)
- **Data de status das análises:** `2026-11-13`
  - **Histórico nos CSVs (`dados/`):** `2026-02-23` até `2026-10-30` (fim da Sprint `S14`)
  - **Quinzena de campo (Dossiê, Anexo Boletins B1–B9):** `2026-11-03` a `2026-11-13` (Sprint `S15`) — deve ser digitada pelas telas do sistema web (e executada no Jira).
  - **Boletim surpresa:** entregue e lançado ao vivo na apresentação (4 min).
- **Orçamento no término (ONT):**
  - Frente Preditiva: **R$ 1.860.556,00** (42 atividades na tabela `07_atividades`: 39 estimadas + 3 marcos ágeis `AGI`)
  - Frente Ágil: **R$ 1.161.100,00** (17 sprints planejadas × R$ 68.300,00; desde `2026-04-20`, releases planejadas nas sprints 6, 12 e 17; itens `MS-nº`)
  - Projeto (soma das duas frentes): **R$ 3.021.656,00**
  - Gestão (`GESTAO` / `INDIRETO`): acompanhada à parte (orçamento indireto mensal de R$ 18.100,00/mês)
- **Reservas:** Contingência **R$ 73.000,00** · Gerencial **R$ 91.000,00**
- **Parâmetros-chave (`01_projeto_parametros.csv`):**
  - `custo_do_atraso_por_du_rs` = `5400.0` R$/du
  - `taxa_minima_de_atratividade_aa` = `0.14` (14% a.a.)
  - `fator_hora_extra` = `1.5`
  - `horas_por_dia` = `8` h
  - `duracao_da_sprint_semanas` = `2` semanas (`10` du, descontando feriados)
  - `velocidade_planejada_pontos` = `17.3` pontos/sprint
  - Pesos de fornecedores: Preço `0,35`, Técnica `0,30`, Prazo `0,15`, Experiência `0,10`, Garantia `0,10`.

### Arquitetura Híbrida (Duas Trilhas)
- **Trilha Ágil (`Jira` + `Sprints`):** desenvolve o produto digital em 8 épicos (`EP01`–`EP08`) e 3 releases (`R1`, `R2`, `R3`).
- **Trilha Preditiva (`ProjectLibre` + `EAP`):** adequação à Susep e LGPD, contratação e integração com provedor de IA de imagens, kits de vistoria para 40 oficinas, conteúdo e campanha, piloto com 40 oficinas e 25 corretores e entrada em operação.
- **Interfaces:** `R1`, `R2` e `R3` aparecem na rede preditiva como 3 marcos ágeis; o piloto depende de `R1` e a entrada em operação depende de `R2`.

---

## 2. Base de Dados (`dados/`, 46 tabelas CSV UTF-8)

- **Bloco A — Governança (01–05):** `01_projeto_parametros`, `02_caso_de_negocio`, `03_partes_interessadas`, `04_equipe`, `05_matriz_alcadas`
- **Bloco B — Plano Preditivo (06–12):** `06_eap`, `07_atividades`, `08_dependencias`, `09_orcamento_linha_de_base`, `10_marcos`, `11_calendario`, `12_compressao_opcoes`
- **Bloco C — Plano Ágil (13–16):** `13_epicos`, `14_backlog_itens`, `15_sprints`, `16_releases`
- **Bloco D — Execução (17–37):** `17_avanco_semanal`, `18_apontamento_horas`, `19_custos_realizados`, `20_sprint_itens`, `21_itens_transicoes`, `22_impedimentos`, `23_implantacoes`, `24_defeitos`, `25_inspecoes_aceite`, `26_riscos_registro`, `27_riscos_ocorrencias`, `28_mudancas_solicitacoes`, `29_fornecedores`, `30_contratos`, `31_contratos_medicoes`, `32_propostas_fornecedores`, `33_reunioes`, `34_engajamento_mensal`, `35_pulso_equipe`, `36_okr_medicoes`, `37_funil_piloto_semanal`
- **Bloco E — Modelo 3D / Mapa Esquemático (38):** `38_elementos_3d` (26 elementos)
- **Bloco F — Pessoas e Produtividade (39–42):** `39_cargos_salarios`, `40_alocacao_planejada`, `41_produtividade_referencia`, `42_producao_semanal`
- **Bloco G — Cenários de Decisão (43–46):** `43_cenarios` (`C1`–`C6`), `44_cenario_atividades`, `45_cenario_backlog`, `46_cenario_recursos`

Documentação completa dos campos em [DICIONARIO.md](file:///Users/matheus/Desktop/Trabalho%20GP/DICIONARIO.md). Tratamento dos erros encontrados nos CSVs em [docs/qualidade-dos-dados.md](file:///Users/matheus/Desktop/Trabalho%20GP/docs/qualidade-dos-dados.md).

---

## 3. Números de Controle (para validar sistema e análises)

| Controle | Até 30/10/2026 (CSV tratado) | Até 13/11/2026 (com Boletins B1–B9) |
|---|---:|---:|
| Horas apontadas (normais + extras), tab. 18 | 12.579,5 | 13.319,5 |
| Linhas de apontamento de horas, tab. 18 | 418 | 441 |
| Custos lançados (R$), tab. 19 | 2.116.731,44 | 2.205.598,81 |
| Custos da frente preditiva (R$), tab. 19 | 1.694.947,79 | 1.725.923,75 |
| Lançamentos de custo, tab. 19 | 117 | 121 |
| Itens no backlog, tab. 14 | 129 | 134 |
| Itens concluídos, tab. 14 | 98 | 102 |
| Pontos concluídos, tab. 14 | 282 | 291 |
| Transições de status, tab. 21 | 452 | 479 |
| Informes de avanço, tab. 17 (com semanas faltantes preenchidas) | 147 | 152 |
| Homens-hora das equipes, tab. 42 | 4.899 | 4.899 |
| Linhas de produção semanal, tab. 42 | 38 | 38 |
| Custo mensal da folha (R$), tab. 39 | 288.603,60 | 288.603,60 |

---

## 4. Resumo das 23 Convenções Oficiais de Cálculo

1. **Duração LB:** `ESTIMADA` → `ceil((O + 4M + P) / 6)`, desvio-padrão `(P - O) / 6`; `MARCO_AGIL` → `duracao_fixa_du`.
2. **Rede:** `TI`: `inicio >= termino_pred + 1 + defasagem`; `II`: `inicio >= inicio_pred + defasagem`. Tudo em `du`; `du = 1` em `2026-02-23`. LB usa datas mais cedo.
3. **ONT:** Preditiva = soma tab. 09; Ágil = soma `orcamento_sprint_rs` (`planejada_na_linha_de_base = 1`); Gestão à parte.
4. **VP:** Preditiva = linear pelos `du` da LB; Ágil = sprints encerradas + proporcional aos `du` decorridos da sprint em curso.
5. **VA:** Preditiva = último `avanco_acumulado_pct` até a data × orçamento da atividade; Ágil = ONT ágil × (`pontos_concluidos / pontos_totais`) do escopo da LB (`origem = PLANO_INICIAL` e `prioridade != WONT`).
6. **CR:** Lançamentos tab. 19 da frente + horas tab. 18 (semanas encerradas até a data) × `custo_hora_rs` (`horas_extras × fator_hora_extra`). `ATIVIDADE` → Preditiva; `SPRINT` → Ágil.
7. **Índices:** `IDP = VA / VP`, `IDC = VA / CR`, `ENT = ONT / IDC`, `IDPT = (ONT - VA) / (ONT - CR)`.
8. **Velocidade:** Soma pontos com `concluido_na_sprint = 1` (todas as origens/tipos). Média = média das últimas 5 sprints encerradas.
9. **Tempos de fluxo:** Tempo de ciclo = `du` da 1ª entrada em `EM_ANDAMENTO` até `CONCLUIDO` (contando os 2 extremos). Lead time = `du` da criação até `CONCLUIDO`.
10. **Previsão de release:** `pontos_restantes(Rj)` = não concluídos com `prioridade != WONT` de `R1..Rj`; `sprints_restantes = ceil(pontos_restantes / vel_media)`.
11. **Previsão pela rede:** Concluída = datas reais; Em andamento = termina em `data_status + ceil(dur_LB * (1 - avanco))`; Não iniciada = `dur_LB`, após predecessoras e nunca antes de `du_status + 1`; Marco ágil não concluído = data prevista da release.
12. **VME:** `probabilidade × impacto_custo`. Exposição = soma do VME das ameaças abertas.
13. **DORA:** Frequência (prod/semana), Lead time (mediana `tempo_ate_producao_h`), Taxa de falha (`falhou=1 / total`), MTTR (média `tempo_restauracao_h`).
14. **Multa:** `dias_corridos_atraso × multa_atraso_pct_dia × valor_contrato`, limitado a `teto_multa_pct`.
15. **Seleção de fornecedor:** `Σ peso × nota_norm` (Preço/Prazo: `min / valor`; Técnica: `nota / 10`; Exp/Garantia: `valor / max`).
16. **Caso de negócio:** `Fluxo líquido = benefício - custo_op - investimento`; VPL com TMA 14% a.a.; payback simples com interpolação.
17. **Custo de pessoal:** `custo_mensal = rem * (1 + enc) + ben`; `custo_hora = round(custo_mensal / horas_mensais)`. Custo no projeto vem das horas apontadas (conv. 6).
18. **Alocação:** `capacidade = du_no_projeto * 8 * alocacao_pct`; `utilizacao = horas_apontadas / capacidade`; semana pertence ao mês de `semana_inicio`. Preditiva compara apontado × planejado (tab. 40).
19. **Reajuste:** `media_mensal_ultimos_3_meses_fechados × meses_ate_termino_previsto × custo_hora_rs × reajuste`.
20. **Produtividade:** `real = qtd / Hh`; `IP = real / planejada`; `IE = efetivo / equipe_planejada`; `dur_rest = ceil(qtd_rest / (prod_acum * efetivo_3sem * 8))`. Ágil: pontos concluídos pelo responsável / horas em sprints.
21–23. **Cenários (`C1`–`C6`):** Ver regras detalhadas no fim de [DICIONARIO.md](file:///Users/matheus/Desktop/Trabalho%20GP/DICIONARIO.md).

---

## 5. Calendário e Regras de Trabalho com IA

- **Ponto de controle:** `2026-11-23` (10 min com sistema no ar)
- **Entrega digital:** `2026-11-24 23h59`
- **Apresentação + caderno físico:** `2026-11-25` ou `2026-11-30` (25 min: 12 min comitê + 4 min boletim surpresa + 9 min arguição)
- **Regras GitHub + IA:** Uma tarefa pequena por conversa/branch; conferir o que mudou antes de commitar; **nunca colocar senhas/chaves no repositório**; registrar 10 entradas de 3 pessoas em `docs/diario-de-prompts.md`.
