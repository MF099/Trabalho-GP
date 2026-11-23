# Diário de Prompts — Grupo 3 · Maré Seguros

**Disciplina:** ENGN62 — Gestão de Projetos (2026.2) · Sala de Guerra das Duas Trilhas  
**Projeto:** Aplicativo de Aviso de Sinistro com Vistoria por Foto — Maré Seguros (Salvador/BA · Produto Digital)  
**Repositório:** `https://github.com/MF099/Trabalho-GP`  
**Sistema publicado:** `https://sistema-ruddy.vercel.app`  
**Data de referência dos dados:** `13/11/2026` (base tratada até `30/10/2026` + boletins `B1`–`B9`)

---

## Regras de Uso de IA Adotadas pelo Grupo

1. **Contexto único na raiz (`CONTEXTO.md`):** toda sessão de trabalho começou carregando `CONTEXTO.md`, o `DICIONARIO.md` (46 tabelas e 23 convenções) e os 13 números de controle do Dossiê G3.
2. **Conferência obrigatória (Papel × Sistema × Dossiê):** nenhum resultado gerado pela IA foi aceito sem conferência numérica contra o Dossiê (`30/10` e `13/11`), o caderno manuscrito (`M1`–`M8`) e o build de produção (`tsc -b && vite build`).
3. **Segurança e versionamento:** credenciais do Supabase ficaram estritamente em `sistema/.env.local` (listado no `.gitignore`) e nunca foram enviadas ao GitHub.
4. **Responsabilidade técnica:** cada integrante revisou, testou e validou as saídas antes de integrá-las ao repositório e aos documentos oficiais.

---

## Quadro Resumo das 10 Entradas

| # | Data | Integrante | Frente / Artefato | Principal Erro Detectado na IA |
| :-: | :-: | :--- | :--- | :--- |
| **01** | 22/11/2026 | Matheus França | ETL e Qualidade dos Dados (`scripts/tratar_dados.py`) | Ignorou 3 erros de digitação de `400 h` e 4 semanas sem informe (`A18` em `25/09`) |
| **02** | 22/11/2026 | Matheus França | Motor EVM e Rede CPM (`sistema/src/engine/`) | Erro de tipagem `CsvRow` (`spread`), nome de campo `alocPct` e ausência de `vite-env.d.ts` |
| **03** | 22/11/2026 | Matheus França | Simulador de Cenários C1–C6 (`calculations.ts`) | Cenário `C4` fechou em `05/04/2027` (`48 du`) em vez de `30/03/2027` (`44 du`) |
| **04** | 22/11/2026 | Matheus França | Módulo D17 — Mockups do Produto (`Product3DMockupsView.tsx`) | Priorizou 3D genérico e códigos fictícios em vez de telas do app com IDs `MS-*` reais |
| **05** | 22/11/2026 | Matheus França | Renderização Three.js (`Product3DMockupsView.tsx`) | Canvas 3D permanecia preso sobre a tela ao voltar para a aba de Mockups |
| **06** | 22/11/2026 | Matheus França | Auditoria de Mudanças e Alçadas (`GovernanceProcurementView.tsx`) | Tabela de auditoria comprimida em meia coluna com quebra de valores monetários |
| **07** | 23/11/2026 | Matheus França | Identidade Visual e Navegação (`App.tsx`, `index.css`) | Paleta grafite/oliva com cores padrão (amarelo/vermelho/verde) fora da marca Maré Seguros |
| **08** | 23/11/2026 | Matheus França | Lançamentos R3 (`DataEntryView.tsx`) e Deploy | Formulários manuais incompletos (faltavam telas individuais para `B4`, `B7` e `B9`) |
| **09** | 23/11/2026 | Matheus França | Geração dos 17 PDFs (`scripts/gerar_documentos.py`) | Contradição entre texto estratégico (`C2+C6`) e resultado calculado (`C4`) em `D12`/`D16` |
| **10** | 23/11/2026 | Matheus França | Pessoal e Produtividade (`D13`, `D14`, `PeopleProductivityView.tsx`) | Diagnóstico inicial confundiu baixa produtividade (`IP`) com falta de pessoal (`IE`) em `A11`/`A20` |

---

## Registro Detalhado das Entradas

### Entrada 01 — Auditoria e Saneamento das 46 Tabelas CSV (ETL)

- **Data:** `22/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `scripts/tratar_dados.py`, `dados_tratados/*.csv`, `docs/qualidade-dos-dados.md`

**O que pedimos (Prompt):**
> "Com base no `CONTEXTO.md`, no `DICIONARIO.md` e nos números de controle do Dossiê do Grupo 3 (Maré Seguros), escreva um script Python em `scripts/tratar_dados.py` que audite todas as 46 tabelas de `dados/` sem alterar os arquivos brutos. O script deve detectar e corrigir problemas reais de qualidade de dados (duplicatas, erros de digitação, informes semanais ausentes, lançamentos sem apropriação e textos não padronizados), exportar as tabelas limpas em `dados_tratados/` e imprimir um relatório comparativo batendo com os números de controle em `30/10/2026` e `13/11/2026`."

**O que a IA errou:**
- Na primeira versão do script, a IA removeu apenas as 10 linhas duplicadas exatas em `18_apontamento_horas.csv` (`-324,5 h`), mas não detectou os **3 erros de digitação de `400,0 h` normais** no lugar de `40,0 h` (`-1.080,0 h`), deixando o total de horas em `13.659,5 h` em vez de `12.579,5 h`.
- Também não preencheu os **4 informes semanais ausentes** em `17_avanco_semanal.csv` (`A09` em `10/04`, `A18` em `25/09` — data exata de corte da folha manuscrita `M3` — e `A20` em `01/05` e `15/05`), fazendo o contador ficar em `143` linhas em vez de `147`.

**Como conferimos e corrigimos:**
- Confrontamos o resumo do script com a tabela de 13 números de controle do Dossiê e localizamos as 3 linhas com `horas_normais == 400.0` e as 4 semanas sem reporte.
- Ajustamos `scripts/tratar_dados.py` para corrigir `400.0 -> 40.0`, preencher informes faltantes repetindo o último avanço válido da atividade, apropriar os 6 registros `DIVERSOS` de `19_custos_realizados.csv` (`L00001→A01`, `L00027→A20`, `L00029→A22`, `L00030→A10`, `L00042→A06`, `L00089→A08`) e normalizar 22 status em `21_itens_transicoes.csv` e 4 resultados em `25_inspecoes_aceite.csv`.
- Reexecutamos o script e confirmamos **100% de aderência** (`418` linhas / `12.579,5 h` em `30/10` e `441` linhas / `13.319,5 h` em `13/11`; `117` linhas / `R$ 2.116.731,44` em `30/10` e `121` / `R$ 2.205.598,81` em `13/11`), documentando cada correção em `docs/qualidade-dos-dados.md`.

---

### Entrada 02 — Motor de Cálculo EVM, Rede CPM e Build TypeScript

- **Data:** `22/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/engine/calculations.ts`, `sistema/src/engine/extraCalculations.ts`, `sistema/src/vite-env.d.ts`

**O que pedimos (Prompt):**
> "Implemente em TypeScript (`sistema/src/engine/calculations.ts` e `extraCalculations.ts`) o motor de cálculo oficial do projeto híbrido seguindo rigorosamente as 23 convenções do `DICIONARIO.md`: rede CPM de 42 atividades com caminho crítico e folgas, cálculo de Valor Agregado (VP, VA, CR, IDP, IDC, ENT com gestão tratada à parte), velocidade das últimas 5 sprints e previsão das releases R2 e R3. Ao final, execute `tsc -b && vite build` e valide os indicadores na data de corte `13/11/2026`."

**O que a IA errou:**
- Ao compilar com TypeScript estrito (`tsc -b`), o código quebrou em três pontos: (1) uso de spread (`...row`) sobre o tipo genérico `CsvRow` em `extraCalculations.ts`, que perdia as propriedades tipadas; (2) erro de digitação no nome da propriedade `alocPct` em vez de `alocacaoPct`; e (3) ausência de declaração de tipos para `import.meta.env` no Vite.

**Como conferimos e corrigimos:**
- Criamos `sistema/src/vite-env.d.ts` com `/// <reference types="vite/client" />`, substituímos os spreads genéricos por mapeamentos explícitos de campos e corrigimos `alocacaoPct`.
- Rodamos `npm run build` até zerar os erros de TypeScript e conferimos os números calculados no sistema contra o Dossiê em `13/11/2026`: `ONT = R$ 3.021.656`, `VP = R$ 2.819.937`, `VA = R$ 2.249.442`, `CR = R$ 3.003.891`, `IDP = 0,798`, `IDC = 0,749` e **`ENT = R$ 4.035.101`** (batendo ao centavo com o controle de `M7`).

---

### Entrada 03 — Simulador de Cenários (C1–C6) e Calendário de Sprints em Feriados

- **Data:** `22/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/engine/calculations.ts`, `sistema/src/components/ScenarioSimulatorView.tsx`, `scripts/doc_engine.py`

**O que pedimos (Prompt):**
> "Crie o simulador interativo dos 6 cenários de decisão do Dossiê (`C1` a `C6`) mais a combinação `C2+C4`, calculando para cada alternativa a nova data de término, o atraso em dias úteis frente à data contratual (`22/01/2027`), o novo ENT, o VPL, o Payback e o Resultado Líquido. Compare todos os valores com os números de controle da folha `M7` antes de finalizar."

**O que a IA errou:**
- Na primeira simulação, o Cenário **C4 (Ampliar escopo)** terminou em **`05/04/2027` (48 dias úteis de atraso)**, divergindo em 4 dias úteis do número de controle oficial **`30/03/2027` (44 dias úteis)**.
- A IA havia somado `+10 dias úteis` fixos por sprint futura, o que empurrava artificialmente o calendário toda vez que uma sprint atravessava feriados nacionais e locais registrados em `11_calendario.csv` (Natal, Ano Novo e Carnaval).

**Como conferimos e corrigimos:**
- Auditamos o cronograma de sprints manualmente no caderno `M7` e constatamos que as sprints seguem cadência fixa de **14 dias corridos** (ajustada ao último dia útil disponível em `11_calendario.csv` via `lastDuOnOrBefore()`).
- Aplicamos a mesma correção em TypeScript (`calculations.ts`) e Python (`doc_engine.py`). Todos os cenários passaram a bater exatamente com o Dossiê: `C1` (`11/03/2027`, `32 du`, `VPL R$ 30.634`), `C2` (`25/02/2027`, `22 du`, `VPL R$ -169.618`), `C3` (`11/03/2027`, `32 du`, `VPL R$ 37.506`), **`C4` (`30/03/2027`, `44 du`, `VPL R$ 186.640`, `Resultado R$ -50.960`)**, `C5` (`12/03/2027`, `33 du`) e `C6` (`11/03/2027`, `32 du`).

---

### Entrada 04 — Adequação do Módulo D17 para Produto Digital (Mockups com Backlog Real)

- **Data:** `22/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/components/Product3DMockupsView.tsx`

**O que pedimos (Prompt):**
> "Implemente o requisito R12 (`Product3DMockupsView.tsx`) respeitando o enquadramento do Grupo 3 como **Produto Digital** (aplicativo móvel de aviso de sinistro com vistoria por foto). O módulo deve exibir mockups interativos das telas do aplicativo vinculados aos itens reais de `14_backlog_itens.csv`, com seletor de data para acompanhar a evolução de `01/05` a `13/11`, filtro de impacto de cenários (`C3`/`C4`) e o mapa 3D da tabela `38_elementos_modelo_3d.csv` como visualização complementar."

**O que a IA errou:**
- Na primeira implementação, a IA colocou o viewer 3D como tela principal com rótulos genéricos de obra/planta e vinculou as telas de mockup a códigos ilustrativos que não existiam em `14_backlog_itens.csv`, além de omitir o controle temporal de evolução do produto.

**Como conferimos e corrigimos:**
- Revisamos o requisito de Produto Digital nos slides do trabalho e conferimos todos os códigos `MS-*` e épicos `EP01`–`EP08` na tabela `14_backlog_itens.csv`.
- Solicitamos a reestruturação do componente: aba principal **Mockups do Produto** com **14 telas navegáveis do app** mapeadas para IDs reais (`MS-001` a `MS-222`), controle deslizante e atalhos de data (`01/05` a `13/11`), simulação visual de corte/ampliação de escopo (`C3`/`C4`) e aba secundária **Mapa 3D Esquemático (Tab. 38)**.

---

### Entrada 05 — Correção de Vazamento de Canvas Three.js na Troca de Abas

- **Data:** `22/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/components/Product3DMockupsView.tsx`

**O que pedimos (Prompt):**
> "Durante os testes manuais no navegador, ao abrir a aba 'Mapa 3D Esquemático' e retornar para 'Mockups do Produto', o canvas WebGL do Three.js permanece congelado sobre a interface. Diagnostique a causa raiz no ciclo de vida do React/Three.js e corrija o desmontamento do renderer."

**O que a IA errou:**
- Na primeira tentativa de correção, a IA adicionou apenas `renderer.dispose()` no cleanup do `useEffect`, sem remover o elemento `<canvas>` (`renderer.domElement`) do container DOM e sem diferenciar as `<div>` dos dois ramos condicionais com `key` no React — o que fazia o React reaproveitar o mesmo nó DOM com o canvas preso.

**Como corrigimos e validamos:**
- Inspecionamos o DOM no navegador e pedimos para isolar os dois modos de visualização com `key="view-mockups"` e `key="view-3d"`, além de executar `if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)` junto ao `cancelAnimationFrame` e `renderer.dispose()`.
- Testamos a alternância rápida entre as duas abas por diversas vezes no navegador local e em produção, confirmando transição limpa e sem vazamento de memória WebGL.

---

### Entrada 06 — Layout da Auditoria de Mudanças × Matriz de Alçadas

- **Data:** `22/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/components/GovernanceProcurementView.tsx`

**O que pedimos (Prompt):**
> "Ajuste a tela de Riscos, Contratos e Governança (`GovernanceProcurementView.tsx`) para dar destaque executivo à auditoria das solicitações de mudança contra a matriz de alçadas (`08_matriz_alcadas.csv`), evidenciando as 4 violações aprovadas indevidamente pelo `GERENTE` (`SM-002`, `SM-004`, `SM-005`, `SM-011`) e o conflito de fornecedor envolvendo a `F04 VisionAI` (`32_propostas_fornecedores.csv`)."

**O que a IA errou:**
- A IA renderizou a tabela `Auditoria de Solicitações de Mudança × Matriz de Alçadas` dentro de um grid de duas colunas (50% da largura), comprimindo colunas numéricas, quebrando `R$ 15.000` em duas linhas e dificultando a leitura durante a apresentação ao comitê.

**Como conferimos e corrigimos:**
- Avaliamos o print da tela em resolução de notebook e orientamos a movimentação da tabela para largura integral (`col-span-full`), adição de espaçamento confortável (`px-3 py-2`), proteção contra quebra (`whitespace-nowrap`) nas colunas de valores e alçadas, e padronização da formatação monetária (`R$ 15.000`).

---

### Entrada 07 — Identidade Visual da Marca Maré Seguros e Menu Lateral

- **Data:** `23/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/App.tsx`, `sistema/src/index.css`, `sistema/public/mare_seguros.jpeg`

**O que pedimos (Prompt):**
> "Substitua a barra de navegação horizontal superior por um menu lateral vertical fixo, exiba a logo oficial `mare_seguros.jpeg` em tamanho de destaque no topo do menu e alinhe toda a paleta de cores do sistema (fundos, cartões, badges e gráficos) à identidade visual da Maré Seguros — eliminando tons estridentes de amarelo, vermelho vivo e verde neon que não combinam com a marca."

**O que a IA errou:**
- Em uma etapa intermediária, a IA aplicou uma paleta grafite com destaque verde-oliva e manteve a logo muito reduzida; em seguida, ao migrar para o azul-marinho, vários badges e gráficos herdaram cores padrão do Tailwind (`amber`, `rose`, `emerald`), criando ruído visual com tons amarelos, vermelhos e verdes vibrantes.

**Como conferimos e corrigimos:**
- Enviamos captura de tela da interface para revisão visual e definimos uma paleta fechada inspirada no escudo e na onda da logo oficial: **Azul Marinho Profundo** (`#0A1017` / `#0D2F52`), **Verde-Água Oceano** (`#139297` / `#2DD4BF`), **Areia Quente** (`#B89456` para alertas) e **Coral Suave** (`#B85D53` para desvios críticos).
- Remapeamos as escalas semânticas em `sistema/src/index.css`, ampliamos a logo na sidebar (`App.tsx`) e validamos visualmente todas as abas no navegador.

---

### Entrada 08 — Lançamentos Manuais da Quinzena (R3: B1–B9) e Publicação Segura

- **Data:** `23/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/components/DataEntryView.tsx`, `sistema/supabase_schema.sql`, `sistema/vercel.json`, `.gitignore`

**O que pedimos (Prompt):**
> "Complete a tela de Lançamentos (`DataEntryView.tsx`) para permitir tanto o registro manual individual de todos os boletins da quinzena (`B1` a `B9`) e do Boletim Surpresa ao vivo quanto a importação de CSV e a exclusão de lançamentos incorretos, sincronizando o estado com o Supabase. Garanta que o repositório esteja seguro para deploy automático na Vercel (`Root Directory = sistema`) sem vazar chaves."

**O que a IA errou:**
- Na primeira versão da tela de Lançamentos, a IA criou formulários manuais apenas para `B1` (avanço físico), `B2` (horas), `B3` (custos), `B5/B6` (backlog/transições) e `B8` (riscos/mudanças/ocorrências), deixando **`B4` (inspeções de aceite), `B7` (implantações) e `B9` (reuniões e pulso da equipe)** acessíveis apenas por importação em lote ou carga automática.

**Como conferimos e corrigimos:**
- Conferimos todos os 9 anexos (`B1`–`B9`) do Dossiê e constatamos que a equipe precisava poder lançar e corrigir qualquer boletim manualmente pela interface.
- Adicionamos os formulários completos para `B4`, `B7` e `B9` com botão de remoção individual no histórico de lançamentos, conferimos via `git status` que `sistema/.env.local` está ignorado e validamos a aplicação publicada em `https://sistema-ruddy.vercel.app`.

---

### Entrada 09 — Geração dos 17 Documentos Oficiais (`D01`–`D17`) e Coerência Estratégica

- **Data:** `23/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `scripts/doc_engine.py`, `scripts/gerar_documentos.py`, `docs/D01_*.pdf` até `docs/D17_*.pdf`

**O que pedimos (Prompt):**
> "Crie uma pipeline reproduzível em Python (`scripts/doc_engine.py` e `scripts/gerar_documentos.py`) para gerar todos os 17 documentos oficiais (`D01`–`D17`) em PDF dentro de `docs/`, usando os dados tratados até `13/11/2026`, gráficos de alta resolução em Matplotlib e exatamente a mesma identidade visual do aplicativo e da logo da Maré Seguros."

**O que a IA errou:**
- Ao inspecionar visualmente os PDFs gerados (`D01`, `D05` e `D16`), identificamos uma **incoerência grave entre o texto e os números** em `D12` e `D16`: o motor de cálculo apontava corretamente **`C4`** como o melhor resultado econômico (`VPL R$ 186.640`, `Resultado R$ -50.960`, ganho de `+R$ 91.206` sobre `C1`), mas o parágrafo de conclusão escrito pela IA recomendava a combinação `C2+C6`.

**Como conferimos e corrigimos:**
- Abrimos os PDFs renderizados para conferência página a página, reescrevemos a recomendação de `D12` e `D16` para sustentar integralmente a escolha de **`C4` (associado ao bloqueio de `F04 VisionAI`, retomada das alçadas e fim dos pedidos diretos de `PI02`)**, adicionamos a combinação **`C2+C4`** tanto nos documentos quanto no simulador web para comparação transparente e regeramos todos os 17 PDFs.

---

### Entrada 10 — Diagnóstico de Pessoal (`D13`) e Produtividade (`IP` vs. `IE` em `D14`)

- **Data:** `23/11/2026`
- **Responsável:** Matheus França
- **Artefatos:** `scripts/doc_engine.py`, `docs/D13_Pessoal_e_Custos_de_Pessoal.pdf`, `docs/D14_Produtividade_das_Equipes.pdf`, `sistema/src/components/PeopleProductivityView.tsx`

**O que pedimos (Prompt):**
> "Cruze as tabelas `04_equipe.csv`, `39_cargos_salarios.csv`, `18_apontamento_horas.csv` e `17_avanco_semanal.csv` para consolidar os custos de pessoal (`D13`) e os índices de produtividade (`IP`) e de esforço (`IE`) por atividade (`D14`), diferenciando tecnicamente atividades atrasadas por falta de alocação daquelas atrasadas por baixa produtividade."

**O que a IA errou:**
- Na primeira redação do diagnóstico de produtividade, a IA atribuiu o atraso das atividades `A11` e `A20` genericamente à "insuficiência de horas alocadas", misturando causa de capacidade (`IE`) com causa de rendimento (`IP`).

**Como conferimos e corrigimos:**
- Aplicamos as fórmulas oficiais do `DICIONARIO.md` e verificamos os valores exatos de cada atividade: **`A11` apresentou `IP = 0,64` com `IE = 0,93`** e **`A20` apresentou `IP = 0,69` com `IE = 0,88`**. Ou seja, o esforço realizado foi próximo ao planejado, provando que o problema é **baixa produtividade / retrabalho técnico** — não falta de horas.
- Validamos ainda a reconciliação 100% exata entre `04_equipe.csv` e `39_cargos_salarios.csv` para os 18 profissionais (folha mensal total de **R$ 288.603,60**) e atualizamos tanto `D13`/`D14` quanto o painel web.
