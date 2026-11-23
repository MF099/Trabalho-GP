# Diário de Prompts — Grupo 3 · Maré Seguros

**Disciplina:** ENGN62 — Gestão de Projetos (2026.2) · Sala de Guerra das Duas Trilhas  
**Projeto:** Aplicativo de Aviso de Sinistro com Vistoria por Foto — Maré Seguros (Salvador/BA · Produto Digital)  
**Responsável:** Matheus França  
**Repositório:** `https://github.com/MF099/Trabalho-GP`  
**Sistema publicado:** `https://sistema-ruddy.vercel.app`  
**Data de referência dos dados:** `13/11/2026` (base tratada até `30/10/2026` + boletins `B1`–`B9`)

---

## Regras de Uso de IA Adotadas

1. **Contexto único na raiz (`CONTEXTO.md`):** toda sessão de trabalho partiu do `CONTEXTO.md`, do `DICIONARIO.md` (46 tabelas e 23 convenções) e dos 13 números de controle do Dossiê G3.
2. **Conferência obrigatória (Papel × Sistema × Dossiê):** nenhum resultado gerado pela IA foi aceito sem conferência numérica contra o Dossiê (`30/10` e `13/11`), o caderno manuscrito (`M1`–`M8`) e o build de produção (`tsc -b && vite build`).
3. **Segurança e versionamento:** credenciais do Supabase foram salvas exclusivamente em `sistema/.env.local` (listado no `.gitignore`) e nunca enviadas ao GitHub.

---

## Quadro Resumo das 15 Entradas

| # | Data / Hora | Integrante | Frente / Artefato | Erro ou ponto de revisão |
| :-: | :-: | :--- | :--- | :--- |
| **01** | 22/11 · 14:38 | Matheus França | ETL e Qualidade dos Dados (`scripts/tratar_dados.py`) | Removeu duplicatas, mas deixou passar 3 erros de `400 h` e 4 informes semanais ausentes |
| **02** | 22/11 · 15:04 | Matheus França | Motor EVM e Build TypeScript (`sistema/src/engine/`) | Quebrou o build (`CsvRow` spread, `alocPct`, falta de `vite-env.d.ts`) |
| **03** | 22/11 · 15:26 | Matheus França | Ambiente, Supabase e Cenário `C4` (`calculations.ts`) | Cenário `C4` fechou em `05/04/2027` (`48 du`) em vez de `30/03/2027` (`44 du`) |
| **04** | 22/11 · 19:43 | Matheus França | Módulo D17 — Produto Digital (`Product3DMockupsView.tsx`) | Priorizou 3D genérico e códigos fictícios em vez de telas do app com IDs `MS-*` reais |
| **05** | 22/11 · 20:00 | Matheus França | Auditoria de Mudanças × Alçadas (`GovernanceProcurementView.tsx`) | Tabela comprimida em meia coluna com quebra de valores monetários |
| **06** | 22/11 · 20:14 | Matheus França | Bug do Canvas Three.js (`Product3DMockupsView.tsx`) | Canvas 3D permanecia travado sobre a tela ao voltar para Mockups |
| **07** | 22/11 · 20:38 | Matheus França | Menu Lateral e Visual Executivo (`App.tsx`) | Primeira paleta grafite/oliva não combinava com a identidade da empresa |
| **08** | 22/11 · 20:56 | Matheus França | Logo e Paleta Maré Seguros (`App.tsx`, `index.css`) | Logo pequena e cores padrão (amarelo/vermelho/verde vivos) destoando da marca |
| **09** | 22/11 · 22:49 | Matheus França | Lançamentos Manuais R3 (`DataEntryView.tsx`) | Faltavam formulários manuais individuais para `B4`, `B7` e `B9` |
| **10** | 23/11 · 06:39 | Matheus França | Geração dos 17 PDFs (`scripts/gerar_documentos.py`) | Contradição entre texto estratégico (`C2+C6`) e resultado calculado (`C4`) em `D12`/`D16` |

| **11** | 23/11 | n4shville-jujuh | Nomes e navegação dos mockups | Galeria e fluxo passavam a impressão de uma jornada única |
| **12** | 23/11 | n4shville-jujuh | Tela inicial e navegação da Sala de Guerra | Resumo disperso e data de status dentro do menu no celular |
| **13** | 23/11 | n4shville-jujuh | Remoção do mapa 3D | Aba de mapa fora do escopo escolhido pelo grupo |
| **14** | 23/11 | n4shville-jujuh | Redesenho da interface dentro do celular | Atalhos estáticos e controles de demonstração dentro do celular |
| **15** | 23/11 | n4shville-jujuh | Fundo branco na tela do celular | Tela escura com pouca separação visual da moldura |

---

## Registro Detalhado das Entradas (Prompts Reais)

### Entrada 01 — Diagnóstico Inicial, `CONTEXTO.md` e Auditoria dos 46 CSVs

- **Data / Hora:** `22/11/2026 · 14:38`
- **Responsável:** Matheus França
- **Artefatos:** `CONTEXTO.md`, `scripts/tratar_dados.py`, `dados_tratados/*.csv`, `docs/qualidade-dos-dados.md`

**O que pedi (Prompt real):**
> "Gemini, preciso fazer esse trabalho mas não nem por onde comecar."

**O que a IA errou:**
- Na primeira passagem de auditoria das 46 tabelas de `dados/`, a IA detectou as 10 linhas duplicadas exatas em `18_apontamento_horas.csv` (`-324,5 h`), mas não percebeu inicialmente os **3 erros de digitação de `400,0 h` normais** no lugar de `40,0 h` (`-1.080,0 h`) nem os **4 informes semanais ausentes** em `17_avanco_semanal.csv` (`A09` em `10/04`, `A18` em `25/09` — data exata de `M3` — e `A20` em `01/05` e `15/05`).

**Como conferi e corrigimos:**
- Comparamos os totais contra os 13 números de controle do Dossiê G3 e ajustamos `scripts/tratar_dados.py` para corrigir `400.0 -> 40.0`, preencher os 4 informes faltantes repetindo o último avanço válido, apropriar os 6 custos `DIVERSOS` de `19_custos_realizados.csv` e normalizar 22 status em `21_itens_transicoes.csv` e 4 resultados em `25_inspecoes_aceite.csv`.
- Fechou **100%** nos números de controle (`12.579,5 h` em `30/10`, `13.319,5 h` em `13/11`, `R$ 2.116.731,44` em `30/10` e `R$ 2.205.598,81` em `13/11`), mantendo os CSVs brutos intactos.

---

### Entrada 02 — Mapeamento dos Entregáveis e Motor de Cálculo (EVM + CPM)

- **Data / Hora:** `22/11/2026 · 15:04`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/engine/calculations.ts`, `sistema/src/engine/extraCalculations.ts`, `sistema/src/vite-env.d.ts`

**O que pedi (Prompt real):**
> "Pode fazer. Mas antes disso, analisa os entregaveis que estão no slide. Tem algo que eu posso fazer em paralelo enquanto voce faz isso?"

**O que a IA errou:**
- Ao construir o motor em TypeScript (`tsc -b && vite build`), o código falhou na compilação por três erros: uso de spread (`...row`) sobre o tipo `CsvRow` perdendo chaves tipadas, erro de nome no campo `alocPct` (em vez de `alocacaoPct`) e ausência de tipagem para `import.meta.env` no Vite.

**Como conferi e corrigimos:**
- Criamos `sistema/src/vite-env.d.ts`, trocamos os spreads por mapeamentos tipados explícitos, corrigimos `alocacaoPct` e validamos o build limpo junto aos números de `13/11`: `ONT = R$ 3.021.656`, `VA = R$ 2.249.442`, `CR = R$ 3.003.891`, `IDP = 0,798`, `IDC = 0,749` e **`ENT = R$ 4.035.101`**.

---

### Entrada 03 — Instalação do Ambiente, Supabase Seguro e Divergência no Cenário `C4`

- **Data / Hora:** `22/11/2026 · 15:26`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/.env.local` (ignorado no Git), `.gitignore`, `sistema/src/engine/calculations.ts`

**O que pedi (Prompt real):**
> "Pode instalar tudo que for necessario. é isso aqui? https://lpgwfkqprdaddrylhnvx.supabase.co ou [chave publishable omitida por segurança] ou postgresql://postgres:[YOUR-DATABASE-PASSWORD]@db.lpgwfkqprdaddrylhnvx.supabase.co:5432/postgres"

**O que a IA errou:**
- Após configurar o ambiente e rodar o simulador de cenários (`C1`–`C6`), o Cenário **`C4` (Ampliar escopo)** fechou em **`05/04/2027` (48 du de atraso)** em vez do número de controle oficial **`30/03/2027` (44 du)**, porque a IA somou `+10 dias úteis` fixos por sprint ignorando os feriados de Natal, Ano Novo e Carnaval em `11_calendario.csv`.

**Como conferi e corrigimos:**
- Mantivemos a chave do Supabase apenas no `.env.local` (bloqueado no `.gitignore`) e ajustamos o simulador para avançar sprints em **14 dias corridos** com mapeamento via `lastDuOnOrBefore()` em `11_calendario.csv`. Todos os 6 cenários passaram a bater exatamente com o controle de `M7` (`C4`: `30/03/2027`, `44 du`, `VPL R$ 186.640`, `Resultado R$ -50.960`).

---

### Entrada 04 — Foco em Produto Digital no Módulo D17 (Mockups Interativos)

- **Data / Hora:** `22/11/2026 · 19:43`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/components/Product3DMockupsView.tsx`

**O que pedi (Prompt real):**
> "O emu produto é apenas o digital. Ou seja, o slide 17. Corrige isso no aplicativo"

**O que a IA errou:**
- Na primeira versão da aba, a IA deu destaque principal a um modelo 3D genérico e usou códigos ilustrativos de backlog que não existiam em `14_backlog_itens.csv`, além de não trazer controle temporal de evolução das telas.

**Como conferi e corrigimos:**
- Reestruturamos o componente para abrir diretamente em **Mockups do Produto**, com **14 telas navegáveis do app** vinculadas aos IDs reais `MS-*` de `14_backlog_itens.csv`, controle de data (`01/05` a `13/11`), filtro de cenários (`C3`/`C4`) e o Three.js como aba secundária (**Mapa 3D Esquemático — Tab. 38**).

---

### Entrada 05 — Ajuste da Tabela de Auditoria de Mudanças × Matriz de Alçadas

- **Data / Hora:** `22/11/2026 · 20:00`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/components/GovernanceProcurementView.tsx`

**O que pedi (Prompt real):**
> "Ajeita essa parte do aplicativo" *(com print anexado da tabela de Auditoria de Mudanças × Alçadas comprimida)*

**O que a IA errou:**
- A IA havia colocado a tabela `Auditoria de Solicitações de Mudança × Matriz de Alçadas` em meia largura (grid de 2 colunas), espremendo as colunas e quebrando valores como `R$ 15.000` em duas linhas.

**Como conferi e corrigimos:**
- Movemos a tabela para largura total (`col-span-full`), ajustamos o espaçamento (`px-3 py-2`) e travamos a quebra de linha (`whitespace-nowrap`) nas colunas de valores e alçadas, deixando claras as 4 violações (`SM-002`, `SM-004`, `SM-005`, `SM-011`).

---

### Entrada 06 — Correção do Bug do Canvas Three.js Preso na Tela

- **Data / Hora:** `22/11/2026 · 20:14`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/components/Product3DMockupsView.tsx`

**O que pedi (Prompt real):**
> "Corrige esse bug. Eu abri o mapa 3d e quando voltei ele nao voltou para a tela normal" *(com print anexado do canvas 3D sobreposto)*

**O que a IA errou:**
- O componente chamava `renderer.dispose()` no `useEffect`, mas não removia o elemento `<canvas>` (`renderer.domElement`) do DOM e reaproveitava a mesma estrutura de `<div>` sem `key` no React — mantendo o canvas 3D congelado na tela ao voltar para Mockups.

**Como conferi e corrigimos:**
- Adicionamos `key="view-mockups"` e `key="view-3d"` nos containers das duas abas e incluímos `container.removeChild(renderer.domElement)` explícito na limpeza do `useEffect`. Testei alternando várias vezes entre as abas e o bug foi resolvido.

---

### Entrada 07 — Navegação em Menu Lateral Vertical e Tom Executivo

- **Data / Hora:** `22/11/2026 · 20:38`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/App.tsx`, `sistema/src/index.css`

**O que pedi (Prompt real):**
> "Quero um sistema que navegue desse jeito. E quero as cores com um tom mais profissional." *(com print de referência de menu lateral vertical)*

**O que a IA errou:**
- A IA migrou corretamente para o menu lateral vertical, mas escolheu inicialmente uma paleta grafite com destaque oliva que não conversava com a identidade visual da Maré Seguros.

**Como conferi e corrigimos:**
- Aprovei o novo layout de navegação lateral e parti para a etapa seguinte trazendo a logo oficial da empresa para guiar a paleta definitiva.

---

### Entrada 08 — Logo Oficial Ampliada e Paleta Harmônica Maré Seguros

- **Data / Hora:** `22/11/2026 · 20:50 e 20:56`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/public/mare_seguros.jpeg`, `sistema/src/App.tsx`, `sistema/src/index.css`

**O que pedi (Prompts reais):**
> "Adicionei a logo do maré seguros na pasta. Adiciona esse logo e faz a paleta de acordo com a logo"  
> "Vamos ajustar isso aqui. Quero que a logo esteja maior e que altere a peleta para cores que combinem com a identidade visual. Por exemplo, tem cores amarelo, vermleho e verde que eu acho que nao combinam." *(com print do menu lateral)*

**O que a IA errou:**
- Na primeira aplicação da logo, ela ficou muito pequena dentro da caixa branca e vários indicadores/badges mantiveram cores padrão do Tailwind (amarelo, vermelho e verde vivos) que destoavam da identidade da marca.

**Como conferi e corrigimos:**
- Ampliamos a logo no topo da barra lateral e remapeamos todas as escalas de cor em `sistema/src/index.css` para **Azul Marinho Profundo** (`#0D2F52`), **Verde-Água Oceano** (`#139297` / `#2DD4BF`), **Areia Quente** (`#B89456`) e **Coral Suave** (`#B85D53`), conferindo visualmente no sistema publicado (`https://sistema-ruddy.vercel.app`).

---

### Entrada 09 — Formulários Manuais Completos da Quinzena (`B1`–`B9`)

- **Data / Hora:** `22/11/2026 · 22:49 e 22:52`
- **Responsável:** Matheus França
- **Artefatos:** `sistema/src/components/DataEntryView.tsx`

**O que pedi (Prompts reais):**
> "Nao entendi para que servem os outros B que voce nao falou nadad"  
> "Mas se eu quisesse eu conseguriia lancar tudo manualmente?"

**O que a IA errou:**
- Na primeira versão da aba de Lançamentos (`R3`), a IA havia criado formulários manuais apenas para `B1`, `B2`, `B3`, `B5/B6` e `B8`, deixando **`B4` (inspeções de aceite), `B7` (implantações) e `B9` (reuniões e pulso)** sem formulário individual na tela.

**Como conferi e corrigimos:**
- Adicionamos formulários manuais dedicados para `B4`, `B7` e `B9` com opção de apagar lançamentos incorretos no histórico, permitindo lançar todos os 9 boletins manualmente pela interface web.

---

### Entrada 10 — Geração dos 17 Documentos Oficiais (`D01`–`D17`) na Identidade Maré Seguros

- **Data / Hora:** `23/11/2026 · 06:39`
- **Responsável:** Matheus França
- **Artefatos:** `scripts/doc_engine.py`, `scripts/gerar_documentos.py`, `docs/D01_*.pdf` até `docs/D17_*.pdf`

**O que pedi (Prompt real):**
> "Faz os 17 documentos. Deixa eles na mesma paleta do aplicativo e da logo da empresa."

**O que a IA errou:**
- Ao revisar visualmente os PDFs gerados (`D01`, `D05` e `D16`), foi detectada uma contradição interna em `D12` e `D16`: o motor de cálculo apontava corretamente **`C4`** como o melhor resultado financeiro (`VPL R$ 186.640`, `Resultado R$ -50.960`), mas o texto narrativo recomendava `C2+C6`.

**Como conferi e corrigimos:**
- Alinhamos 100% da narrativa estratégica de `D12` e `D16` para a recomendação **`C4` (com bloqueio de `F04 VisionAI`, retomada das alçadas e fim dos pedidos diretos de `PI02`)**, incluímos a combinação **`C2+C4`** tanto nos PDFs quanto no simulador web e regeramos os 17 documentos na paleta oficial da Maré Seguros.

---

### Entrada 11 — Nomes e navegação dos mockups

- **Data:** 23/11/2026
- **Integrante (GitHub):** `n4shville-jujuh`
- **Artefatos:** `Product3DMockupsView.tsx`
- **Commit:** [`ef39dbf`](https://github.com/MF099/Trabalho-GP/commit/ef39dbf)

**O que pedi (prompt real)**

> Os nomes das telas é que estão muito complexos. Vamos melhorá-los. Vamo mudar o layout da aba de Mockups, a tela de celular que mostra realmente o app precisa estar mais centralizada / realista. Os status "entregue" e "em andamento" estão visualmente muito parecidos, conserta por favor. Se preciso, põe um skip ao lado do avançar fluxo, pra que uma etapa possa ser pulada quando not applicable

**O que precisou de revisão**

A explicação inicial tratou as telas como se fossem todas parte da jornada do segurado. A inspeção dos mockups mostrou visões de públicos diferentes e uma navegação que seguia a ordem da galeria.

**Como corrigimos e conferimos**

Simplificamos os nomes das 14 telas, centralizamos a prévia e distinguimos Entregue e Em andamento por cor e ícone. A opção Pular etapa foi aplicada às próximas telas opcionais ou fora do cenário escolhido. O TypeScript e o build passaram.

---

### Entrada 12 — Tela inicial e navegação da Sala de Guerra

- **Data:** 23/11/2026
- **Integrante (GitHub):** `n4shville-jujuh`
- **Artefatos:** `App.tsx`, `DashboardExecutive.tsx`, `index.css`
- **Commit:** [`5391cef`](https://github.com/MF099/Trabalho-GP/commit/5391cef)

**O que pedi (prompt real)**

> ótimo trabalho. vamos focar no front end do app agora, acho que você consegue manter a paleta de cores e deixar a interface do app mais bonitinha. (pode tentar usar o app do Bradesco como referência)

**O que precisou de revisão**

A interface anterior dispersava prazo, custo e decisão, e a data de status ficava dentro do menu no celular.

**Como corrigimos e conferimos**

Agrupamos as três respostas no painel inicial e incluímos atalhos para lançamentos, cronograma e protótipo. Movemos a data para o cabeçalho. O build passou e os atalhos, o seletor e o menu móvel foram testados no navegador local.

---

### Entrada 13 — Remoção do mapa 3D

- **Data:** 23/11/2026
- **Integrante (GitHub):** `n4shville-jujuh`
- **Artefatos:** `App.tsx`, `ProductMockupsView.tsx`, `package.json`
- **Commit:** [`e187a37`](https://github.com/MF099/Trabalho-GP/commit/e187a37)

**O que pedi (prompt real)**

> Apaga também a parte de "Mapa 3D Esquemático", não precisamos disso.

**O que precisou de revisão**

A implementação anterior ainda mantinha o mapa como aba secundária do protótipo, e o grupo decidiu retirar esse conteúdo.

**Como corrigimos e conferimos**

Removemos o mapa e a dependência do Three.js. O build passou e o navegador local confirmou as 14 telas e o funcionamento de Próxima tela.

---

### Entrada 14 — Redesenho da interface dentro do celular

- **Data:** 23/11/2026
- **Integrante (GitHub):** `n4shville-jujuh`
- **Artefatos:** `ProductMockupsView.tsx`
- **Commit:** [`35e7ff3`](https://github.com/MF099/Trabalho-GP/commit/35e7ff3)

**O que pedi (prompt real)**

> Muda a tela de mockup do app (pode tentar usar o app do Bradesco como referência), mantém a paleta de cores mas dê uma cara melhor ao mockup.

**O que precisou de revisão**

O protótipo exibia opções de serviço estáticas e misturava o botão de demonstração com a interface do segurado.

**Como corrigimos e conferimos**

A apólice ativa ganhou destaque, os atalhos de sinistro e vidros se tornaram navegáveis e o celular ganhou uma barra inferior. Próxima tela e Pular etapa foram movidos para fora da moldura. Testamos os atalhos e a opção de pular no navegador local.

---

### Entrada 15 — Fundo branco na tela do celular

- **Data:** 23/11/2026
- **Integrante (GitHub):** `n4shville-jujuh`
- **Artefatos:** `ProductMockupsView.tsx`
- **Commit:** [`a4ee1a8`](https://github.com/MF099/Trabalho-GP/commit/a4ee1a8)

**O que pedi (prompt real)**

> Faz o fundo do mockup ficar mais claro, como branco da logo do app. Queremos uma cor que destaque o mockup no celular

**O que precisou de revisão**

O redesenho ainda usava uma superfície escura dentro do celular, o que reduzia a separação visual entre a tela e a moldura.

**Como corrigimos e conferimos**

Aplicamos branco no interior, títulos em azul-marinho e superfícies suaves nos cartões e na navegação. Conferimos o fundo branco e o título azul-marinho no navegador local. O build passou.
