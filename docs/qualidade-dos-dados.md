# Qualidade dos Dados — Grupo 3: Maré Seguros

Auditoria sistemática das **46 tabelas CSV** da pasta `dados/` (histórico até `2026-10-30`) e reconciliação com os **Números de Controle** da Seção 3 do Dossiê do Grupo 3.

---

## 1. Resumo Executivo da Auditoria

Os arquivos originais em `dados/` apresentam **cinco classes de problemas de qualidade** propositais, compatíveis com apontamentos manuais e planilhas reais:

| Tabela | Problema identificado | Ocorrências | Ação de tratamento | Impacto nos números de controle |
|---|---|---:|---|---|
| `18_apontamento_horas.csv` | Linhas duplicadas exatas | 10 linhas | Remover duplicatas pela chave `(semana_inicio, id_pessoa, tipo_item, id_item)` | 428 → **418 linhas** (−324,5 h) |
| `18_apontamento_horas.csv` | Erro de digitação (`400.0` h normais em vez de `40.0` h) | 3 linhas | Corrigir `400.0` → `40.0` após validação de jornada semanal máxima | 13.659,5 h → **12.579,5 h** (−1.080,0 h) |
| `17_avanco_semanal.csv` | Semanas sem informe (lacunas de 14 dias) | 4 lacunas | Preencher semana faltante repetindo o último `avanco_acumulado_pct` informado (regra do Dicionário) | 143 → **147 informes** até 30/10 |
| `19_custos_realizados.csv` | Custos da frente `PREDITIVA` sem apropriação (`id_atividade` vazio e `codigo_eap = DIVERSOS`) | 6 lançamentos | Apropriar atividade e pacote EAP via medição (`31_contratos_medicoes.csv`) e documento fiscal (`NF-Axx`) | Mantém **117 lançamentos**, **R$ 2.116.731,44** total e **R$ 1.694.947,79** Preditiva (corrige EVM por atividade/EAP) |
| `21_itens_transicoes.csv` | `status_destino` fora do domínio canônico (caixa, espaços, acentos, inglês) | 22 linhas | Normalizar para `EM_ANDAMENTO`, `EM_REVISAO`, `EM_TESTE`, `CONCLUIDO` | Mantém **452 transições** (corrige métricas de fluxo e transições no quadro) |
| `25_inspecoes_aceite.csv` | `resultado` fora do domínio canônico (caixa e espaços) | 4 linhas | Normalizar para `APROVADO` e `APROVADO_COM_RESSALVA` | Corrige indicadores de qualidade da trilha preditiva |

> **Observação sobre tabela `04_equipe.csv` vs `39_cargos_salarios.csv`:** Todos os 18 `custo_hora_rs` da tabela `04_equipe.csv` conferem exatamente com o cálculo oficial `round((remuneracao * (1 + encargos) + beneficios) / horas_mensais)` da tabela `39_cargos_salarios.csv`, e a soma da folha mensal fecha exatamente em **R$ 288.603,60**.

---

## 2. Detalhamento dos Problemas Encontrados

### 2.1. `18_apontamento_horas.csv` — Duplicatas e Erros de Digitação

#### A) 10 linhas duplicadas exatas
As seguintes chaves `(semana_inicio, id_pessoa, tipo_item, id_item)` aparecem **duas vezes** com valores idênticos (totalizando **324,5 horas** contadas em duplicidade):

1. `2026-03-09` · `P04` · `ATIVIDADE` · `A04` (`23.0` h normais, `0.0` extra)
2. `2026-03-30` · `P01` · `GESTAO` · `GESTAO` (`32.0` h normais, `0.0` extra)
3. `2026-05-18` · `P09` · `ATIVIDADE` · `A26` (`21.5` h normais, `0.0` extra)
4. `2026-05-25` · `P01` · `GESTAO` · `GESTAO` (`40.0` h normais, `0.0` extra)
5. `2026-05-25` · `P16` · `SPRINT` · `S03` (`40.0` h normais, `0.0` extra)
6. `2026-06-08` · `P08` · `ATIVIDADE` · `A24` (`16.0` h normais, `0.0` extra)
7. `2026-07-20` · `P11` · `SPRINT` · `S07` (`40.0` h normais, `0.0` extra)
8. `2026-09-07` · `P11` · `SPRINT` · `S11` (`32.0` h normais, `0.0` extra)
9. `2026-10-05` · `P13` · `SPRINT` · `S13` (`40.0` h normais, `0.0` extra)
10. `2026-10-26` · `P12` · `SPRINT` · `S14` (`40.0` h normais, `0.0` extra)

#### B) 3 erros de digitação (`400.0` → `40.0`)
Três lançamentos registraram `400.0` horas normais em uma única semana (um zero extra na digitação de `40.0`, fisicamente impossível numa semana de 40h):

1. Linha 135: `2026-05-18` · `P01` (Helena) · `GESTAO` · `horas_normais = 400.0` → **`40.0`**
2. Linha 207: `2026-06-15` · `P17` (Marina) · `SPRINT` `S05` · `horas_normais = 400.0` → **`40.0`**
3. Linha 414: `2026-10-19` · `P17` (Marina) · `SPRINT` `S14` · `horas_normais = 400.0` → **`40.0`**

**Reconciliação:** `13.984,0` (bruto) − `324,5` (10 duplicatas) − `1.080,0` (3 × 360 h de erro de digitação) = **`12.579,5 horas`** e **`418 linhas`** (bate 100% com o controle até `30/10/2026`).

---

### 2.2. `17_avanco_semanal.csv` — Semanas Sem Informe

O arquivo contém **143 linhas**, mas há **4 lacunas de 14 dias** em atividades em andamento (semanas sem informe). Pela regra do Dicionário de Dados (*"Semana sem informe: vale o último valor informado"*), a semana faltante recebe o avanço acumulado da semana anterior:

1. **`A09`** — semana faltante **`2026-04-10`**: entre `2026-04-03` (`35%`) e `2026-04-17` (`90%`) → preencher com `35%` (`EM_ANDAMENTO`).
2. **`A18`** — semana faltante **`2026-09-25`**: entre `2026-09-18` (`80%`) e `2026-10-02` (`90%`) → preencher com `80%` (`EM_ANDAMENTO`).
3. **`A20`** — semana faltante **`2026-05-01`**: entre `2026-04-24` (`50%`) e `2026-05-08` (`65%`) → preencher com `50%` (`EM_ANDAMENTO`).
4. **`A20`** — semana faltante **`2026-05-15`**: entre `2026-05-08` (`65%`) e `2026-05-22` (`85%`) → preencher com `65%` (`EM_ANDAMENTO`).

> **Importância crítica:** A lacuna de `A18` em `2026-09-25` coincide exatamente com a data de corte da folha `M3` (`25/09/2026`). Sem o preenchimento, o cálculo do Valor Agregado (VA) nessa data ficaria subestimado!

**Reconciliação:** `143` + `4` = **`147 informes`** até `30/10/2026` (+ `5` informes do Boletim B1 até `13/11/2026` = **`152 informes`**).

---

### 2.3. `19_custos_realizados.csv` — Custos Sem Apropriação (`PREDITIVA`)

Seis lançamentos da frente `PREDITIVA` vieram com `id_atividade` vazio e `codigo_eap = DIVERSOS`, impedindo a alocação correta de Custo Real (CR) por atividade e por pacote/entrega da EAP. Todos são rastreáveis pelo campo `documento` e `31_contratos_medicoes.csv`:

| `id_lancamento` | Data | Documento | Valor (R$) | `id_atividade` correto | `codigo_eap` correto | Fonte da rastreabilidade |
|---|---|---|---:|---|---|---|
| `L00001` | `2026-03-06` | `MED-CT01-01` | 15.900,00 | `A01` | `1.1.1` | Medição `MED-CT01-01` (`31_contratos_medicoes`) |
| `L00027` | `2026-04-20` | `MED-CT07-01` | 37.140,00 | `A20` | `1.4.1` | Medição `MED-CT07-01` (`31_contratos_medicoes`) |
| `L00029` | `2026-04-23` | `MED-CT08-03` | 21.200,00 | `A22` | `1.4.2` | Medição `MED-CT08-03` (`31_contratos_medicoes`) |
| `L00030` | `2026-04-28` | `NF-A10-002` | 4.359,94 | `A10` | `1.2.3` | Prefixo `NF-A10` + atividade `A10` (`07_atividades`) |
| `L00042` | `2026-05-14` | `MED-CT03-03` | 15.011,84 | `A06` | `1.2.1` | Medição `MED-CT03-03` (`31_contratos_medicoes`) |
| `L00089` | `2026-08-26` | `NF-A08-002` | 13.140,21 | `A08` | `1.2.2` | Prefixo `NF-A08` + atividade `A08` (`07_atividades`) |

*(Nota: lançamentos da frente `AGIL` e `GESTAO` têm `id_atividade` e `codigo_eap` legitimamente vazios conforme o Dicionário de Dados.)*

---

### 2.4. `21_itens_transicoes.csv` — Padronização de Status

22 registros no campo `status_destino` apresentam grafias não canônicas (minúsculas, espaço no lugar de `_`, acento ou termo em inglês):

- `em_andamento` (2), `EM ANDAMENTO` (2) → **`EM_ANDAMENTO`**
- `EM REVISAO` (5), `Em revisão` (1) → **`EM_REVISAO`**
- `em_teste` (5), `Em teste` (2) → **`EM_TESTE`**
- `Concluído` (2), `concluido` (2), `DONE` (1) → **`CONCLUIDO`**

---

### 2.5. `25_inspecoes_aceite.csv` — Padronização de Resultado

4 registros no campo `resultado` apresentam grafias fora do domínio:

- `aprovado` (1), `Aprovado` (2) → **`APROVADO`**
- `APROVADO COM RESSALVA` (1) → **`APROVADO_COM_RESSALVA`**

---

## 3. Conferência Final dos Números de Controle

Após aplicar os tratamentos acima (e somar os Boletins `B1`–`B9` do dossiê para `13/11/2026`), **100% dos 13 indicadores de controle** conferem exatamente:

| Indicador | Até 30/10/2026 (Esperado = Obtido) | Até 13/11/2026 (Esperado = Obtido) |
|---|---:|---:|
| Horas apontadas (tab. 18) | 12.579,5 = **12.579,5** | 13.319,5 = **13.319,5** |
| Linhas de apontamento (tab. 18) | 418 = **418** | 441 = **441** |
| Custos lançados totais (tab. 19) | R$ 2.116.731,44 = **R$ 2.116.731,44** | R$ 2.205.598,81 = **R$ 2.205.598,81** |
| Custos frente preditiva (tab. 19) | R$ 1.694.947,79 = **R$ 1.694.947,79** | R$ 1.725.923,75 = **R$ 1.725.923,75** |
| Lançamentos de custo (tab. 19) | 117 = **117** | 121 = **121** |
| Itens no backlog (tab. 14) | 129 = **129** | 134 = **134** |
| Itens concluídos (tab. 14) | 98 = **98** | 102 = **102** |
| Pontos concluídos (tab. 14) | 282 = **282** | 291 = **291** |
| Transições de status (tab. 21) | 452 = **452** | 479 = **479** |
| Informes de avanço (tab. 17) | 147 = **147** | 152 = **152** |
| Homens-hora equipes (tab. 42) | 4.899 = **4.899** | 4.899 = **4.899** |
| Linhas produção semanal (tab. 42) | 38 = **38** | 38 = **38** |
| Folha mensal (tab. 39) | R$ 288.603,60 = **R$ 288.603,60** | R$ 288.603,60 = **R$ 288.603,60** |
