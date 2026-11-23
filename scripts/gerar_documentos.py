"""Gera os 17 documentos oficiais (D01 a D17) em PDF na pasta docs/,
seguindo a identidade visual da Maré Seguros (logo + paleta azul-marinho, verde-água, areia e coral suave).
"""
import os
import subprocess
import tempfile
from collections import Counter, defaultdict

from doc_engine import (
    BASE_DIR,
    compute_all_metrics,
    f_brl,
    f_brl0,
    f_date,
    f_num,
    generate_charts,
    load_database_1311,
    logo_data_uri,
)

DOCS_DIR = os.path.join(BASE_DIR, "docs")
CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
os.makedirs(DOCS_DIR, exist_ok=True)


CSS_TEMPLATE = """
@page {
  size: A4;
  margin: 14mm 14mm 16mm 14mm;
}
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1E293B;
  font-size: 9.5pt;
  line-height: 1.45;
  margin: 0;
  padding: 0;
  background: #FFFFFF;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 3px solid #0D2F52;
  padding-bottom: 10px;
  margin-bottom: 14px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-box {
  width: 68px;
  height: 48px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
}
.logo-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scale(1.45);
}
.doc-code {
  display: inline-block;
  background: #139297;
  color: #FFFFFF;
  font-weight: 700;
  font-size: 8.5pt;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.4px;
  margin-bottom: 3px;
}
.doc-title {
  margin: 0;
  font-size: 14.5pt;
  font-weight: 800;
  color: #0D2F52;
  line-height: 1.15;
}
.doc-sub {
  margin: 2px 0 0 0;
  font-size: 8.5pt;
  color: #64748B;
}
.header-meta {
  text-align: right;
  font-size: 8pt;
  color: #475569;
  line-height: 1.4;
}
.header-meta strong { color: #0D2F52; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.kpi-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}
.kpi-card {
  background: #F4F8FA;
  border: 1px solid #DCE7EE;
  border-top: 3px solid #139297;
  border-radius: 6px;
  padding: 8px 10px;
}
.kpi-card.warn { border-top-color: #B89456; }
.kpi-card.alert { border-top-color: #B85D53; }
.kpi-card.navy { border-top-color: #0D2F52; }
.kpi-label {
  font-size: 7.5pt;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #64748B;
  font-weight: 600;
}
.kpi-val {
  font-size: 12.5pt;
  font-weight: 800;
  color: #0D2F52;
  margin-top: 2px;
}
.kpi-sub {
  font-size: 7.5pt;
  color: #475569;
  margin-top: 2px;
}

h2 {
  font-size: 11pt;
  font-weight: 700;
  color: #0D2F52;
  border-left: 4px solid #139297;
  padding-left: 8px;
  margin: 14px 0 7px 0;
  page-break-after: avoid;
}
p { margin: 0 0 7px 0; }
ul { margin: 4px 0 8px 18px; padding: 0; }
li { margin-bottom: 3px; }

table {
  width: 100%;
  border-collapse: collapse;
  margin: 6px 0 12px 0;
  font-size: 8pt;
}
thead th {
  background: #0D2F52;
  color: #FFFFFF;
  text-align: left;
  padding: 5px 6px;
  font-weight: 600;
  white-space: nowrap;
}
tbody td {
  padding: 4.5px 6px;
  border-bottom: 1px solid #E2E8F0;
  vertical-align: top;
}
tbody tr:nth-child(even) { background: #F8FAFC; }
tbody tr.highlight { background: #E6F4F4; font-weight: 700; }
tbody tr.alert-row { background: #FDF2F2; }
tbody tr.warn-row { background: #FBF7EE; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.center { text-align: center; }
.mono { font-family: "SFMono-Regular", Consolas, monospace; font-size: 7.6pt; }

.callout {
  background: #F4F8FA;
  border-left: 4px solid #139297;
  border-radius: 0 6px 6px 0;
  padding: 8px 11px;
  margin: 8px 0 12px 0;
  font-size: 8.6pt;
  page-break-inside: avoid;
}
.callout.warn { background: #FBF7EE; border-left-color: #B89456; }
.callout.alert { background: #FDF2F2; border-left-color: #B85D53; }
.callout strong { color: #0D2F52; }

.badge {
  display: inline-block;
  padding: 1.5px 6px;
  border-radius: 999px;
  font-size: 7.2pt;
  font-weight: 700;
  white-space: nowrap;
}
.b-teal { background: #E0F3F3; color: #0E6E72; }
.b-navy { background: #E5ECF3; color: #0D2F52; }
.b-sand { background: #F6EFE0; color: #8A6B32; }
.b-coral { background: #F9E5E3; color: #9A3F36; }

.chart-box {
  text-align: center;
  margin: 8px 0 12px 0;
  page-break-inside: avoid;
}
.chart-box img {
  max-width: 100%;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 4px;
  background: #FFFFFF;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.card {
  background: #F8FAFC;
  border: 1px solid #DCE7EE;
  border-radius: 6px;
  padding: 8px 10px;
  page-break-inside: avoid;
}
.footer-note {
  margin-top: 14px;
  padding-top: 6px;
  border-top: 1px solid #CBD5E1;
  font-size: 7.5pt;
  color: #64748B;
  display: flex;
  justify-content: space-between;
}
"""


def wrap_html(code, title, subtitle, body_html, logo_uri):
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>{code} — {title} | Maré Seguros</title>
<style>{CSS_TEMPLATE}</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo-box"><img src="{logo_uri}" alt="Maré Seguros" /></div>
      <div>
        <div class="doc-code">{code} · ESCRITÓRIO DE PROJETOS</div>
        <h1 class="doc-title">{title}</h1>
        <p class="doc-sub">{subtitle}</p>
      </div>
    </div>
    <div class="header-meta">
      <div><strong>Grupo 3 — Maré Seguros</strong></div>
      <div>ENGN62 · Gestão de Projetos (2026.2)</div>
      <div>Data de Status: <strong>13/11/2026</strong></div>
      <div>Sistema: sistema-ruddy.vercel.app</div>
    </div>
  </div>
  {body_html}
  <div class="footer-note">
    <span>Maré Seguros · Aplicativo de Aviso de Sinistro com Vistoria por Foto</span>
    <span>{code} — Gerado a partir da base reconciliada (13/11/2026)</span>
  </div>
</body>
</html>"""


def render_pdf(html_content, pdf_path):
    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as tf:
        tf.write(html_content)
        tmp_html = tf.name
    try:
        subprocess.run(
            [
                CHROME_BIN,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--no-pdf-header-footer",
                f"--print-to-pdf={pdf_path}",
                f"file://{tmp_html}",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    finally:
        if os.path.exists(tmp_html):
            os.remove(tmp_html)


def build_all_documents():
    db = load_database_1311()
    m = compute_all_metrics(db, "2026-11-13")
    charts = generate_charts(db, m)
    logo_uri = logo_data_uri()
    p = m["params"]
    net = m["net"]
    evm = m["evm_1113"]
    evm09 = m["evm_0925"]
    c1 = next(s for s in m["scens"] if s["id"] == "C1")
    best_sc = max(m["scens"], key=lambda s: s["resultado"])
    eq_map = {x["id_pessoa"]: x["nome"] for x in db["04_equipe"]}

    docs = []

    # ------------------------------------------------------------------
    # D01 — Termo de Abertura e Caso de Negócio
    # ------------------------------------------------------------------
    cn_rows = ""
    acum = 0.0
    vpl_base = 0.0
    tma = float(p["taxa_minima_de_atratividade_aa"])
    for r in db["02_caso_de_negocio"]:
        ano = int(r["ano"])
        inv, ben, cop = float(r["investimento_rs"]), float(r["beneficio_bruto_rs"]), float(r["custo_operacional_rs"])
        fl = ben - cop - inv
        acum += fl
        vpl_base += fl / ((1 + tma) ** ano)
        cn_rows += f"<tr><td class='center mono'>{ano}</td><td class='num'>{f_brl0(inv)}</td><td class='num'>{f_brl0(ben)}</td><td class='num'>{f_brl0(cop)}</td><td class='num'><strong>{f_brl0(fl)}</strong></td><td class='num'>{f_brl0(acum)}</td></tr>"

    d01 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">ONT Projeto (2 Frentes)</div><div class="kpi-val">{f_brl0(evm['ont'])}</div><div class="kpi-sub">Pred. {f_brl0(evm['ont_p'])} + Ágil {f_brl0(evm['ont_a'])}</div></div>
      <div class="kpi-card"><div class="kpi-label">VPL Caso de Negócio</div><div class="kpi-val">{f_brl0(vpl_base)}</div><div class="kpi-sub">TMA aprovada: 14,0% a.a.</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Término Contratual</div><div class="kpi-val">22/01/2027</div><div class="kpi-sub">Linha de Base rede: {f_date(net['end_lb'])} ({net['dur_lb']} du)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Custo do Atraso</div><div class="kpi-val">R$ 5.400/du</div><div class="kpi-sub">Conting. R$ 73k · Gerenc. R$ 91k</div></div>
    </div>
    <h2>1. Termo de Abertura do Projeto (Project Charter)</h2>
    <div class="callout">
      <strong>Objetivo Aprovado:</strong> {p['objetivo_do_projeto']}<br/>
      <strong>Patrocinadora:</strong> Samara Guimarães (Diretora de Operações — PI01) &nbsp;|&nbsp;
      <strong>Início (du 1):</strong> {f_date(p['data_inicio_projeto'])} &nbsp;|&nbsp;
      <strong>Natureza:</strong> Produto Digital Híbrido (Salvador/BA).
    </div>
    <p>A <strong>Maré Seguros</strong>, seguradora regional de automóveis, substitui o atual fluxo telefônico com vistoria presencial demorada por um aplicativo móvel de aviso de sinistro com vistoria guiada por foto, análise automática de danos por inteligência artificial e acompanhamento digital do conserto junto a 40 oficinas credenciadas e 25 corretores.</p>
    <div class="grid-2">
      <div class="card"><strong>Trilha Preditiva (ProjectLibre):</strong> Adequação regulatória Susep/LGPD, contratação e integração com provedor de IA de imagens, fornecimento de kits de vistoria para 40 oficinas, conteúdo/campanha, piloto operacional e entrada em operação (39 atividades + 3 marcos ágeis).</div>
      <div class="card"><strong>Trilha Ágil (Jira · Scrum):</strong> Desenvolvimento incremental do produto digital em 8 épicos (EP01–EP08), sprints quinzenais desde 20/04/2026 e 3 releases (R1 MVP na S06, R2 Operação na S12 e R3 Evolução na S17).</div>
    </div>
    <h2>2. Caso de Negócio Aprovado (Fluxo Anual — Tabela 02)</h2>
    <table>
      <thead><tr><th class="center">Ano</th><th class="num">Investimento</th><th class="num">Benefício Bruto</th><th class="num">Custo Operacional</th><th class="num">Fluxo Líquido</th><th class="num">Fluxo Acumulado</th></tr></thead>
      <tbody>{cn_rows}</tbody>
    </table>
    <div class="chart-box"><img src="{charts['d1_cashflow']}" /></div>
    """
    docs.append(("D01_Termo_de_Abertura_e_Caso_de_Negocio.pdf", "D01", "Termo de Abertura e Caso de Negócio", "Justificativa estratégica, metas, premissas híbridas e viabilidade econômico-financeira", d01))

    # ------------------------------------------------------------------
    # D02 — Partes Interessadas e Comunicação
    # ------------------------------------------------------------------
    eng_nov = {r["id_parte"]: r for r in db["34_engajamento_mensal"] if r["mes"] == "2026-11-01"}
    pi_rows = ""
    for pi in db["03_partes_interessadas"]:
        po, it = int(pi["poder"]), int(pi["interesse"])
        quad = "Gerenciar de perto" if po >= 4 and it >= 4 else ("Manter satisfeito" if po >= 4 else ("Manter informado" if it >= 4 else "Monitorar"))
        en = eng_nov.get(pi["id_parte"], {})
        cls = "alert-row" if en.get("nivel_engajamento") == "RESISTENTE" else ""
        pi_rows += f"<tr class='{cls}'><td class='mono'>{pi['id_parte']}</td><td><strong>{pi['parte_interessada']}</strong><br/><span style='color:#64748B'>{pi['contato']} ({pi['tipo']})</span></td><td class='center mono'>{po}×{it}</td><td>{quad}</td><td class='mono'>{pi['engajamento_inicial']} → {pi['engajamento_desejado']}</td><td><span class='badge {'b-coral' if en.get('nivel_engajamento')=='RESISTENTE' else 'b-teal'}'>{en.get('nivel_engajamento','—')} ({en.get('satisfacao','—')})</span></td></tr>"

    re_counts = Counter(r["tipo_reuniao"] for r in db["33_reunioes"])
    atas_ok = sum(1 for r in db["33_reunioes"] if r["ata_publicada"] == "1")
    patr_pres = sum(1 for r in db["33_reunioes"] if r["patrocinador_presente"] == "1")
    d02 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Partes Mapeadas</div><div class="kpi-val">{len(db['03_partes_interessadas'])}</div><div class="kpi-sub">7 internas · 6 externas</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Ponto Crítico (PI02)</div><div class="kpi-val">RESISTENTE</div><div class="kpi-sub">Dir. Comercial · Satisfação 2,7/10</div></div>
      <div class="kpi-card"><div class="kpi-label">Reuniões Realizadas</div><div class="kpi-val">{len(db['33_reunioes'])}</div><div class="kpi-sub">Atas publicadas: {atas_ok}/{len(db['33_reunioes'])}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Patrocinadora (PI01)</div><div class="kpi-val">NEUTRO (6,0)</div><div class="kpi-sub">Presença em {patr_pres} reuniões (queda de LIDERA)</div></div>
    </div>
    <h2>1. Registro de Partes Interessadas e Engajamento (Nov/2026)</h2>
    <table>
      <thead><tr><th>ID</th><th>Parte Interessada / Contato</th><th class="center">P×I</th><th>Estratégia</th><th>Inicial → Desejado</th><th>Atual (Nov/26)</th></tr></thead>
      <tbody>{pi_rows}</tbody>
    </table>
    <div class="chart-box"><img src="{charts['d2_pi']}" /></div>
    <h2>2. Plano de Comunicação e Diagnóstico de Ritos</h2>
    <div class="callout warn">
      <strong>Alerta de Engajamento:</strong> O Diretor Comercial (PI02, poder 4 × interesse 5) caiu para <strong>RESISTENTE (satisfação 2,7, zero interações em nov/26)</strong> após frustrações com o atraso da entrada em operação — justamente quem originou 9 pedidos diretos fora do controle de mudanças. A Patrocinadora (PI01) também recuou de LIDERA para NEUTRO (6,0).
    </div>
    <ul>
      <li><strong>Comitê Diretor ({re_counts['COMITE_DIRETOR']} reuniões):</strong> quinzenal com PI01, PI02, PI03, PI04 e PI11 para decisões de cenário, orçamento e alçadas.</li>
      <li><strong>Status Semanal ({re_counts['STATUS_SEMANAL']} reuniões):</strong> semanal com líderes de disciplina preditiva e PMO; reforçar publicação obrigatória de ata.</li>
      <li><strong>Cerimônias Scrum:</strong> Planejamento ({re_counts['PLANEJAMENTO_DA_SPRINT']}), Revisão ({re_counts['REVISAO_DA_SPRINT']}) e Retrospectiva ({re_counts['RETROSPECTIVA']}) quinzenais com participação ativa de PI02 e representantes do piloto (PI09).</li>
    </ul>
    """
    docs.append(("D02_Partes_Interessadas_e_Comunicacao.pdf", "D02", "Partes Interessadas e Comunicação", "Mapeamento Poder × Interesse, engajamento mensal e governança de comunicação", d02))

    # ------------------------------------------------------------------
    # D03 — EAP e Dicionário da EAP
    # ------------------------------------------------------------------
    acts_by_eap = defaultdict(list)
    for a in db["07_atividades"]:
        acts_by_eap[a["codigo_eap"]].append(a["id_atividade"])
    eap_rows = ""
    for e in db["06_eap"]:
        pad = "&nbsp;&nbsp;" * (int(e["nivel"]) - 1) * 2
        cls = "highlight" if e["nivel"] == "1" else ("warn-row" if e["nivel"] == "2" else "")
        aids = ", ".join(acts_by_eap.get(e["codigo_eap"], [])) or "—"
        eap_rows += f"<tr class='{cls}'><td class='mono'>{e['codigo_eap']}</td><td>{pad}<strong>{e['nome']}</strong></td><td class='mono'>{e['tipo_elemento']}</td><td>{eq_map.get(e['id_responsavel'], e['id_responsavel'])}</td><td class='mono'>{aids}</td><td>{e['criterio_de_aceite'] or '—'}</td></tr>"

    d03 = f"""
    <div class="kpi-grid kpi-grid-3">
      <div class="kpi-card navy"><div class="kpi-label">Estrutura da EAP</div><div class="kpi-val">1 Projeto · 7 Entregas</div><div class="kpi-sub">18 Pacotes de Trabalho (substantivos)</div></div>
      <div class="kpi-card"><div class="kpi-label">Regra de Nomenclatura</div><div class="kpi-val">100% Entregas</div><div class="kpi-sub">Pacotes = entregas; atividades = verbo no infinitivo</div></div>
      <div class="kpi-card"><div class="kpi-label">Cobertura de Escopo</div><div class="kpi-val">42 Atividades</div><div class="kpi-sub">39 preditivas + 3 marcos ágeis (1.7.1–1.7.3)</div></div>
    </div>
    <h2>Estrutura Analítica do Projeto (EAP) e Dicionário Oficial (Tabela 06)</h2>
    <table>
      <thead><tr><th>Código</th><th>Elemento da EAP (Entrega / Pacote)</th><th>Tipo</th><th>Responsável</th><th>Atividades</th><th>Critério de Aceite</th></tr></thead>
      <tbody>{eap_rows}</tbody>
    </table>
    """
    docs.append(("D03_EAP_e_Dicionario_da_EAP.pdf", "D03", "EAP e Dicionário da EAP", "Decomposição hierárquica em entregas, pacotes de trabalho, responsáveis e critérios de aceite", d03))

    # ------------------------------------------------------------------
    # D04 — Cronograma no ProjectLibre e Caminho Crítico
    # ------------------------------------------------------------------
    m_rows = ""
    act_by_id = {a["id"]: a for a in net["acts"]}
    for mc in db["10_marcos"]:
        a = act_by_id.get(mc["id_atividade"], {})
        m_rows += f"<tr><td class='mono'>{mc['id_marco']}</td><td><strong>{mc['nome_marco']}</strong></td><td class='mono'>{mc['id_atividade']}</td><td class='center mono'>{f_date(a.get('lb_end_date',''))}</td><td class='center mono'>{f_date(mc['data_real']) if mc['data_real'] else f_date(a.get('f_end_date',''))}</td><td>{'<span class=\"badge b-teal\">Cumprido</span>' if mc['data_real'] else '<span class=\"badge b-sand\">Previsto</span>'}</td></tr>"

    cpm_rows = ""
    for a in net["acts"]:
        cls = "alert-row" if a["crit_f"] else ("warn-row" if a["crit_lb"] else "")
        cpm_rows += f"<tr class='{cls}'><td class='mono'>{a['id']}</td><td>{a['nome']}</td><td class='center mono'>{a['o']}/{a['m']}/{a['p'] if a['tipo']=='ESTIMADA' else 'FIXA'}</td><td class='num mono'>{a['dur_lb']} du</td><td class='num mono'>{a['es_lb']}..{a['ef_lb']}</td><td class='num mono'>{a['folga_lb']}</td><td class='num mono'>{a['avanco']:.0f}%</td><td class='center mono'>{f_date(a['f_end_date'])}</td><td class='center'>{'<span class=\"badge b-coral\">CRÍTICA</span>' if a['crit_f'] else ('<span class=\"badge b-sand\">LB</span>' if a['crit_lb'] else '—')}</td></tr>"

    d04 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Prazo Linha de Base</div><div class="kpi-val">{net['dur_lb']} du</div><div class="kpi-sub">Término LB: {f_date(net['end_lb'])} (Contratual 22/01/27)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Previsão Atual (13/11)</div><div class="kpi-val">{f_date(net['fend_date'])}</div><div class="kpi-sub">du {net['fend_du']} (+{net['delay_du']} du além do contrato)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Caminho Crítico Previsto</div><div class="kpi-val" style="font-size:9.5pt">{' → '.join(net['crit_f'])}</div><div class="kpi-sub">LB: {' → '.join(net['crit_lb'])}</div></div>
      <div class="kpi-card"><div class="kpi-label">Sub-rede M1 / M2</div><div class="kpi-val">106 du · σ=3,65</div><div class="kpi-sub">Crítico M1: A22→A25→A26→A27→A31→A35</div></div>
    </div>
    <div class="callout">
      <strong>Integração com ProjectLibre:</strong> Os dados desta tabela alimentam o arquivo <code>.pod</code> e o PDF do Gantt/Rede em <code>docs/</code>, utilizando os feriados da tabela <code>11_calendario.csv</code>, durações PERT arredondadas para cima (Conv. 1) e avanço real na data de status 13/11/2026.
    </div>
    <h2>1. Marcos Principais do Projeto (Tabela 10)</h2>
    <table>
      <thead><tr><th>ID</th><th>Marco</th><th>Ativ.</th><th class="center">Data LB</th><th class="center">Real / Prev.</th><th>Situação</th></tr></thead>
      <tbody>{m_rows}</tbody>
    </table>
    <h2>2. Rede PERT/CPM Completa — 42 Atividades (Linha de Base × Previsão 13/11)</h2>
    <table>
      <thead><tr><th>ID</th><th>Atividade (verbo no infinitivo)</th><th class="center">O/M/P</th><th class="num">Dur LB</th><th class="num">ES..EF LB</th><th class="num">Folga</th><th class="num">Avanço</th><th class="center">Térm. Prev.</th><th class="center">Crítica</th></tr></thead>
      <tbody>{cpm_rows}</tbody>
    </table>
    """
    docs.append(("D04_Cronograma_ProjectLibre_e_Caminho_Critico.pdf", "D04", "Cronograma (ProjectLibre) e Caminho Crítico", "Estimativa de três pontos (PERT), marcos contratuais, rede de precedência e previsão", d04))

    # ------------------------------------------------------------------
    # D05 — Orçamento, Curva S e Reservas
    # ------------------------------------------------------------------
    cat_orc = defaultdict(float)
    for r in db["09_orcamento_linha_de_base"]:
        cat_orc[r["categoria_custo"]] += float(r["valor_orcado_rs"])
    cat_rows = "".join(f"<tr><td>{k}</td><td class='num mono'>{f_brl(v)}</td><td class='num mono'>{v/evm['ont_p']*100:.1f}%</td></tr>" for k, v in sorted(cat_orc.items(), key=lambda x: -x[1]))

    d05 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">ONT Projeto</div><div class="kpi-val">{f_brl0(evm['ont'])}</div><div class="kpi-sub">Pred. {f_brl0(evm['ont_p'])} · Ágil {f_brl0(evm['ont_a'])}</div></div>
      <div class="kpi-card"><div class="kpi-label">Valor Agregado (13/11)</div><div class="kpi-val">{f_brl0(evm['va'])}</div><div class="kpi-sub">VP {f_brl0(evm['vp'])} · IDP = {f_num(evm['idp'], 3)}</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Custo Real & ENT</div><div class="kpi-val">{f_brl0(evm['ent'])}</div><div class="kpi-sub">CR {f_brl0(evm['cr'])} · IDC = {f_num(evm['idc'], 3)}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Reservas & Gestão</div><div class="kpi-val">R$ 164.000</div><div class="kpi-sub">Cont. R$ 73k + Ger. R$ 91k · Gestão CR {f_brl0(evm['cr_g'])}</div></div>
    </div>
    <h2>1. Composição do Orçamento da Linha de Base (Frente Preditiva — Tabela 09)</h2>
    <table>
      <thead><tr><th>Categoria de Custo</th><th class="num">Valor Orçado</th><th class="num">% da Preditiva</th></tr></thead>
      <tbody>{cat_rows}<tr class="highlight"><td>Total Frente Preditiva</td><td class="num mono">{f_brl(evm['ont_p'])}</td><td class="num mono">100,0%</td></tr></tbody>
    </table>
    <h2>2. Desempenho de Valor Agregado (25/09 M3 × 13/11 Status)</h2>
    <table>
      <thead><tr><th>Corte / Frente</th><th class="num">ONT</th><th class="num">VP</th><th class="num">VA</th><th class="num">CR</th><th class="num">IDP</th><th class="num">IDC</th><th class="num">ENT</th></tr></thead>
      <tbody>
        <tr><td>Projeto em 25/09/2026 (Folha M3)</td><td class="num mono">{f_brl0(evm09['ont'])}</td><td class="num mono">{f_brl0(evm09['vp'])}</td><td class="num mono">{f_brl0(evm09['va'])}</td><td class="num mono">{f_brl0(evm09['cr'])}</td><td class="num mono">{f_num(evm09['idp'],3)}</td><td class="num mono">{f_num(evm09['idc'],3)}</td><td class="num mono">{f_brl0(evm09['ent'])}</td></tr>
        <tr><td>Frente Preditiva em 13/11/2026</td><td class="num mono">{f_brl0(evm['ont_p'])}</td><td class="num mono">{f_brl0(evm['vp_p'])}</td><td class="num mono">{f_brl0(evm['va_p'])}</td><td class="num mono">{f_brl0(evm['cr_p'])}</td><td class="num mono">{f_num(evm['idp_p'],3)}</td><td class="num mono">{f_num(evm['idc_p'],3)}</td><td class="num mono">{f_brl0(evm['ont_p']/evm['idc_p'])}</td></tr>
        <tr><td>Frente Ágil em 13/11/2026</td><td class="num mono">{f_brl0(evm['ont_a'])}</td><td class="num mono">{f_brl0(evm['vp_a'])}</td><td class="num mono">{f_brl0(evm['va_a'])}</td><td class="num mono">{f_brl0(evm['cr_a'])}</td><td class="num mono">{f_num(evm['idp_a'],3)}</td><td class="num mono">{f_num(evm['idc_a'],3)}</td><td class="num mono">{f_brl0(evm['ont_a']/evm['idc_a'])}</td></tr>
        <tr class="highlight"><td>TOTAL DO PROJETO EM 13/11/2026</td><td class="num mono">{f_brl0(evm['ont'])}</td><td class="num mono">{f_brl0(evm['vp'])}</td><td class="num mono">{f_brl0(evm['va'])}</td><td class="num mono">{f_brl0(evm['cr'])}</td><td class="num mono">{f_num(evm['idp'],3)}</td><td class="num mono">{f_num(evm['idc'],3)}</td><td class="num mono">{f_brl0(evm['ent'])}</td></tr>
      </tbody>
    </table>
    <div class="chart-box"><img src="{charts['d5_curva_s']}" /></div>
    """
    docs.append(("D05_Orcamento_Curva_S_e_Reservas.pdf", "D05", "Orçamento, Curva S e Reservas", "Orçamento da linha de base, reservas de contingência/gerencial e gestão de valor agregado (EVM)", d05))

    # ------------------------------------------------------------------
    # D06 — Matriz RACI e Histograma
    # ------------------------------------------------------------------
    raci_rows = ""
    for e in db["06_eap"]:
        if e["tipo_elemento"] != "PACOTE_DE_TRABALHO":
            continue
        resp = eq_map.get(e["id_responsavel"], e["id_responsavel"])
        is_agi = e["disciplina"] == "AGI"
        raci_rows += f"<tr><td class='mono'>{e['codigo_eap']}</td><td><strong>{e['nome']}</strong></td><td class='center mono'>{e['disciplina']}</td><td class='center'>{'P11 PO / Time Ágil' if is_agi else resp}</td><td class='center'>P01 Helena (GP)</td><td class='center'>{'P04 Ramon / P10' if is_agi else 'P02 Heitor (PMO)'}</td><td class='center'>PI01 Patrocinadora</td></tr>"

    d06 = f"""
    <div class="callout">
      <strong>Legenda RACI:</strong> <strong>R</strong> = Responsável pela execução · <strong>A</strong> = Aprovador/Accountable (único por pacote) · <strong>C</strong> = Consultado · <strong>I</strong> = Informado.
    </div>
    <h2>1. Matriz RACI por Pacote de Trabalho da EAP</h2>
    <table>
      <thead><tr><th>EAP</th><th>Pacote de Trabalho</th><th class="center">Disc.</th><th class="center">R (Responsável)</th><th class="center">A (Accountable)</th><th class="center">C (Consultado)</th><th class="center">I (Informado)</th></tr></thead>
      <tbody>{raci_rows}</tbody>
    </table>
    <h2>2. Histograma de Alocação: Planejado × Apontado (Folha M8)</h2>
    <div class="chart-box"><img src="{charts['d6_hist']}" /></div>
    <div class="callout warn">
      <strong>Leitura Gerencial do Histograma:</strong> <strong>P09 Heitor Góes (Operações)</strong> ficou sem apontamento entre jun/26 e set/26 (enquanto o piloto aguardava R1) e sofreu pico de sobrecarga em out/26 (<strong>204,5 h apontadas vs 42 h planejadas</strong>, sendo 64 h extras). <strong>P15 Kleber (Dev)</strong> manteve utilização regular (~160–176 h/mês) com pico de +28% em ago/26 (215 h).
    </div>
    """
    docs.append(("D06_Matriz_RACI_e_Histograma.pdf", "D06", "Matriz RACI e Histograma de Recursos", "Matriz de responsabilidades por pacote da EAP e análise de alocação planejada × apontada", d06))

    # ------------------------------------------------------------------
    # D07 — Backlog e Releases no Jira
    # ------------------------------------------------------------------
    ep_rows = ""
    for ep in db["13_epicos"]:
        its = [b for b in db["14_backlog_itens"] if b["id_epico"] == ep["id_epico"]]
        pts_t = sum(int(b["pontos"]) for b in its)
        pts_d = sum(int(b["pontos"]) for b in its if b["status"] == "CONCLUIDO")
        pct = pts_d / pts_t * 100 if pts_t else 0
        ep_rows += f"<tr><td class='mono'>{ep['id_epico']}</td><td><strong>{ep['nome_epico']}</strong></td><td>{ep['persona']}</td><td class='center mono'>{ep['id_release_planejada']}</td><td class='num mono'>{ep['valor_de_negocio']}</td><td class='num mono'>{len(its)}</td><td class='num mono'>{pts_d}/{pts_t} ({pct:.0f}%)</td></tr>"

    rel_rows = ""
    for r in db["16_releases"]:
        prev = f_date(r["data_real"]) if r["data_real"] else (f_date(m["ag_base"]["r2_d"]) if r["id_release"] == "R2" else f_date(m["ag_base"]["r3_d"]))
        rel_rows += f"<tr><td class='mono'>{r['id_release']}</td><td><strong>{r['nome_release']}</strong></td><td class='center mono'>{r['id_sprint_planejada']}</td><td class='center mono'>{f_date(r['data_planejada'])}</td><td class='center mono'>{prev}</td><td>{r['objetivo']}</td></tr>"

    orig_c = Counter(b["origem"] for b in db["14_backlog_itens"])
    d07 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Itens no Backlog (13/11)</div><div class="kpi-val">{len(db['14_backlog_itens'])}</div><div class="kpi-sub">102 concluídos (291 pts entregues)</div></div>
      <div class="kpi-card"><div class="kpi-label">Release 2 Prevista</div><div class="kpi-val">{f_date(m['ag_base']['r2_d'])}</div><div class="kpi-sub">{m['ag_base']['rem_r2']} pts rest. ({m['ag_base']['sr2']} sprints)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Release 3 Prevista</div><div class="kpi-val">{f_date(m['ag_base']['r3_d'])}</div><div class="kpi-sub">{m['ag_base']['rem_r3']} pts rest. ({m['ag_base']['sr3']} sprints)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Origem dos Itens</div><div class="kpi-val">9 Diretos · 39 Bugs</div><div class="kpi-sub">Plano inicial: {orig_c['PLANO_INICIAL']} · SM: {orig_c['MUDANCA_APROVADA']}</div></div>
    </div>
    <div class="callout">
      <strong>Configuração no Jira (Trilha Ágil):</strong> Projeto Scrum configurado com chave <code>MS</code>, versões <strong>R1, R2 e R3</strong>, os 8 épicos abaixo, backlog importado da base tratada, Sprint S15 executada no quadro (Boletins B5/B6) e sprints futuras (S16 em diante) dimensionadas pela velocidade real de <strong>{f_num(m['vel_media'],1)} pts/sprint</strong>.
    </div>
    <h2>1. Releases Planejadas × Realizadas / Previstas (Tabela 16)</h2>
    <table>
      <thead><tr><th>ID</th><th>Release</th><th class="center">Sprint LB</th><th class="center">Data LB</th><th class="center">Real / Prev.</th><th>Objetivo</th></tr></thead>
      <tbody>{rel_rows}</tbody>
    </table>
    <h2>2. Épicos do Produto e Progresso em Pontos (Tabelas 13 e 14)</h2>
    <table>
      <thead><tr><th>ID</th><th>Épico</th><th>Persona</th><th class="center">Rel. LB</th><th class="num">Valor Neg.</th><th class="num">Itens</th><th class="num">Pontos Concluídos</th></tr></thead>
      <tbody>{ep_rows}</tbody>
    </table>
    """
    docs.append(("D07_Backlog_e_Releases_Jira.pdf", "D07", "Backlog e Releases no Jira", "Estrutura de épicos, releases, composição do backlog e previsão pela velocidade real", d07))

    # ------------------------------------------------------------------
    # D08 — Rotina Ágil e Métricas
    # ------------------------------------------------------------------
    impls = db["23_implantacoes"]
    prods = [i for i in impls if i["ambiente"] == "PRODUCAO"]
    falhas = [i for i in impls if i["falhou"] == "1"]
    lts = sorted(float(i["tempo_ate_producao_h"]) for i in impls)
    med_lt = lts[len(lts)//2]
    mttr = sum(float(i["tempo_restauracao_h"]) for i in falhas) / len(falhas) if falhas else 0
    fn_last = db["37_funil_piloto_semanal"][-1]

    d08 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Velocidade Média (5 últ.)</div><div class="kpi-val">{f_num(m['vel_media'],1)} pts/sp</div><div class="kpi-sub">S11(11) S12(24) S13(10) S14(26) S15(9)</div></div>
      <div class="kpi-card"><div class="kpi-label">DORA · Produção</div><div class="kpi-val">{len(prods)} deploys</div><div class="kpi-sub">Lead mediano: {f_num(med_lt,1)}h · MTTR: {f_num(mttr,1)}h</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Taxa de Falha DORA</div><div class="kpi-val">{len(falhas)/len(impls)*100:.1f}%</div><div class="kpi-sub">{len(falhas)} falhas em {len(impls)} implantações</div></div>
      <div class="kpi-card"><div class="kpi-label">Piloto (Sem. 09/11)</div><div class="kpi-val">NPS {fn_last['nps']}</div><div class="kpi-sub">{fn_last['ativos_na_semana']} ativos · {fn_last['ativados']} ativados</div></div>
    </div>
    <h2>1. Evolução de Velocidade e Pulso da Equipe Ágil</h2>
    <div class="chart-box"><img src="{charts['d8_agile']}" /></div>
    <h2>2. Fluxo da Sprint S14 (Folha M5) e S15 (Quinzena)</h2>
    <ul>
      <li><strong>Sprint S14 (19/10–30/10):</strong> 12 itens (41 pontos no quadro), <strong>7 concluídos (26 pontos)</strong>; velocidade média até 30/10 = <strong>16,8 pts/sprint</strong>; 5 itens transbordaram para S15.</li>
      <li><strong>Sprint S15 (02/11–13/11):</strong> 10 itens (34 pontos no quadro), <strong>4 concluídos (9 pontos)</strong>; 5 novos bugs de <code>MS-222</code> abertos durante a quinzena; impedimento <code>IP-014</code> aberto em <code>MS-161</code>.</li>
      <li><strong>Pulso da equipe:</strong> caiu para 3,03 na S12 (pressão de horas extras), recuperando para <strong>4,19 (S14)</strong> e <strong>3,94 (S15)</strong>.</li>
    </ul>
    <h2>3. Funil Semanal do Piloto — Últimas 6 Semanas (Tabela 37)</h2>
    <table>
      <thead><tr><th>Semana</th><th class="num">Alcance</th><th class="num">Cadastros</th><th class="num">Ativados</th><th class="num">Ativos</th><th class="num">Retidos 4s</th><th class="num">NPS</th><th class="num">Chamados</th></tr></thead>
      <tbody>
        {"".join(f"<tr><td class='mono'>{f_date(r['semana_inicio'])}</td><td class='num mono'>{r['alcance']}</td><td class='num mono'>{r['cadastros']}</td><td class='num mono'>{r['ativados']}</td><td class='num mono'>{r['ativos_na_semana']}</td><td class='num mono'>{r['retidos_4_semanas']}</td><td class='num mono'><strong>{r['nps']}</strong></td><td class='num mono'>{r['chamados_suporte']}</td></tr>" for r in db['37_funil_piloto_semanal'][-6:])}
      </tbody>
    </table>
    """
    docs.append(("D08_Rotina_Agil_e_Metricas.pdf", "D08", "Rotina Ágil e Métricas de Fluxo", "Velocidade, burndown, impedimentos, métricas DORA, pulso do time e funil do piloto", d08))

    # ------------------------------------------------------------------
    # D09 — Riscos e Reservas
    # ------------------------------------------------------------------
    open_th = [r for r in db["26_riscos_registro"] if r["tipo_risco"] == "AMEACA" and r["status"] == "ABERTO"]
    vme_open = sum(float(r["probabilidade_pct"]) / 100.0 * float(r["impacto_custo_rs"]) for r in open_th)
    oc_tot = sum(float(o["impacto_custo_real_rs"]) for o in db["27_riscos_ocorrencias"])
    r_rows = ""
    for r in db["26_riscos_registro"]:
        vme = float(r["probabilidade_pct"]) / 100.0 * float(r["impacto_custo_rs"])
        cls = "alert-row" if r["status"] == "OCORRIDO" else ("warn-row" if r["status"] == "ABERTO" and r["tipo_risco"] == "AMEACA" else "")
        r_rows += f"<tr class='{cls}'><td class='mono'>{r['id_risco']}</td><td>{r['descricao']}</td><td class='center mono'>{r['probabilidade_pct']}%</td><td class='num mono'>{f_brl0(float(r['impacto_custo_rs']))}</td><td class='num mono'><strong>{f_brl0(vme)}</strong></td><td>{r['estrategia_resposta']}</td><td class='center'><span class='badge {'b-coral' if r['status']=='OCORRIDO' else ('b-sand' if r['status']=='ABERTO' else 'b-navy')}'>{r['status']}</span></td></tr>"

    oc_rows = "".join(f"<tr><td class='mono'>{o['id_ocorrencia']}</td><td class='mono'>{f_date(o['data'])}</td><td class='mono'>{o['id_risco'] or 'IMPREVISTO'}</td><td>{o['descricao']}</td><td class='mono'>{o['id_atividade'] or o['frente']}</td><td class='num mono'>{f_brl0(float(o['impacto_custo_real_rs']))}</td><td class='num mono'>{o['impacto_prazo_real_du']} du</td></tr>" for o in db["27_riscos_ocorrencias"])
    d09 = f"""
    <div class="kpi-grid">
      <div class="kpi-card warn"><div class="kpi-label">Exposição VME Aberta</div><div class="kpi-val">{f_brl0(vme_open)}</div><div class="kpi-sub">{len(open_th)} ameaças abertas</div></div>
      <div class="kpi-card"><div class="kpi-label">Reserva de Contingência</div><div class="kpi-val">R$ 73.000</div><div class="kpi-sub">Cobre VME aberto (saldo +{f_brl0(73000-vme_open)})</div></div>
      <div class="kpi-card navy"><div class="kpi-label">Reserva Gerencial</div><div class="kpi-val">R$ 91.000</div><div class="kpi-sub">Para imprevistos (sob alçada PI01)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Ocorrências Materializadas</div><div class="kpi-val">{f_brl0(oc_tot)}</div><div class="kpi-sub">8 eventos (OC-001 a OC-008)</div></div>
    </div>
    <div class="chart-box"><img src="{charts['d9_risks']}" /></div>
    <h2>1. Registro de Riscos e Valor Monetário Esperado (Tabela 26)</h2>
    <table>
      <thead><tr><th>ID</th><th>Evento de Risco</th><th class="center">Prob.</th><th class="num">Impacto</th><th class="num">VME</th><th>Resposta</th><th class="center">Status</th></tr></thead>
      <tbody>{r_rows}</tbody>
    </table>
    <h2>2. Ocorrências Materializadas e Imprevistos (Tabela 27 + Boletim B8)</h2>
    <table>
      <thead><tr><th>ID</th><th>Data</th><th>Risco</th><th>Descrição</th><th>Ativ./Frente</th><th class="num">Custo Real</th><th class="num">Atraso</th></tr></thead>
      <tbody>{oc_rows}</tbody>
    </table>
    """
    docs.append(("D09_Riscos_e_Reservas.pdf", "D09", "Gestão de Riscos e Reservas", "Análise quantitativa (VME), matriz 5×5, suficiência das reservas e ocorrências reais", d09))

    # ------------------------------------------------------------------
    # D10 — Aquisições e Qualidade
    # ------------------------------------------------------------------
    forn_map = {f["id_fornecedor"]: f["nome"] for f in db["29_fornecedores"]}
    ct_rows = ""
    for c in db["30_contratos"]:
        meds = [x for x in db["31_contratos_medicoes"] if x["id_contrato"] == c["id_contrato"]]
        pago = sum(float(x["valor_pago_rs"]) for x in meds if x["valor_pago_rs"])
        insp_f = [i for i in db["25_inspecoes_aceite"] if i["id_fornecedor"] == c["id_fornecedor"]]
        rep = sum(1 for i in insp_f if i["resultado"] == "REPROVADO")
        retr = sum(float(i["custo_retrabalho_rs"]) for i in insp_f)
        cls = "alert-row" if rep > 0 else ""
        ct_rows += f"<tr class='{cls}'><td class='mono'>{c['id_contrato']}</td><td>{forn_map[c['id_fornecedor']]} ({c['id_fornecedor']})</td><td class='mono'>{c['tipo_contrato']}</td><td class='num mono'>{f_brl0(float(c['valor_contratado_rs']))}</td><td class='num mono'>{f_brl0(pago)}</td><td class='num mono'>{rep} reprov.</td><td class='num mono'>{f_brl0(retr)}</td></tr>"

    pr_rows = ""
    for idx, pr in enumerate(m["props_eval"]):
        cls = "alert-row" if pr["reprov"] > 0 else ("highlight" if idx == 0 else "")
        alerta = f"⚠ {pr['reprov']} reprovações + OC-003/005" if pr["reprov"] > 0 else "Histórico limpo (recomendado)"
        pr_rows += f"<tr class='{cls}'><td class='mono'>{pr['id_proposta']}</td><td><strong>{pr['forn']} ({pr['id_fornecedor']})</strong></td><td class='num mono'>{f_brl0(float(pr['preco_rs']))}</td><td class='num mono'>{pr['prazo_du']} du</td><td class='num mono'>{pr['nota_tecnica']}</td><td class='num mono'>{pr['projetos_similares']} / {pr['garantia_meses']}m</td><td class='num mono'><strong>{f_num(pr['nota'],2)}</strong></td><td>{alerta}</td></tr>"

    tot_retr = sum(float(i["custo_retrabalho_rs"]) for i in db["25_inspecoes_aceite"])
    tot_rep = sum(1 for i in db["25_inspecoes_aceite"] if i["resultado"] == "REPROVADO")
    d10 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Contratos Ativos</div><div class="kpi-val">10</div><div class="kpi-sub">5 Preço Fixo · 2 T&M · 2 Assin. · 1 Unit.</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Custo Não Qualidade</div><div class="kpi-val">{f_brl0(tot_retr)}</div><div class="kpi-sub">{tot_rep} inspeções reprovadas (6 em F04)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Defeitos no Produto</div><div class="kpi-val">{len(db['24_defeitos'])} bugs</div><div class="kpi-sub">5 defeitos escaparam para Produção</div></div>
      <div class="kpi-card"><div class="kpi-label">Recomendação Licitação</div><div class="kpi-val">PR-03 (F11)</div><div class="kpi-sub">Vértice · Melhor nota sem risco F04</div></div>
    </div>
    <h2>1. Desempenho dos Contratos e Retrabalho (Tabelas 30, 31 e 25)</h2>
    <table>
      <thead><tr><th>ID</th><th>Fornecedor</th><th>Tipo</th><th class="num">Contratado</th><th class="num">Pago</th><th class="num">Reprov.</th><th class="num">Retrabalho</th></tr></thead>
      <tbody>{ct_rows}</tbody>
    </table>
    <h2>2. Seleção de Fornecedor em Aberto — Monitoramento 24h (Tabela 32 · Conv. 15)</h2>
    <table>
      <thead><tr><th>Prop.</th><th>Fornecedor</th><th class="num">Preço</th><th class="num">Prazo</th><th class="num">Técnica</th><th class="num">Exp/Gar</th><th class="num">Nota (0–10)</th><th>Análise de Risco Histórico</th></tr></thead>
      <tbody>{pr_rows}</tbody>
    </table>
    <div class="callout alert">
      <strong>Armadilha de Menor Preço:</strong> A proposta mais barata (<strong>PR-01 · F04 VisionAI</strong>, R$ 87.800) pertence ao fornecedor que concentrou <strong>6 reprovações em A11/A12</strong> e <strong>R$ 105.300 em ocorrências (OC-003 e OC-005)</strong>. Pela matriz ponderada (Conv. 15) e diligência de histórico, recomenda-se contratar <strong>PR-03 (F11 Vértice Serviços Técnicos)</strong> ou <strong>PR-05 (F13 Polo)</strong>.
    </div>
    """
    docs.append(("D10_Aquisicoes_e_Qualidade.pdf", "D10", "Aquisições, Contratos e Qualidade", "Mapa de contratos, seleção ponderada de fornecedores, inspeções de aceite e defeitos", d10))

    # ------------------------------------------------------------------
    # D11 — Mudanças e Bússola de Abordagem
    # ------------------------------------------------------------------
    alc_map = {a["nivel_decisor"]: a for a in db["05_matriz_alcadas"]}
    sm_rows = ""
    for sm in db["28_mudancas_solicitacoes"]:
        alc = alc_map[sm["nivel_decisor"]]
        viols = []
        if sm["status"] == "APROVADA":
            if alc["pode_alterar_escopo"] == "NAO" and sm["tipo_mudanca"] == "ESCOPO":
                viols.append("Sem permissão p/ escopo")
            if alc["limite_custo_rs"] and float(sm["impacto_custo_rs"]) > float(alc["limite_custo_rs"]):
                viols.append("Custo > R$ 15 mil")
            if alc["limite_prazo_du"] and int(sm["impacto_prazo_du"]) > int(alc["limite_prazo_du"]):
                viols.append("Prazo > 5 du")
        cls = "alert-row" if viols else ""
        sm_rows += f"<tr class='{cls}'><td class='mono'>{sm['id_mudanca']}</td><td>{sm['tipo_mudanca']}</td><td>{sm['nivel_decisor']} ({sm['status']})</td><td class='num mono'>{f_brl0(float(sm['impacto_custo_rs']))}</td><td class='num mono'>{sm['impacto_prazo_du']} du</td><td>{sm['descricao']}</td><td>{'<span class=\"badge b-coral\">⚠ ' + '; '.join(viols) + '</span>' if viols else '<span class=\"badge b-teal\">OK</span>'}</td></tr>"

    d11 = f"""
    <h2>1. Bússola de Abordagem por Domínio do Projeto (Slide 15)</h2>
    <table>
      <thead><tr><th>Domínio</th><th>Escopo</th><th>Custo de Mudança</th><th>Entrega</th><th>Proximidade Usuário</th><th>Abordagem Escolhida</th></tr></thead>
      <tbody>
        <tr><td><strong>Aplicativo & UX (EP01–EP08)</strong></td><td>Incerto / evolutivo</td><td>Barata (código)</td><td>Em partes (R1/R2/R3)</td><td>Perto (piloto 40 of.)</td><td><span class="badge b-teal">ÁGIL (Scrum/Jira)</span></td></tr>
        <tr><td><strong>Regulação Susep & LGPD</strong></td><td>Estável / normativo</td><td>Cara (reprovação)</td><td>De uma vez (aprovação)</td><td>Longe (regulador)</td><td><span class="badge b-navy">PREDITIVA</span></td></tr>
        <tr><td><strong>Kits Hardware & Logística</strong></td><td>Estável (40 oficinas)</td><td>Cara (compra física)</td><td>Lote / instalação</td><td>Média</td><td><span class="badge b-navy">PREDITIVA</span></td></tr>
        <tr><td><strong>Piloto, Treinamento e Lançamento</strong></td><td>Definido + feedback</td><td>Média</td><td>Ondas / marcos</td><td>Perto (oficinas)</td><td><span class="badge b-sand">HÍBRIDA (Interface)</span></td></tr>
      </tbody>
    </table>
    <h2>2. Mapa de Interfaces entre as Duas Trilhas</h2>
    <table>
      <thead><tr><th>Ponto de Encontro</th><th>Origem (Trilha)</th><th>Destino (Trilha)</th><th>Dependência</th><th>Dono da Interface</th></tr></thead>
      <tbody>
        <tr><td><strong>Marco M2 — Release 1 (MVP)</strong></td><td>Ágil (S06 / A40)</td><td>Preditiva (A27 Piloto)</td><td>Piloto só inicia com R1 em produção</td><td>P11 Sílvia (PO) + P09 Heitor</td></tr>
        <tr><td><strong>Marco M4 — Release 2</strong></td><td>Ágil (S12→S17 / A41)</td><td>Preditiva (A32 Testes → A35)</td><td>Entrada em operação exige R2 + testes carga/segurança</td><td>P10 Fábio (QA) + P11 Sílvia</td></tr>
        <tr><td><strong>Marco M6 — Release 3</strong></td><td>Ágil (S17→S22 / A42)</td><td>Preditiva (A39 Encerramento)</td><td>Encerramento formal após estabilização da R3</td><td>P01 Helena (GP)</td></tr>
      </tbody>
    </table>
    <h2>3. Auditoria do Controle de Mudanças (Tabela 28 × Tabela 05)</h2>
    <div class="callout alert">
      <strong>Falhas Críticas de Governança:</strong> (1) <strong>4 aprovações acima da alçada do gerente</strong> (<code>SM-002, SM-004, SM-005, SM-011</code>, total R$ 63.600) violando limites de R$ 15 mil, 5 du e veto a escopo; (2) <strong>9 pedidos diretos (35 pts)</strong> de PI02 entraram no backlog sem SM — só <code>MS-222</code> gerou 5 defeitos na S15.
    </div>
    <table>
      <thead><tr><th>SM</th><th>Tipo</th><th>Decisor / Status</th><th class="num">Custo</th><th class="num">Prazo</th><th>Descrição</th><th>Auditoria</th></tr></thead>
      <tbody>{sm_rows}</tbody>
    </table>
    """
    docs.append(("D11_Mudancas_e_Bussola_de_Abordagem.pdf", "D11", "Controle de Mudanças e Bússola de Abordagem", "Justificativa da abordagem híbrida, mapa de interfaces e auditoria de alçadas", d11))

    # ------------------------------------------------------------------
    # D12 — Estratégia do Projeto
    # ------------------------------------------------------------------
    d12 = f"""
    <div class="callout">
      <strong>Tese Estratégica para o Comitê Diretor:</strong> O projeto Maré Seguros mantém VPL positivo em C1 ({f_brl0(c1['vpl'])}), mas sofre desvio simultâneo de prazo (<strong>+{net['delay_du']} du</strong>) e custo (<strong>+{f_brl0(evm['ent']-evm['ont'])}</strong>), gerando resultado líquido negativo em C1 ({f_brl0(c1['resultado'])}) após o custo do atraso (R$ 172,8 mil). Entre todos os cenários avaliados, <strong>{best_sc['id']} ({best_sc['nome']})</strong> entrega o <strong>maior VPL ({f_brl0(best_sc['vpl'])}) e melhor resultado líquido ({f_brl0(best_sc['resultado'])}, ganho de +{f_brl0(best_sc['resultado'] - c1['resultado'])} sobre C1)</strong>; caso o Comitê não aceite alongar o prazo para {f_date(best_sc['end_date'])}, a alternativa mais equilibrada sem corte de escopo é <strong>C6 (duas ondas)</strong>.
    </div>
    <h2>1. Os 6 Achados Diagnósticos Prioritários</h2>
    <table>
      <thead><tr><th>#</th><th>Achado</th><th>Evidência Numérica</th><th>Ação Estratégica</th><th>Dono</th></tr></thead>
      <tbody>
        <tr><td class="mono">A1</td><td>Atraso crítico (+32 du)</td><td>Término 11/03/2027 vs 22/01/2027; vel. 16,0 pts/sp</td><td>Deliberar entre C4 (valor) ou C6 (ondas)</td><td>P01 / PI01</td></tr>
        <tr><td class="mono">A2</td><td>Estouro projetado (+33,5%)</td><td>ENT {f_brl0(evm['ent'])} vs ONT {f_brl0(evm['ont'])} (IDC {f_num(evm['idc'],2)})</td><td>Teto T&M e foco em escopo core</td><td>P01 / PI03</td></tr>
        <tr><td class="mono">A3</td><td>Scope creep (PI02)</td><td>9 pedidos diretos (35 pts); MS-222 gerou 5 bugs</td><td>Trava de SM no Jira + alinhamento PI02</td><td>P11 / PI01</td></tr>
        <tr><td class="mono">A4</td><td>Quebra de alçadas</td><td>4 SMs (R$ 63,6k) aprovadas fora da tab. 05</td><td>Gate formal por nível decisor</td><td>P01 / Comitê</td></tr>
        <tr><td class="mono">A5</td><td>Fornecedor crítico F04</td><td>6 reprovações + R$ 105,3k em ocorrências</td><td>Não contratar F04 em PR-01; eleger F11</td><td>P04 / Compras</td></tr>
        <tr><td class="mono">A6</td><td>Produtividade × Alocação</td><td>IP 0,64 (A11) / 0,69 (A20); P09 204h em out/26</td><td>Atacar causa técnica e nivelar operações</td><td>P02 / P09</td></tr>
      </tbody>
    </table>
    <h2>2. Plano de Ação 30 / 60 / 90 Dias</h2>
    <div class="grid-2">
      <div class="card"><strong>0–30 dias (Estabilização imediata):</strong> Deliberar cenário oficial no Comitê (C4 para maximizar VPL ou C6 para antecipar valor sem estender prazo); congelar pedidos diretos fora de SM; realinhar PI02; adjudicar monitoramento 24h para F11 Vértice.</div>
      <div class="card"><strong>31–90 dias (Entrega e virada):</strong> Concluir Release 2 (11/12/2026) com foco nos bugs críticos e itens MUST; executar testes de carga/segurança (A32) e auditoria (A33); estabilizar operação assistida (A36) e formalizar encerramento (A39).</div>
    </div>
    """
    docs.append(("D12_Estrategia_do_Projeto.pdf", "D12", "Estratégia do Projeto", "Síntese diagnóstica, governança de recuperação e plano tático 30/60/90 dias", d12))

    # ------------------------------------------------------------------
    # D13 — Pessoal e Custos de Pessoal
    # ------------------------------------------------------------------
    tot_folha = sum(x["cm"] for x in m["people"])
    tot_reaj = sum(x["reaj_rs"] for x in m["people"])
    tot_h = sum(x["ht"] for x in m["people"])
    tot_cp = sum(x["cproj"] for x in m["people"])
    p_rows = "".join(
        f"<tr><td class='mono'>{x['id']}</td><td><strong>{x['nome']}</strong><br/><span style='color:#64748B'>{x['papel']}</span></td><td class='center mono'>{x['frente']}</td><td class='center mono'>{x['vinculo']}</td><td class='num mono'>{f_brl(x['cm'])}</td><td class='num mono'>R$ {x['ch']:.0f}</td><td class='num mono'>{f_num(x['hn'],1)} + {f_num(x['he'],1)}</td><td class='num mono'>{f_brl0(x['cproj'])}</td><td class='num mono'>{f_brl0(x['reaj_rs'])}</td></tr>"
        for x in m["people"]
    )
    d13 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Folha Mensal Total</div><div class="kpi-val">{f_brl(tot_folha)}</div><div class="kpi-sub">18 pessoas (16 CLT · 2 PJ) — bate controle</div></div>
      <div class="kpi-card"><div class="kpi-label">Horas Apontadas (13/11)</div><div class="kpi-val">{f_num(tot_h,1)} h</div><div class="kpi-sub">441 apontamentos (tab. 18 + B2)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Custo Pessoal no Projeto</div><div class="kpi-val">{f_brl0(tot_cp)}</div><div class="kpi-sub">Horas normais + extras (×1,5)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Impacto de Reajuste</div><div class="kpi-val">{f_brl0(tot_reaj)}</div><div class="kpi-sub">Projeção até término (Conv. 19)</div></div>
    </div>
    <h2>Folha, Custo-Hora (Conv. 17), Horas Apontadas e Impacto de Reajuste (Conv. 19)</h2>
    <table>
      <thead><tr><th>ID</th><th>Pessoa / Papel</th><th class="center">Frente</th><th class="center">Vínc.</th><th class="num">Custo Mensal</th><th class="num">R$/h</th><th class="num">Horas (N+E)</th><th class="num">Custo Proj.</th><th class="num">Reajuste Est.</th></tr></thead>
      <tbody>{p_rows}<tr class="highlight"><td colspan="4">TOTAL DA EQUIPE (18 pessoas)</td><td class="num mono">{f_brl(tot_folha)}</td><td></td><td class="num mono">{f_num(tot_h,1)} h</td><td class="num mono">{f_brl0(tot_cp)}</td><td class="num mono">{f_brl0(tot_reaj)}</td></tr></tbody>
    </table>
    """
    docs.append(("D13_Pessoal_e_Custos_de_Pessoal.pdf", "D13", "Pessoal e Custos de Pessoal", "Estrutura salarial, encargos/benefícios, custo por hora, apontamentos e impacto de reajuste", d13))

    # ------------------------------------------------------------------
    # D14 — Produtividade das Equipes
    # ------------------------------------------------------------------
    sp_rows = ""
    for s in m["sup_prod"]:
        diag = "Baixo rendimento (IP)" if s["ip"] < 0.85 and s["ie"] >= 0.85 else ("Falta efetivo (IE)" if s["ie"] < 0.85 and s["ip"] >= 0.85 else ("Efetivo + Rendimento" if s["ip"] < 0.85 else "Adequado"))
        cls = "alert-row" if s["ip"] < 0.75 else ""
        sp_rows += f"<tr class='{cls}'><td class='mono'>{s['id']}</td><td>{s['servico']} ({s['forn']})</td><td class='num mono'>{f_num(s['qex'],1)}/{f_num(s['qt'],1)} {s['un']}</td><td class='num mono'>{s['hh']:.0f} h</td><td class='num mono'>{f_num(s['pp'],3)} → {f_num(s['pr'],3)}</td><td class='num mono'><strong>{f_num(s['ip'],2)}</strong></td><td class='num mono'>{f_num(s['ie'],2)}</td><td>{diag}</td></tr>"

    dev_rows = "".join(
        f"<tr><td class='mono'>{x['id']}</td><td>{x['nome']} ({x['papel']})</td><td class='num mono'>{x['pts']} pts</td><td class='num mono'>{f_num(x['ht'],1)} h</td><td class='num mono'>{f_num(x['pts_h'],3)} pts/h</td><td class='num mono'>{f_brl0(x['rs_pt'])}/pt</td></tr>"
        for x in m["people"] if x["pts_h"] is not None
    )
    d14 = f"""
    <div class="callout warn">
      <strong>Resposta Central (Falta gente ou rendimento?):</strong> Nos serviços críticos analisados (especialmente <strong>A11 — VisionAI</strong> com IP = 0,64 e IE = 0,93, e <strong>A20 — Conteúdo</strong> com IP = 0,69 e IE = 0,88), a equipe mobilizada está próxima do planejado, mas o <strong>rendimento por homem-hora está 31% a 36% abaixo da meta</strong> devido a retrabalho técnico e falhas de qualidade.
    </div>
    <div class="chart-box"><img src="{charts['d14_prod']}" /></div>
    <h2>1. Produtividade das Equipes de Fornecedores (Tabelas 41 e 42 · Conv. 20)</h2>
    <table>
      <thead><tr><th>Ativ.</th><th>Serviço / Fornecedor</th><th class="num">Exec. / Total</th><th class="num">Hh</th><th class="num">Prod. Plan→Real</th><th class="num">IP</th><th class="num">IE</th><th>Diagnóstico</th></tr></thead>
      <tbody>{sp_rows}</tbody>
    </table>
    <h2>2. Produtividade do Time Ágil (Pontos por Hora e Custo por Ponto)</h2>
    <table>
      <thead><tr><th>ID</th><th>Profissional</th><th class="num">Pontos Concl.</th><th class="num">Horas Totais</th><th class="num">Pontos / Hora</th><th class="num">Custo / Ponto</th></tr></thead>
      <tbody>{dev_rows}</tbody>
    </table>
    """
    docs.append(("D14_Produtividade_das_Equipes.pdf", "D14", "Produtividade das Equipes", "Análise de rendimento vs efetivo em fornecedores e produtividade por ponto no time ágil", d14))

    # ------------------------------------------------------------------
    # D15 — Análise Financeira
    # ------------------------------------------------------------------
    c1_fl_rows = "".join(
        f"<tr><td class='center mono'>{r['ano']}</td><td class='num mono'>{f_brl0(r['inv'])}</td><td class='num mono'>{f_brl0(r['ben'])}</td><td class='num mono'>{f_brl0(r['cop'])}</td><td class='num mono'><strong>{f_brl0(r['fl'])}</strong></td><td class='num mono'>{f_brl0(r['acum'])}</td></tr>"
        for r in c1["fluxo"]
    )
    d15 = f"""
    <div class="kpi-grid">
      <div class="kpi-card alert"><div class="kpi-label">ENT Atual (C1)</div><div class="kpi-val">{f_brl0(evm['ent'])}</div><div class="kpi-sub">Estouro de +{f_brl0(evm['ent']-evm['ont'])} sobre ONT</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Custo do Atraso (C1)</div><div class="kpi-val">{f_brl0(c1['catraso'])}</div><div class="kpi-sub">{c1['delay_du']} du × R$ 5.400/du</div></div>
      <div class="kpi-card navy"><div class="kpi-label">VPL Atualizado (C1)</div><div class="kpi-val">{f_brl0(c1['vpl'])}</div><div class="kpi-sub">TMA 14% · Payback {f_num(c1['payback'],2)} anos</div></div>
      <div class="kpi-card"><div class="kpi-label">Resultado Líquido (C1)</div><div class="kpi-val">{f_brl0(c1['resultado'])}</div><div class="kpi-sub">VPL − Custo do Atraso</div></div>
    </div>
    <h2>1. Fluxo de Caixa Atualizado do Projeto — Cenário Base C1 (Conv. 16 e 23)</h2>
    <table>
      <thead><tr><th class="center">Ano</th><th class="num">Investimento</th><th class="num">Benefício Bruto</th><th class="num">Custo Op.</th><th class="num">Fluxo Líquido</th><th class="num">Acumulado</th></tr></thead>
      <tbody>{c1_fl_rows}</tbody>
    </table>
    <h2>2. Decomposição dos Desvios Financeiros</h2>
    <ul>
      <li><strong>Desvio de Custo Real (CR − VA = {f_brl0(evm['cr'] - evm['va'])}):</strong> impulsionado por ocorrências de risco materializadas (R$ 157,7 mil), retrabalho de inspeções (>R$ 58 mil), horas extras operacionais (+50%) e desvio de velocidade no time ágil (custo real por ponto de <strong>{f_brl0(m['custo_pt'])}/pt</strong>).</li>
      <li><strong>Efeito no Caso de Negócio:</strong> o estouro de investimento no Ano 0 (+R$ 1,01 mi) somado à redução proporcional de 2,30 meses no benefício do Ano 1 reduz o VPL aprovado de <strong>{f_brl0(vpl_base)}</strong> para <strong>{f_brl0(c1['vpl'])}</strong> (queda de {f_brl0(vpl_base - c1['vpl'])}).</li>
      <li><strong>Custo de Gestão (à parte):</strong> {f_brl0(evm['cr_g'])} acumulados (indiretos + horas de gestão P01/P02).</li>
    </ul>
    """
    docs.append(("D15_Analise_Financeira.pdf", "D15", "Análise Financeira", "Fluxo de caixa atualizado, VPL (14% a.a.), payback simples, ENT e custo do atraso", d15))

    # ------------------------------------------------------------------
    # D16 — Cenários e Decisão
    # ------------------------------------------------------------------
    loss_notes = {
        "C1": "Mantém atraso de 32 du (R$ 172,8k) e estouro sem ação corretiva.",
        "C2": "Exige +R$ 214,7k de caixa imediato e pressão sobre equipe/reforços.",
        "C3": "Corta análise automática por IA (EP03) e medição pós-lançamento (−1% benefício).",
        "C4": "Eleva atraso para 44 du (30/03/27) e aumenta risco operacional em 2 praças.",
        "C5": "Descarta código próprio de IA já gasto e cria licença anual permanente (+R$ 10,6k/ano).",
        "C6": "Exige +R$ 34,8k e gestão paralela da onda piloto antes da expansão.",
    }
    sc_rows = ""
    for s in m["scens"]:
        is_best = s["id"] == best_sc["id"]
        cls = "highlight" if is_best else ""
        trade = " ".join(loss_notes.get(x, "") for x in s["id"].split("+"))
        sc_rows += f"<tr class='{cls}'><td class='mono'><strong>{s['id']}</strong>{' ★' if is_best else ''}</td><td class='center mono'>{f_date(s['end_date'])}</td><td class='num mono'>{s['delay_du']} du</td><td class='num mono'>{f_brl0(s['ent'])}</td><td class='num mono'>{f_brl0(s['catraso'])}</td><td class='num mono'>{f_brl0(s['vpl'])}</td><td class='num mono'>{f_num(s['payback'],2) if s['payback'] else '—'}a</td><td class='num mono'><strong>{f_brl0(s['resultado'])}</strong></td><td>{trade}</td></tr>"

    d16 = f"""
    <div class="callout">
      <strong>Recomendação Oficial ao Comitê Diretor:</strong> Pelo critério econômico-financeiro (<strong>VPL − Custo do Atraso</strong>), o cenário ótimo é <strong>{best_sc['id']} ({best_sc['nome']})</strong>, com <strong>VPL de {f_brl0(best_sc['vpl'])}</strong>, payback de <strong>{f_num(best_sc['payback'],2)} anos</strong> e resultado líquido de <strong>{f_brl0(best_sc['resultado'])}</strong> (ganho de <strong>+{f_brl0(best_sc['resultado'] - c1['resultado'])}</strong> sobre C1), assumindo o trade-off de ampliar o término para <strong>{f_date(best_sc['end_date'])} ({best_sc['delay_du']} du)</strong> e o desembolso para {f_brl0(best_sc['ent'])}. Caso haja restrição rígida de caixa ou prazo, <strong>C3</strong> reduz o desembolso para R$ 3,92 mi (cortando IA) e <strong>C6</strong> mantém o escopo completo antecipando 50% do benefício na praça piloto.
    </div>
    <div class="chart-box"><img src="{charts['d16_scens']}" /></div>
    <h2>Comparativo Completo — Cenários C1 a C6 e Combinações Válidas (Conv. 21–23)</h2>
    <table>
      <thead><tr><th>Cenário</th><th class="center">Término</th><th class="num">Atraso</th><th class="num">ENT</th><th class="num">C. Atraso</th><th class="num">VPL (14%)</th><th class="num">Payback</th><th class="num">Resultado</th><th>O que se perde ao escolher</th></tr></thead>
      <tbody>{sc_rows}</tbody>
    </table>
    """
    docs.append(("D16_Cenarios_e_Decisao.pdf", "D16", "Cenários e Recomendação de Decisão", "Simulação dos 6 cenários (C1–C6) e combinações com VPL, payback, prazo e trade-offs", d16))

    # ------------------------------------------------------------------
    # D17 — Mockups do Produto Digital e Mapa 3D Esquemático
    # ------------------------------------------------------------------
    mockup_catalog = [
        ("T01", "Início & Carteira de Apólices", "EP01", "R1", "MS-101, MS-102, MS-116", "ENTREGUE", "Ganha escolha de praça no C4 (MS-N1)"),
        ("T02", "Aviso de Sinistro & Guincho", "EP01", "R1", "MS-104, MS-109, MS-112, MS-117", "ENTREGUE", "Mantida em todos os cenários"),
        ("T03", "Vistoria Guiada por Foto", "EP02", "R1", "MS-103, MS-106, MS-110, MS-114, MS-115", "ENTREGUE", "Core do MVP (piloto 40 oficinas)"),
        ("T04", "Checklist de Fotos & Metadados", "EP02", "R2", "MS-159, MS-160", "EM ANDAMENTO", "MS-159 concluída S15; MS-160 em curso"),
        ("T05", "Análise Automática de Danos (IA)", "EP03", "R2", "MS-138, MS-140, MS-141, MS-142, MS-182", "EM ANDAMENTO", "Cortada no C3; trocada por mercado no C5"),
        ("T06", "Justificativa & Revisão da IA", "EP03", "R2", "MS-157, MS-184", "EM ANDAMENTO", "MS-184 (R3) cortada no C3 / trocada no C5"),
        ("T07", "Escolha de Oficina & Agendamento", "EP04", "R1", "MS-107, MS-113, MS-118", "ENTREGUE", "Integrada às 40 oficinas credenciadas"),
        ("T08", "Portal do Orçamento & Peças", "EP04", "R1/R2", "MS-105, MS-111, MS-119, MS-158", "EM ANDAMENTO", "MS-158 em teste na Sprint S15"),
        ("T09", "Linha do Tempo do Conserto", "EP05", "R2", "MS-130, MS-133, MS-139, MS-181", "EM ANDAMENTO", "MS-181 (could R3) removida no C3"),
        ("T10", "Pagamento Pix & Quitação", "EP06", "R2", "MS-134, MS-136, MS-137, MS-143, MS-150, MS-179", "EM ANDAMENTO", "MS-179 (could R3) removida no C3"),
        ("T11", "Portal do Corretor (Tablet)", "EP07", "R3", "MS-167, MS-168, MS-169, MS-183", "PLANEJADA", "MS-183 (could R3) removida no C3"),
        ("T12", "Prevenção a Fraude & EXIF", "EP08", "R3", "MS-162, MS-163, MS-164, MS-180", "PLANEJADA", "MS-180 (could R3) removida no C3"),
        ("T13", "Aviso Rápido de Vidros", "EP01", "R2", "MS-161", "EM ANDAMENTO", "Bloqueada pelo impedimento IP-014"),
        ("T14", "Avaliação NPS & Tablet UX", "EP05", "R2", "MS-131, MS-224, MS-228", "EM ANDAMENTO", "MS-228 concluída S15; MS-224 em teste"),
    ]
    mk_rows = "".join(
        f"<tr><td class='mono'>{t[0]}</td><td><strong>{t[1]}</strong></td><td class='center mono'>{t[2]}</td><td class='center mono'>{t[3]}</td><td class='mono'>{t[4]}</td><td class='center'><span class='badge {'b-teal' if t[5]=='ENTREGUE' else ('b-sand' if t[5]=='EM ANDAMENTO' else 'b-navy')}'>{t[5]}</span></td><td>{t[6]}</td></tr>"
        for t in mockup_catalog
    )
    el3d_rows = "".join(
        f"<tr><td class='mono'>{e['id_elemento']}</td><td>{e['nome_elemento']}</td><td class='mono'>{e['tipo_elemento']}</td><td class='center mono'>({e['x']},{e['y']},{e['z']})</td><td class='center mono'>{e['largura']}×{e['comprimento']}×{e['altura']}</td><td class='mono'>{e['vinculo_tipo']}: {e['vinculo_ids'] or 'Base'}</td></tr>"
        for e in db["38_elementos_3d"]
    )
    d17 = f"""
    <div class="callout">
      <strong>Protótipo Interativo Publicado:</strong> As <strong>14 telas navegáveis</strong> do aplicativo Maré Seguros (com controle de data e filtro de cenários C1/C3/C4/C5) e o <strong>Mapa 3D Esquemático em Three.js</strong> (26 elementos da Tabela 38) estão disponíveis ao vivo em <strong>https://sistema-ruddy.vercel.app</strong> na aba <em>Mockups do Produto</em>.
    </div>
    <h2>1. Catálogo das 14 Telas Navegáveis do Produto Digital (EP01–EP08)</h2>
    <table>
      <thead><tr><th>Tela</th><th>Nome da Tela</th><th class="center">Épico</th><th class="center">Rel.</th><th>Itens Backlog</th><th class="center">Status 13/11</th><th>Impacto nos Cenários</th></tr></thead>
      <tbody>{mk_rows}</tbody>
    </table>
    <h2>2. Elementos do Mapa 3D Esquemático do Produto Digital (Tabela 38 — 26 Elementos)</h2>
    <table>
      <thead><tr><th>ID</th><th>Elemento</th><th>Tipo</th><th class="center">Posição (x,y,z)</th><th class="center">Dimensões (m)</th><th>Vínculo no Projeto</th></tr></thead>
      <tbody>{el3d_rows}</tbody>
    </table>
    """
    docs.append(("D17_Mockups_do_Produto_e_Mapa_3D.pdf", "D17", "Mockups Navegáveis e Mapa 3D Esquemático", "Catálogo das 14 telas do aplicativo Maré Seguros, vínculos de backlog e cena 3D (Tabela 38)", d17))

    for filename, code, title, subtitle, body in docs:
        html = wrap_html(code, title, subtitle, body, logo_uri)
        out_path = os.path.join(DOCS_DIR, filename)
        render_pdf(html, out_path)
        size_kb = os.path.getsize(out_path) / 1024
        print(f"OK {filename} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    build_all_documents()
