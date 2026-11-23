"""Gera os 17 documentos oficiais (D01 a D17) em PDF na pasta docs/.

O projeto da Maré Seguros é HÍBRIDO (retorno do professor, 23/11/2026):
- a frente ÁGIL (backlog, sprints, Jira) é a maior — por isso o grupo faz mockups;
- a frente PREDITIVA (regulatório, parceiros, equipamentos, conteúdo, piloto e lançamento)
  é menor, mas entra normalmente: EAP, cronograma no ProjectLibre, caminho crítico e valor agregado;
- as releases são marcos da rede preditiva, então o término depende das duas trilhas juntas.

Uso: python scripts/gerar_documentos.py   (Chrome ou Edge instalados; CHROME_BIN opcional)
"""
import os
import shutil
import subprocess
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

from doc_engine import (
    BASE_DIR,
    add_days,
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
os.makedirs(DOCS_DIR, exist_ok=True)


def find_browser():
    """Chrome/Edge para imprimir o HTML em PDF (Mac, Windows ou Linux)."""
    candidatos = [
        os.environ.get("CHROME_BIN", ""),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        shutil.which("google-chrome") or "",
        shutil.which("chromium") or "",
    ]
    for c in candidatos:
        if c and os.path.exists(c):
            return c
    raise SystemExit("Chrome ou Edge não encontrado. Defina a variável CHROME_BIN com o caminho do navegador.")


CHROME_BIN = find_browser()


CSS_TEMPLATE = """
@page {
  size: A4;
  margin: 13mm 14mm 15mm 14mm;
}
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1E293B;
  font-size: 9.2pt;
  line-height: 1.42;
  margin: 0;
  padding: 0;
  background: #FFFFFF;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 3px solid #0D2F52;
  padding-bottom: 9px;
  margin-bottom: 12px;
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
  font-size: 8pt;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.4px;
  margin-bottom: 3px;
}
.doc-title {
  margin: 0;
  font-size: 14pt;
  font-weight: 800;
  color: #0D2F52;
  line-height: 1.15;
}
.doc-sub {
  margin: 2px 0 0 0;
  font-size: 8.3pt;
  color: #64748B;
}
.header-meta {
  text-align: right;
  font-size: 7.8pt;
  color: #475569;
  line-height: 1.38;
}
.header-meta strong { color: #0D2F52; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.kpi-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}
.kpi-card {
  background: #F4F8FA;
  border: 1px solid #DCE7EE;
  border-top: 3px solid #139297;
  border-radius: 6px;
  padding: 7px 9px;
}
.kpi-card.warn { border-top-color: #B89456; }
.kpi-card.alert { border-top-color: #B85D53; }
.kpi-card.navy { border-top-color: #0D2F52; }
.kpi-label {
  font-size: 7.2pt;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #64748B;
  font-weight: 600;
}
.kpi-val {
  font-size: 12pt;
  font-weight: 800;
  color: #0D2F52;
  margin-top: 2px;
}
.kpi-sub {
  font-size: 7.3pt;
  color: #475569;
  margin-top: 2px;
}

h2 {
  font-size: 10.6pt;
  font-weight: 700;
  color: #0D2F52;
  border-left: 4px solid #139297;
  padding-left: 8px;
  margin: 12px 0 6px 0;
  page-break-after: avoid;
}
p { margin: 0 0 6px 0; }
ul { margin: 4px 0 8px 18px; padding: 0; }
li { margin-bottom: 3px; }

table {
  width: 100%;
  border-collapse: collapse;
  margin: 5px 0 10px 0;
  font-size: 7.9pt;
}
thead th {
  background: #0D2F52;
  color: #FFFFFF;
  text-align: left;
  padding: 4.5px 6px;
  font-weight: 600;
  white-space: nowrap;
}
tbody td {
  padding: 4px 6px;
  border-bottom: 1px solid #E2E8F0;
  vertical-align: top;
}
tbody tr:nth-child(even) { background: #F8FAFC; }
tbody tr.highlight { background: #E6F4F4; font-weight: 700; }
tbody tr.alert-row { background: #FDF2F2; }
tbody tr.warn-row { background: #FBF7EE; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.center { text-align: center; }
.mono { font-family: "SFMono-Regular", Consolas, monospace; font-size: 7.5pt; }

.callout {
  background: #F4F8FA;
  border-left: 4px solid #139297;
  border-radius: 0 6px 6px 0;
  padding: 7px 10px;
  margin: 7px 0 10px 0;
  font-size: 8.4pt;
  page-break-inside: avoid;
}
.callout.warn { background: #FBF7EE; border-left-color: #B89456; }
.callout.alert { background: #FDF2F2; border-left-color: #B85D53; }
.callout strong { color: #0D2F52; }

.badge {
  display: inline-block;
  padding: 1.5px 6px;
  border-radius: 999px;
  font-size: 7.1pt;
  font-weight: 700;
  white-space: nowrap;
}
.b-teal { background: #E0F3F3; color: #0E6E72; }
.b-navy { background: #E5ECF3; color: #0D2F52; }
.b-sand { background: #F6EFE0; color: #8A6B32; }
.b-coral { background: #F9E5E3; color: #9A3F36; }

.chart-box {
  text-align: center;
  margin: 7px 0 10px 0;
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
  margin-top: 10px;
  padding-top: 5px;
  border-top: 1px solid #CBD5E1;
  font-size: 7.3pt;
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
        <div class="doc-code">{code} · ESCRITÓRIO DE PROJETOS · PROJETO HÍBRIDO</div>
        <h1 class="doc-title">{title}</h1>
        <p class="doc-sub">{subtitle}</p>
      </div>
    </div>
    <div class="header-meta">
      <div><strong>Grupo 3 — Maré Seguros</strong></div>
      <div>ENGN62 · Gestão de Projetos (2026.2)</div>
      <div>Data de Status: <strong>13/11/2026 (Sprint S15)</strong></div>
      <div>Sistema: sistema-ruddy.vercel.app</div>
    </div>
  </div>
  {body_html}
  <div class="footer-note">
    <span>Maré Seguros · Aplicativo de Aviso de Sinistro com Vistoria por Foto · Frente Preditiva + Frente Ágil</span>
    <span>{code} — Base reconciliada em 13/11/2026</span>
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
                Path(tmp_html).as_uri(),
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
    act_by_id = {a["id"]: a for a in net["acts"]}
    evm = m["evm_1113"]
    evm09 = m["evm_0925"]
    ag = m["ag_base"]
    c1 = next(s for s in m["scens"] if s["id"] == "C1")
    best_sc = max(m["scens"], key=lambda s: s["resultado"])
    eq_map = {x["id_pessoa"]: x["nome"] for x in db["04_equipe"]}

    ent_a = evm["ont_a"] / evm["idc_a"]
    ent_a_09 = evm09["ont_a"] / evm09["idc_a"]
    total_pts_all = sum(int(b["pontos"]) for b in db["14_backlog_itens"])
    done_items_all = [b for b in db["14_backlog_itens"] if b["status"] == "CONCLUIDO"]
    done_pts_all = sum(int(b["pontos"]) for b in done_items_all)

    # Interfaces entre as trilhas: cada release (marco ágil) libera uma etapa preditiva
    def status_marco(aid):
        a = act_by_id.get(aid, {})
        if a.get("situacao") == "CONCLUIDA":
            return '<span class="badge b-teal">Entregue</span>'
        if a.get("crit_f"):
            return '<span class="badge b-coral">No caminho crítico</span>'
        return f'<span class="badge b-navy">Folga de {a.get("fls", 0) - a.get("fes", 0)} du</span>'

    interfaces = [
        ("M2", "A40", "Release 1 (MVP)", "A27 — Conduzir o piloto com 40 oficinas e 25 corretores", "Piloto só começa com a R1 em produção", "P11 Sílvia (PO) + P09 Heitor (Operações)"),
        ("M4", "A41", "Release 2", "A32 → A33 → A35 — Testes finais e entrada em operação", "Entrada em operação exige a R2 e os testes de carga/segurança", "P11 Sílvia (PO) + P10 Fábio (QA)"),
        ("—", "A42", "Release 3", "A39 — Encerrar o projeto e transferir para a operação", "Encerramento formal só após a R3", "P01 Helena (GP)"),
    ]
    interfaces_rows = "".join(
        f"<tr class='{'alert-row' if act_by_id.get(aid, {}).get('crit_f') else ''}'><td class='mono'>{mc}</td><td><strong>{rel}</strong> <span class='mono'>({aid})</span></td><td class='center mono'>{f_date(act_by_id.get(aid, {}).get('f_end_date', ''))}</td><td>{dest}</td><td>{dep}</td><td>{dono}</td><td class='center'>{status_marco(aid)}</td></tr>"
        for mc, aid, rel, dest, dep, dono in interfaces
    )
    interfaces_table = f"""
    <table>
      <thead><tr><th>Marco</th><th>Release (frente ágil)</th><th class="center">Real / Prev.</th><th>Libera na frente preditiva</th><th>Dependência</th><th>Dono da interface</th><th class="center">Situação</th></tr></thead>
      <tbody>{interfaces_rows}</tbody>
    </table>"""
    crit_txt = " → ".join(net["crit_f"])
    ent_p = evm["ont_p"] / evm["idc_p"]

    docs = []

    # ------------------------------------------------------------------
    # D01 — Termo de Abertura e Caso de Negócio (projeto híbrido)
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
      <div class="kpi-card navy"><div class="kpi-label">ONT do Projeto (2 frentes)</div><div class="kpi-val">{f_brl0(evm['ont'])}</div><div class="kpi-sub">Preditiva {f_brl0(evm['ont_p'])} + Ágil {f_brl0(evm['ont_a'])}</div></div>
      <div class="kpi-card"><div class="kpi-label">VPL Caso de Negócio</div><div class="kpi-val">{f_brl0(vpl_base)}</div><div class="kpi-sub">TMA aprovada: 14,0% a.a.</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Término Contratual</div><div class="kpi-val">22/01/2027</div><div class="kpi-sub">Linha de base da rede: {f_date(net['end_lb'])} ({net['dur_lb']} du)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Custo do Atraso</div><div class="kpi-val">R$ 5.400/du</div><div class="kpi-sub">Conting. R$ 73k · Gerenc. R$ 91k</div></div>
    </div>
    <h2>1. Termo de Abertura do Projeto (Project Charter)</h2>
    <div class="callout">
      <strong>Objetivo Aprovado:</strong> {p['objetivo_do_projeto']}<br/>
      <strong>Patrocinadora:</strong> Samara Guimarães (Diretora de Operações — PI01) &nbsp;|&nbsp;
      <strong>Gerente do Projeto:</strong> Helena Macedo (P01) &nbsp;|&nbsp;
      <strong>Product Owner:</strong> Sílvia Trindade (P11) &nbsp;|&nbsp;
      <strong>Início (du 1):</strong> {f_date(p['data_inicio_projeto'])} &nbsp;|&nbsp;
      <strong>Abordagem:</strong> Projeto híbrido — frente ágil (maior) + frente preditiva (menor).
    </div>
    <p>A <strong>Maré Seguros</strong>, seguradora regional de automóveis em Salvador/BA, substitui o fluxo telefônico com vistoria presencial por um aplicativo móvel de aviso de sinistro com vistoria guiada por foto, análise automática de danos por inteligência artificial e acompanhamento do conserto junto a 40 oficinas credenciadas e 25 corretores. A construção do aplicativo é a maior parte do trabalho e segue a <strong>frente ágil</strong>; regulação, parcerias, equipamentos, conteúdo, piloto e lançamento seguem a <strong>frente preditiva</strong>. As releases do aplicativo entram na rede preditiva como marcos — por isso a data final depende das duas trilhas juntas.</p>
    <div class="grid-2">
      <div class="card"><strong>Frente Preditiva (EAP · ProjectLibre · {f_brl0(evm['ont_p'])}):</strong> adequação à Susep e à LGPD, seleção e integração do provedor de IA de imagens, kits de vistoria para 40 oficinas, conteúdo e campanha, piloto, atendimento, treinamento e entrada em operação — 39 atividades estimadas por três pontos, organizadas nas entregas 1.1 a 1.6 da EAP.</div>
      <div class="card"><strong>Frente Ágil (Backlog · Jira · {f_brl0(evm['ont_a'])}):</strong> o aplicativo em 8 épicos (EP01–EP08) e {len(db['14_backlog_itens'])} itens ({total_pts_all} pts), sprints quinzenais desde 20/04/2026 e 3 releases — <strong>R1 (MVP) entregue em 24/07/2026</strong>, <strong>R2 prevista para {f_date(ag['r2_d'])}</strong> e <strong>R3 prevista para {f_date(ag['r3_d'])}</strong> —, que são a entrega 1.7 da EAP e os marcos A40–A42 da rede.</div>
    </div>
    <h2>2. Marcos que ligam as duas trilhas</h2>
    {interfaces_table}
    <h2>3. Caso de Negócio Aprovado (Fluxo Anual — Tabela 02)</h2>
    <table>
      <thead><tr><th class="center">Ano</th><th class="num">Investimento</th><th class="num">Benefício Bruto</th><th class="num">Custo Operacional</th><th class="num">Fluxo Líquido</th><th class="num">Fluxo Acumulado</th></tr></thead>
      <tbody>{cn_rows}</tbody>
    </table>
    <div class="chart-box"><img src="{charts['d1_cashflow']}" /></div>
    """
    docs.append(("D01_Termo_de_Abertura_e_Caso_de_Negocio.pdf", "D01", "Termo de Abertura e Caso de Negócio", "Objetivo, escopo das duas frentes (preditiva e ágil), marcos de interface e viabilidade financeira", d01))

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
      <div class="kpi-card"><div class="kpi-label">Reuniões e Ritos</div><div class="kpi-val">{len(db['33_reunioes'])}</div><div class="kpi-sub">Atas publicadas: {atas_ok}/{len(db['33_reunioes'])}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Patrocinadora (PI01)</div><div class="kpi-val">NEUTRO (6,0)</div><div class="kpi-sub">Presença em {patr_pres} reuniões (queda de LIDERA)</div></div>
    </div>
    <h2>1. Registro de Partes Interessadas e Engajamento (Nov/2026)</h2>
    <table>
      <thead><tr><th>ID</th><th>Parte Interessada / Contato</th><th class="center">P×I</th><th>Estratégia</th><th>Inicial → Desejado</th><th>Atual (Nov/26)</th></tr></thead>
      <tbody>{pi_rows}</tbody>
    </table>
    <div class="chart-box"><img src="{charts['d2_pi']}" /></div>
    <h2>2. Plano de Comunicação das Duas Frentes</h2>
    <div class="callout warn">
      <strong>Alerta de Engajamento:</strong> O Diretor Comercial (PI02, poder 4 × interesse 5) caiu para <strong>RESISTENTE (satisfação 2,7/10, zero interações em nov/26)</strong> após frustrações com o atraso da Release 2 e da entrada em operação — justamente quem inseriu <strong>9 pedidos diretos (35 pts)</strong> fora do controle de mudanças. A Patrocinadora (PI01) também recuou de LIDERA para NEUTRO (6,0).
    </div>
    <table>
      <thead><tr><th>Fórum</th><th>Frente</th><th class="num">Realizadas</th><th>Público</th><th>Objetivo</th></tr></thead>
      <tbody>
        <tr><td><strong>Comitê Diretor</strong></td><td>Projeto</td><td class="num mono">{re_counts['COMITE_DIRETOR']}</td><td>PI01, PI02, PI03, PI04, PI11</td><td>Decidir cenários, orçamento, reservas e mudanças acima da alçada do gerente.</td></tr>
        <tr><td><strong>Status Semanal</strong></td><td>Preditiva</td><td class="num mono">{re_counts['STATUS_SEMANAL']}</td><td>GP, PMO e líderes de disciplina (REG, INT, HW, CON, OPS, QA)</td><td>Avanço físico, caminho crítico no ProjectLibre, contratos e marcos.</td></tr>
        <tr><td><strong>Planejamento e Revisão da Sprint</strong></td><td>Ágil</td><td class="num mono">{re_counts['PLANEJAMENTO_DA_SPRINT']} · {re_counts['REVISAO_DA_SPRINT']}</td><td>PO (P11), squad, PI02 e representantes do piloto (PI09)</td><td>Priorizar o backlog e demonstrar o incremento das releases.</td></tr>
        <tr><td><strong>Retrospectiva</strong></td><td>Ágil</td><td class="num mono">{re_counts['RETROSPECTIVA']}</td><td>Squad e Scrum Master (P12)</td><td>Processo, qualidade e pulso do time.</td></tr>
        <tr><td><strong>Comunicação formal por marco</strong></td><td>Preditiva</td><td class="num mono">—</td><td>Susep (PI06), provedor de IA (PI07), fornecedor de equipamentos (PI08), oficinas e corretores (PI09)</td><td>Protocolos regulatórios (M3), aceite de integração e de kits, convocação e resultado do piloto.</td></tr>
      </tbody>
    </table>
    """
    docs.append(("D02_Partes_Interessadas_e_Comunicacao.pdf", "D02", "Partes Interessadas e Comunicação", "Mapeamento Poder × Interesse, engajamento mensal e comunicação das frentes preditiva e ágil", d02))

    # ------------------------------------------------------------------
    # D03 — EAP e Dicionário da EAP (duas frentes) + épicos da entrega 1.7
    # ------------------------------------------------------------------
    ep_dod = {
        "EP01": "Cadastro/login validado, aviso de sinistro e acionamento de guincho testados em produção com cobertura automatizada e aprovação da PO.",
        "EP02": "Captura guiada por foto com checklist obrigatório, validação de metadados e upload resiliente aprovados em homologação e piloto.",
        "EP03": "Motor de classificação automática de danos integrado, tela de justificativa revisada por QA e acurácia mínima de 85% validada.",
        "EP04": "Portal de oficinas com agendamento, envio de orçamento e aprovação de peças integrados às 40 oficinas credenciadas.",
        "EP05": "Linha do tempo em tempo real do conserto, notificações push e coleta de NPS validados com usuários do piloto.",
        "EP06": "Fluxo de quitação e pagamento via Pix validado em testes de segurança, conciliação financeira e revisão por par.",
        "EP07": "Painel do corretor responsivo em tablet/web com acompanhamento da carteira e zero defeitos críticos abertos.",
        "EP08": "Verificação antifraude (EXIF, geolocalização e consistência temporal) validada sem impacto no tempo de abertura do sinistro.",
    }
    ep_struct_rows = ""
    for ep in db["13_epicos"]:
        its = [b for b in db["14_backlog_itens"] if b["id_epico"] == ep["id_epico"]]
        pts_t = sum(int(b["pontos"]) for b in its)
        pts_d = sum(int(b["pontos"]) for b in its if b["status"] == "CONCLUIDO")
        pts_r = pts_t - pts_d
        pct = pts_d / pts_t * 100 if pts_t else 0
        cls = "highlight" if pct >= 99 else ("warn-row" if pct < 40 else "")
        ep_struct_rows += f"<tr class='{cls}'><td class='mono'>{ep['id_epico']}</td><td><strong>{ep['nome_epico']}</strong><br/><span style='color:#64748B'>Persona: {ep['persona']}</span></td><td class='center mono'>{ep['id_release_planejada']}</td><td class='num mono'>{len(its)}</td><td class='num mono'>{pts_d}/{pts_t} ({pct:.0f}%)</td><td class='num mono'>{pts_r} pts</td><td>{ep_dod.get(ep['id_epico'], 'Incremento testado e aceito pela PO')}</td></tr>"

    rel_summary = ""
    for rel in db["16_releases"]:
        its = [b for b in db["14_backlog_itens"] if b["id_release"] == rel["id_release"]]
        pts_t = sum(int(b["pontos"]) for b in its)
        pts_d = sum(int(b["pontos"]) for b in its if b["status"] == "CONCLUIDO")
        rel_summary += f"<tr><td class='mono'><strong>{rel['id_release']}</strong></td><td><strong>{rel['nome_release']}</strong></td><td>{rel['objetivo']}</td><td class='num mono'>{len(its)} itens</td><td class='num mono'>{pts_d} / {pts_t} pts ({pts_d/pts_t*100:.0f}%)</td></tr>"

    acts_by_eap = defaultdict(list)
    for a in db["07_atividades"]:
        acts_by_eap[a["codigo_eap"]].append(a["id_atividade"])
    eap_rows = ""
    for e in db["06_eap"]:
        pad = "&nbsp;&nbsp;" * (int(e["nivel"]) - 1) * 2
        cls = "highlight" if e["nivel"] == "1" else ("warn-row" if e["nivel"] == "2" else "")
        aids = ", ".join(acts_by_eap.get(e["codigo_eap"], [])) or "—"
        trilha = "" if e["tipo_elemento"] != "PACOTE_DE_TRABALHO" else ('<span class="badge b-teal">Ágil</span>' if e["disciplina"] == "AGI" else '<span class="badge b-navy">Preditiva</span>')
        eap_rows += f"<tr class='{cls}'><td class='mono'>{e['codigo_eap']}</td><td>{pad}<strong>{e['nome']}</strong></td><td class='mono'>{e['tipo_elemento'].replace('_', ' ')}</td><td class='center'>{trilha}</td><td>{eq_map.get(e['id_responsavel'], e['id_responsavel'])}</td><td class='mono'>{aids}</td><td>{e['criterio_de_aceite'] or '—'}</td></tr>"
    n_pacotes = sum(1 for e in db["06_eap"] if e["tipo_elemento"] == "PACOTE_DE_TRABALHO")
    n_entregas = sum(1 for e in db["06_eap"] if e["tipo_elemento"] == "ENTREGA")

    d03 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Estrutura da EAP</div><div class="kpi-val">1 Projeto · {n_entregas} Entregas</div><div class="kpi-sub">{n_pacotes} pacotes de trabalho (substantivos)</div></div>
      <div class="kpi-card"><div class="kpi-label">Regra de Nomenclatura</div><div class="kpi-val">Pacotes = entregas</div><div class="kpi-sub">Atividades com verbo no infinitivo</div></div>
      <div class="kpi-card"><div class="kpi-label">Frente Preditiva</div><div class="kpi-val">Entregas 1.1 a 1.6</div><div class="kpi-sub">39 atividades estimadas (O/M/P)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Frente Ágil</div><div class="kpi-val">Entrega 1.7</div><div class="kpi-sub">3 releases = marcos A40–A42 · {done_pts_all}/{total_pts_all} pts</div></div>
    </div>
    <div class="callout">
      <strong>Uma EAP para as duas frentes:</strong> as entregas 1.1 a 1.6 são a frente preditiva e entram no ProjectLibre como tarefas-resumo, com as atividades dentro. A entrega 1.7 é o produto digital: cada release é um pacote da EAP e um marco da rede (A40, A41 e A42); o detalhamento em épicos e itens fica no Jira (seção 2).
    </div>
    <h2>1. EAP e Dicionário da EAP (Tabelas 06 e 07)</h2>
    <table>
      <thead><tr><th>Código</th><th>Elemento da EAP (entrega / pacote)</th><th>Tipo</th><th class="center">Frente</th><th>Responsável</th><th>Atividades</th><th>Critério de Aceite</th></tr></thead>
      <tbody>{eap_rows}</tbody>
    </table>
    <h2>2. Detalhamento da Entrega 1.7 — Releases do Produto Digital (Tabela 16)</h2>
    <table>
      <thead><tr><th>Release</th><th>Nome da Entrega</th><th>Objetivo de Negócio</th><th class="num">Itens</th><th class="num">Avanço em Pontos</th></tr></thead>
      <tbody>{rel_summary}</tbody>
    </table>
    <h2>3. Dicionário de Épicos e Definição de Pronto — DoD (Tabelas 13 e 14)</h2>
    <table>
      <thead><tr><th>Épico</th><th>Entrega / Persona</th><th class="center">Rel.</th><th class="num">Itens</th><th class="num">Concluído</th><th class="num">Restante</th><th>Critério de Aceite / Definição de Pronto (DoD)</th></tr></thead>
      <tbody>{ep_struct_rows}</tbody>
    </table>
    """
    docs.append(("D03_EAP_e_Dicionario_da_EAP.pdf", "D03", "EAP e Dicionário da EAP", "Entregas, pacotes de trabalho, responsáveis e critérios de aceite das duas frentes, com o detalhamento ágil da entrega 1.7", d03))

    # ------------------------------------------------------------------
    # D04 — Cronograma (ProjectLibre), caminho crítico e sprints que alimentam os marcos
    # ------------------------------------------------------------------
    rel_rows_d4 = ""
    for r in db["16_releases"]:
        prev = f_date(r["data_real"]) if r["data_real"] else (f_date(ag["r2_d"]) if r["id_release"] == "R2" else f_date(ag["r3_d"]))
        if r["data_real"]:
            # sprint em que a release foi de fato entregue (R1: planejada na S06, entregue no fim da S07)
            sp_prev = next((s["id_sprint"] for s in db["15_sprints"] if s["data_inicio"] <= r["data_real"] <= s["data_fim"]), r["id_sprint_planejada"])
        else:
            sp_prev = f"S{15 + ag['sr2']}" if r["id_release"] == "R2" else f"S{15 + ag['sr3']}"
        st_badge = '<span class="badge b-teal">Entregue</span>' if r["data_real"] else '<span class="badge b-sand">Projetada</span>'
        rel_rows_d4 += f"<tr><td class='mono'><strong>{r['id_release']}</strong></td><td><strong>{r['nome_release']}</strong></td><td class='center mono'>{r['id_sprint_planejada']} ({f_date(r['data_planejada'])})</td><td class='center mono'><strong>{sp_prev} ({prev})</strong></td><td>{st_badge}</td><td>{r['objetivo']}</td></tr>"

    sp_map_full = {s["id_sprint"]: s for s in db["15_sprints"]}
    sp_table_rows = ""
    for sv in m["sp_vel"]:
        sraw = sp_map_full[sv["id"]]
        taxa = (sv["done"] / sv["plan"] * 100) if sv["plan"] else 0
        cls = "alert-row" if sv["done"] <= 10 else ("highlight" if sv["done"] >= 24 else "")
        sp_table_rows += f"<tr class='{cls}'><td class='mono'>{sv['id']}</td><td class='center mono'>{f_date(sv['ini'])} – {f_date(sv['fim'])}</td><td class='num mono'>{sv['plan']} pts</td><td class='num mono'><strong>{sv['done']} pts</strong></td><td class='num mono'>{taxa:.0f}%</td><td>{sraw['meta_da_sprint']}</td><td class='center'><span class='badge b-navy'>Concluída</span></td></tr>"

    # Projeção S16..S22
    rem_tmp = ag["rem_r3"]
    for k in range(1, ag["sr3"] + 1):
        sn_num = 15 + k
        sid = f"S{sn_num}"
        d_fim = sp_map_full[sid]["data_fim"] if sid in sp_map_full else add_days("2026-11-13", k * 14)
        d_ini = sp_map_full[sid]["data_inicio"] if sid in sp_map_full else add_days(d_fim, -11)
        prev_pts = min(rem_tmp, int(round(m["vel_media"])))
        rem_tmp = max(0, rem_tmp - prev_pts)
        marco = " ★ Marco Release 2 (Operação)" if k == ag["sr2"] else (" ★ Marco Release 3 (Produto Completo)" if k == ag["sr3"] else "Execução priorizada no Jira")
        cls = "highlight" if k in (ag["sr2"], ag["sr3"]) else ""
        sp_table_rows += f"<tr class='{cls}'><td class='mono'>{sid}</td><td class='center mono'>{f_date(d_ini)} – {f_date(d_fim)}</td><td class='num mono'>~{prev_pts} pts</td><td class='num mono'>—</td><td class='num mono'>Proj.</td><td>{marco}</td><td class='center'><span class='badge b-teal'>Projetada</span></td></tr>"

    m_rows = ""
    for mc in db["10_marcos"]:
        a = act_by_id.get(mc["id_atividade"], {})
        real_prev = f_date(mc["data_real"]) if mc["data_real"] else f_date(a.get("f_end_date", ""))
        situ = '<span class="badge b-teal">Cumprido</span>' if mc["data_real"] else ('<span class="badge b-coral">Previsto · crítico</span>' if a.get("crit_f") else '<span class="badge b-sand">Previsto</span>')
        m_rows += f"<tr><td class='mono'>{mc['id_marco']}</td><td><strong>{mc['nome_marco']}</strong></td><td class='mono'>{mc['id_atividade']}</td><td class='center mono'>{f_date(a.get('lb_end_date', ''))}</td><td class='center mono'>{real_prev}</td><td>{situ}</td></tr>"

    cpm_rows = ""
    for a in net["acts"]:
        cls = "alert-row" if a["crit_f"] else ("warn-row" if a["crit_lb"] else "")
        omp = f"{a['o']}/{a['m']}/{a['p']}" if a["tipo"] == "ESTIMADA" else "Marco ágil"
        badge = '<span class="badge b-coral">CRÍTICA</span>' if a["crit_f"] else ('<span class="badge b-sand">LB</span>' if a["crit_lb"] else "—")
        cpm_rows += f"<tr class='{cls}'><td class='mono'>{a['id']}</td><td>{a['nome']}</td><td class='center mono'>{omp}</td><td class='num mono'>{a['dur_lb']} du</td><td class='num mono'>{a['es_lb']}..{a['ef_lb']}</td><td class='num mono'>{a['folga_lb']}</td><td class='num mono'>{a['avanco']:.0f}%</td><td class='center mono'>{f_date(a['f_end_date'])}</td><td class='center'>{badge}</td></tr>"

    d04 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Prazo Linha de Base</div><div class="kpi-val">{net['dur_lb']} du</div><div class="kpi-sub">Término LB: {f_date(net['end_lb'])} (contratual 22/01/27)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Previsão Atual (13/11)</div><div class="kpi-val">{f_date(net['fend_date'])}</div><div class="kpi-sub">du {net['fend_du']} (+{net['delay_du']} du além do contrato)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Caminho Crítico Previsto</div><div class="kpi-val" style="font-size:9.5pt">{crit_txt}</div><div class="kpi-sub">LB: {' → '.join(net['crit_lb'])}</div></div>
      <div class="kpi-card"><div class="kpi-label">Sub-rede M1 / M2</div><div class="kpi-val">106 du · σ=3,65</div><div class="kpi-sub">Crítico M1: A22→A25→A26→A27→A31→A35</div></div>
    </div>
    <div class="callout alert">
      <strong>O término depende das duas trilhas:</strong> o caminho crítico previsto começa na <strong>Release 2 (A41, frente ágil, prevista para {f_date(ag['r2_d'])})</strong> e segue pela frente preditiva — testes de carga e segurança (A32), auditoria (A33), entrada em operação (A35), operação assistida (A36) e encerramento (A39). Cada sprint de atraso na R2 empurra o término do projeto na mesma medida.
    </div>
    <div class="callout">
      <strong>Cadastro no ProjectLibre:</strong> calendário com os feriados da tabela 11; EAP (D03) como tarefas-resumo; duração PERT arredondada para cima (Conv. 1); predecessoras com tipo e defasagem (tabela 08); releases como marcos de duração fixa (A40–A42); linha de base salva e avanço real em 13/11/2026. O arquivo <code>.pod</code>, o PDF do Gantt e a rede com o caminho crítico ficam em <code>docs/</code> e devem mostrar o mesmo caminho crítico deste documento e do sistema.
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
    <h2>3. Frente Ágil: Releases e Sprints que alimentam os marcos A40–A42</h2>
    <div class="callout">
      <strong>Previsão das releases pela velocidade real:</strong> média das 5 últimas sprints = <strong>{f_num(m['vel_media'],1)} pts/sprint</strong> (meta 17,3) sobre o backlog restante, respeitando os feriados do calendário. Essas datas entram na rede como término dos marcos ágeis (Conv. 11).
    </div>
    <div class="chart-box"><img src="{charts['d4_roadmap']}" /></div>
    <table>
      <thead><tr><th>ID</th><th>Release</th><th class="center">Sprint / Data LB</th><th class="center">Real / Projetada</th><th>Status</th><th>Objetivo de Entrega</th></tr></thead>
      <tbody>{rel_rows_d4}</tbody>
    </table>
    <table>
      <thead><tr><th>Sprint</th><th class="center">Período</th><th class="num">Plan.</th><th class="num">Entregue</th><th class="num">Ader.</th><th>Meta / Marco</th><th class="center">Situação</th></tr></thead>
      <tbody>{sp_table_rows}</tbody>
    </table>
    """
    docs.append(("D04_Cronograma_ProjectLibre_e_Caminho_Critico.pdf", "D04", "Cronograma (ProjectLibre) e Caminho Crítico", "Rede PERT/CPM das 42 atividades, marcos, caminho crítico e as releases da frente ágil como marcos da rede", d04))

    # ------------------------------------------------------------------
    # D05 — Orçamento Ágil, Curva S (EVM Ágil) e Reservas
    # ------------------------------------------------------------------
    eq_cost = {x["id_pessoa"]: float(x["custo_hora_rs"]) for x in db["04_equipe"]}
    fator_he = float(p["fator_hora_extra"])
    h_sp_cost = sum((float(h["horas_normais"]) + float(h["horas_extras"]) * fator_he) * eq_cost[h["id_pessoa"]] for h in db["18_apontamento_horas"] if h["tipo_item"] == "SPRINT")
    cat_agil = defaultdict(float)
    cat_agil["Squad Ágil (Horas apontadas nas Sprints S01–S15)"] = h_sp_cost
    for c in db["19_custos_realizados"]:
        if c["frente"] == "AGIL":
            lbl = "Nuvem, Ambientes e Ferramentas (CT02)" if c["categoria_custo"] == "LICENCAS_E_NUVEM" else "Ocorrências e Ajustes Ágeis (OC-006 / OC-007)"
            cat_agil[lbl] += float(c["valor_rs"])
    cat_agil_rows = "".join(
        f"<tr><td>{k}</td><td class='num mono'>{f_brl(v)}</td><td class='num mono'>{v/evm['cr_a']*100:.1f}%</td></tr>"
        for k, v in sorted(cat_agil.items(), key=lambda x: -x[1])
    )

    cat_orc = defaultdict(float)
    for r in db["09_orcamento_linha_de_base"]:
        cat_orc[r["categoria_custo"]] += float(r["valor_orcado_rs"])
    cat_rows = "".join(f"<tr><td>{k.replace('_', ' ').capitalize()}</td><td class='num mono'>{f_brl(v)}</td><td class='num mono'>{v/evm['ont_p']*100:.1f}%</td></tr>" for k, v in sorted(cat_orc.items(), key=lambda x: -x[1]))

    d05 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">ONT do Projeto</div><div class="kpi-val">{f_brl0(evm['ont'])}</div><div class="kpi-sub">Preditiva {f_brl0(evm['ont_p'])} · Ágil {f_brl0(evm['ont_a'])}</div></div>
      <div class="kpi-card"><div class="kpi-label">Valor Agregado (13/11)</div><div class="kpi-val">{f_brl0(evm['va'])}</div><div class="kpi-sub">VP {f_brl0(evm['vp'])} · IDP = {f_num(evm['idp'], 3)}</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Custo Real e ENT</div><div class="kpi-val">{f_brl0(evm['ent'])}</div><div class="kpi-sub">CR {f_brl0(evm['cr'])} · IDC = {f_num(evm['idc'], 3)}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Reservas e Gestão</div><div class="kpi-val">R$ 164.000</div><div class="kpi-sub">Cont. R$ 73k + Ger. R$ 91k · Gestão (à parte) {f_brl0(evm['cr_g'])}</div></div>
    </div>
    <h2>1. Desempenho de Valor Agregado por Frente (25/09 Folha M3 × 13/11 Status)</h2>
    <table>
      <thead><tr><th>Corte / Frente</th><th class="num">ONT</th><th class="num">VP</th><th class="num">VA</th><th class="num">CR</th><th class="num">IDP</th><th class="num">IDC</th><th class="num">ENT</th></tr></thead>
      <tbody>
        <tr><td>Projeto em 25/09/2026 (Folha M3)</td><td class="num mono">{f_brl0(evm09['ont'])}</td><td class="num mono">{f_brl0(evm09['vp'])}</td><td class="num mono">{f_brl0(evm09['va'])}</td><td class="num mono">{f_brl0(evm09['cr'])}</td><td class="num mono">{f_num(evm09['idp'],3)}</td><td class="num mono">{f_num(evm09['idc'],3)}</td><td class="num mono">{f_brl0(evm09['ent'])}</td></tr>
        <tr><td>Frente Preditiva em 13/11/2026</td><td class="num mono">{f_brl0(evm['ont_p'])}</td><td class="num mono">{f_brl0(evm['vp_p'])}</td><td class="num mono">{f_brl0(evm['va_p'])}</td><td class="num mono">{f_brl0(evm['cr_p'])}</td><td class="num mono">{f_num(evm['idp_p'],3)}</td><td class="num mono">{f_num(evm['idc_p'],3)}</td><td class="num mono">{f_brl0(ent_p)}</td></tr>
        <tr><td>Frente Ágil em 13/11/2026</td><td class="num mono">{f_brl0(evm['ont_a'])}</td><td class="num mono">{f_brl0(evm['vp_a'])}</td><td class="num mono">{f_brl0(evm['va_a'])}</td><td class="num mono">{f_brl0(evm['cr_a'])}</td><td class="num mono">{f_num(evm['idp_a'],3)}</td><td class="num mono">{f_num(evm['idc_a'],3)}</td><td class="num mono">{f_brl0(ent_a)}</td></tr>
        <tr class="highlight"><td>TOTAL DO PROJETO EM 13/11/2026</td><td class="num mono">{f_brl0(evm['ont'])}</td><td class="num mono">{f_brl0(evm['vp'])}</td><td class="num mono">{f_brl0(evm['va'])}</td><td class="num mono">{f_brl0(evm['cr'])}</td><td class="num mono">{f_num(evm['idp'],3)}</td><td class="num mono">{f_num(evm['idc'],3)}</td><td class="num mono">{f_brl0(evm['ent'])}</td></tr>
      </tbody>
    </table>
    <div class="chart-box"><img src="{charts['d5_curva_s']}" /></div>
    <div class="callout warn">
      <strong>Leitura:</strong> as duas frentes estão abaixo de 1 nos dois índices. A preditiva entrega R$ {f_num(evm['idc_p'],2)} por real gasto (ENT {f_brl0(ent_p)}, +{f_brl0(ent_p - evm['ont_p'])}), puxada pelo retrabalho com o provedor de IA (F04) e por horas extras de operação; a ágil entrega R$ {f_num(evm['idc_a'],2)} (ENT {f_brl0(ent_a)}, +{f_brl0(ent_a - evm['ont_a'])}), com custo de {f_brl0(m['custo_pt'])} por ponto. A gestão (PMO/GP) é acompanhada à parte, como manda a Conv. 3.
    </div>
    <div class="grid-2">
      <div>
        <h2>2. Orçamento da Frente Preditiva (Tabela 09)</h2>
        <table>
          <thead><tr><th>Categoria de Custo</th><th class="num">Valor Orçado</th><th class="num">%</th></tr></thead>
          <tbody>{cat_rows}<tr class="highlight"><td>Total Frente Preditiva</td><td class="num mono">{f_brl(evm['ont_p'])}</td><td class="num mono">100,0%</td></tr></tbody>
        </table>
      </div>
      <div>
        <h2>3. Custo Real da Frente Ágil até 13/11</h2>
        <table>
          <thead><tr><th>Natureza do Custo</th><th class="num">Realizado</th><th class="num">%</th></tr></thead>
          <tbody>{cat_agil_rows}<tr class="highlight"><td>Total Frente Ágil (CR)</td><td class="num mono">{f_brl(evm['cr_a'])}</td><td class="num mono">100,0%</td></tr></tbody>
        </table>
        <p style="font-size:7.8pt;color:#475569">Orçamento ágil: 17 sprints da LB × R$ 68.300 = {f_brl0(evm['ont_a'])}.</p>
      </div>
    </div>
    <h2>4. Reservas</h2>
    <p><strong>Contingência (R$ 73.000)</strong> cobre o VME das ameaças abertas (ver D09). <strong>Gerencial (R$ 91.000)</strong> fica sob alçada da Patrocinadora para imprevistos. Nenhuma das duas cobre o desvio de custo projetado ({f_brl0(evm['ent'] - evm['ont'])}), que exige decisão do Comitê (D16).</p>
    """
    docs.append(("D05_Orcamento_Curva_S_e_Reservas.pdf", "D05", "Orçamento, Curva S e Reservas", "Orçamento da linha de base das duas frentes, valor agregado por frente, curva S do projeto e reservas", d05))

    # ------------------------------------------------------------------
    # D06 — Papéis Ágeis (RACI por Épico) e Histograma do Squad
    # ------------------------------------------------------------------
    raci_ep_rows = ""
    ep_owners = {
        "EP01": ("P15 Kleber / P16 Sílvia", "P11 Sílvia (PO)", "P13 Zeca (UX) / P17 QA", "PI01 / P12 SM"),
        "EP02": ("P15 Kleber / P18 João", "P11 Sílvia (PO)", "P13 Zeca (UX) / P17 QA", "PI01 / PI09 Piloto"),
        "EP03": ("P15 Kleber / P16 Sílvia", "P11 Sílvia (PO)", "P17 Marina (QA) / IA", "PI01 / Comitê"),
        "EP04": ("P16 Sílvia / P18 João", "P11 Sílvia (PO)", "P13 Zeca (UX) / Oficinas", "PI01 / P12 SM"),
        "EP05": ("P15 Kleber / P13 Zeca", "P11 Sílvia (PO)", "P17 Marina (QA)", "PI01 / PI02"),
        "EP06": ("P16 Sílvia / P15 Kleber", "P11 Sílvia (PO)", "P17 QA / Financeiro", "PI01 / PI03"),
        "EP07": ("P18 João / P15 Kleber", "P11 Sílvia (PO)", "P13 Zeca (UX) / PI02", "PI01 / Corretores"),
        "EP08": ("P16 Sílvia / P17 QA", "P11 Sílvia (PO)", "Segurança / Compliance", "PI01 / Comitê"),
    }
    for ep in db["13_epicos"]:
        r, a, c, i = ep_owners[ep["id_epico"]]
        raci_ep_rows += f"<tr><td class='mono'>{ep['id_epico']}</td><td><strong>{ep['nome_epico']}</strong></td><td class='center mono'>{ep['id_release_planejada']}</td><td>{r}</td><td>{a}</td><td>{c}</td><td>{i}</td></tr>"

    raci_rows = ""
    for e in db["06_eap"]:
        if e["tipo_elemento"] != "PACOTE_DE_TRABALHO":
            continue
        resp = f"{e['id_responsavel']} {eq_map.get(e['id_responsavel'], '')}"
        is_agi = e["disciplina"] == "AGI"
        raci_rows += f"<tr><td class='mono'>{e['codigo_eap']}</td><td><strong>{e['nome']}</strong></td><td class='center mono'>{e['disciplina']}</td><td>{'P11 PO + squad ágil' if is_agi else resp}</td><td>P01 Helena (GP)</td><td>{'P04 Ramon (Infra) / P10 Fábio (Segurança)' if is_agi else 'P02 Heitor (PMO)'}</td><td>PI01 Patrocinadora</td></tr>"

    d06 = f"""
    <div class="callout">
      <strong>Legenda RACI:</strong> <strong>R</strong> = Responsável pela execução · <strong>A</strong> = Aprovador (um só por pacote) · <strong>C</strong> = Consultado · <strong>I</strong> = Informado. A seção 1 cobre os pacotes da EAP (as duas frentes); a seção 2 detalha a entrega 1.7 por épico, como é feito no Jira.
    </div>
    <h2>1. Matriz RACI por Pacote de Trabalho da EAP</h2>
    <table>
      <thead><tr><th>EAP</th><th>Pacote de Trabalho</th><th class="center">Disc.</th><th>R (Responsável)</th><th>A (Aprovador)</th><th>C (Consultado)</th><th>I (Informado)</th></tr></thead>
      <tbody>{raci_rows}</tbody>
    </table>
    <h2>2. RACI da Frente Ágil por Épico (Entrega 1.7)</h2>
    <table>
      <thead><tr><th>Épico</th><th>Entrega do Produto</th><th class="center">Rel.</th><th>R (Squad)</th><th>A (Aprovador)</th><th>C (Consultado)</th><th>I (Informado)</th></tr></thead>
      <tbody>{raci_ep_rows}</tbody>
    </table>
    <h2>3. Histograma de Alocação: Planejado × Apontado (Folha M8)</h2>
    <div class="chart-box"><img src="{charts['d6_hist']}" /></div>
    <div class="callout warn">
      <strong>Leitura do Histograma:</strong> na frente preditiva, <strong>P09 Heitor Góes (Operações)</strong> ficou sem apontamento em ago/26 e set/26 enquanto o piloto aguardava a R1 e teve pico de sobrecarga em out/26 (<strong>204,5 h apontadas contra 42 h planejadas</strong>, com 64 h extras). Na frente ágil, <strong>P15 Kleber (Dev)</strong> manteve ~160–176 h/mês, com pico de +28% em ago/26 (215 h) na pressão da Sprint S12, quando o pulso do time caiu para 3,03.
    </div>
    """
    docs.append(("D06_Matriz_RACI_e_Histograma.pdf", "D06", "Matriz RACI e Histograma de Recursos", "Responsabilidades por pacote da EAP e por épico, e alocação planejada × apontada das duas frentes", d06))

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
        prev = f_date(r["data_real"]) if r["data_real"] else (f_date(ag["r2_d"]) if r["id_release"] == "R2" else f_date(ag["r3_d"]))
        rel_rows += f"<tr><td class='mono'>{r['id_release']}</td><td><strong>{r['nome_release']}</strong></td><td class='center mono'>{r['id_sprint_planejada']}</td><td class='center mono'>{f_date(r['data_planejada'])}</td><td class='center mono'>{prev}</td><td>{r['objetivo']}</td></tr>"

    orig_c = Counter(b["origem"] for b in db["14_backlog_itens"])
    d07 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Itens no Backlog (13/11)</div><div class="kpi-val">{len(db['14_backlog_itens'])}</div><div class="kpi-sub">{len(done_items_all)} concluídos ({done_pts_all} pts entregues)</div></div>
      <div class="kpi-card"><div class="kpi-label">Release 2 Prevista</div><div class="kpi-val">{f_date(ag['r2_d'])}</div><div class="kpi-sub">{ag['rem_r2']} pts rest. ({ag['sr2']} sprints)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Release 3 Prevista</div><div class="kpi-val">{f_date(ag['r3_d'])}</div><div class="kpi-sub">{ag['rem_r3']} pts rest. ({ag['sr3']} sprints)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Origem dos Itens</div><div class="kpi-val">9 Diretos · 39 Bugs</div><div class="kpi-sub">Plano inicial: {orig_c['PLANO_INICIAL']} · SM: {orig_c['MUDANCA_APROVADA']}</div></div>
    </div>
    <div class="callout">
      <strong>Configuração no Jira (frente ágil):</strong> Projeto Scrum com chave <code>MS</code>, versões <strong>R1, R2 e R3</strong>, os 8 épicos abaixo, backlog importado da base tratada, Sprint S15 executada no quadro (Boletins B5/B6) e sprints futuras (S16 em diante) dimensionadas pela velocidade real de <strong>{f_num(m['vel_media'],1)} pts/sprint</strong>. As datas previstas das versões alimentam os marcos A40–A42 do cronograma no ProjectLibre (D04): a R2 está no caminho crítico do projeto.
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
    <h2>2. Fluxo da Sprint S14 e Sprint S15 (Quinzena de Campo)</h2>
    <ul>
      <li><strong>Sprint S14 (19/10–30/10):</strong> 12 itens (41 pontos no quadro), <strong>7 concluídos (26 pontos)</strong>; velocidade média até 30/10 = <strong>16,8 pts/sprint</strong>; 5 itens transbordaram para S15.</li>
      <li><strong>Sprint S15 (02/11–13/11):</strong> 10 itens (34 pontos no quadro), <strong>4 concluídos (9 pontos)</strong>; 5 novos bugs de <code>MS-222</code> (pedido direto de PI02) abertos durante a quinzena; impedimento <code>IP-014</code> aberto em <code>MS-161</code>.</li>
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
    # D09 — Riscos e Reservas (duas frentes)
    # ------------------------------------------------------------------
    open_th = [r for r in db["26_riscos_registro"] if r["tipo_risco"] == "AMEACA" and r["status"] == "ABERTO"]
    vme_open = sum(float(r["probabilidade_pct"]) / 100.0 * float(r["impacto_custo_rs"]) for r in open_th)
    oc_tot = sum(float(o["impacto_custo_real_rs"]) for o in db["27_riscos_ocorrencias"])
    r_rows = ""
    for r in db["26_riscos_registro"]:
        vme = float(r["probabilidade_pct"]) / 100.0 * float(r["impacto_custo_rs"])
        cls = "alert-row" if r["status"] == "OCORRIDO" else ("warn-row" if r["status"] == "ABERTO" and r["tipo_risco"] == "AMEACA" else "")
        area = {"AGIL": "Ágil", "PREDITIVA": "Preditiva"}.get(r["frente"], "Projeto")
        r_rows += f"<tr class='{cls}'><td class='mono'>{r['id_risco']}</td><td>{r['descricao']}</td><td class='mono'>{area}</td><td class='center mono'>{r['probabilidade_pct']}%</td><td class='num mono'>{f_brl0(float(r['impacto_custo_rs']))}</td><td class='num mono'><strong>{f_brl0(vme)}</strong></td><td>{r['estrategia_resposta']}</td><td class='center'><span class='badge {'b-coral' if r['status']=='OCORRIDO' else ('b-sand' if r['status']=='ABERTO' else 'b-navy')}'>{r['status']}</span></td></tr>"

    oc_rows = "".join(
        f"<tr><td class='mono'>{o['id_ocorrencia']}</td><td class='mono'>{f_date(o['data'])}</td><td class='mono'>{o['id_risco'] or 'IMPREVISTO'}</td><td>{o['descricao']}</td><td class='mono'>{ {'AGIL': 'Ágil', 'PREDITIVA': 'Preditiva'}.get(o['frente'], 'Projeto') }</td><td class='num mono'>{f_brl0(float(o['impacto_custo_real_rs']))}</td><td class='num mono'>{o['impacto_prazo_real_du']} du</td></tr>"
        for o in db["27_riscos_ocorrencias"]
    )
    d09 = f"""
    <div class="kpi-grid">
      <div class="kpi-card warn"><div class="kpi-label">Exposição VME Aberta</div><div class="kpi-val">{f_brl0(vme_open)}</div><div class="kpi-sub">{len(open_th)} ameaças abertas no projeto</div></div>
      <div class="kpi-card"><div class="kpi-label">Reserva de Contingência</div><div class="kpi-val">R$ 73.000</div><div class="kpi-sub">Cobre VME aberto (saldo +{f_brl0(73000-vme_open)})</div></div>
      <div class="kpi-card navy"><div class="kpi-label">Reserva Gerencial</div><div class="kpi-val">R$ 91.000</div><div class="kpi-sub">Para imprevistos (sob alçada PI01)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Ocorrências Materializadas</div><div class="kpi-val">{f_brl0(oc_tot)}</div><div class="kpi-sub">8 eventos (destaque OC-006/007/008)</div></div>
    </div>
    <div class="chart-box"><img src="{charts['d9_risks']}" /></div>
    <h2>1. Registro de Riscos das Duas Frentes e Valor Monetário Esperado (Tabela 26)</h2>
    <p>{sum(1 for r in db['26_riscos_registro'] if r['frente'] == 'PREDITIVA')} riscos são da frente preditiva (regulatório, parceiros, equipamentos, piloto e lançamento) e {sum(1 for r in db['26_riscos_registro'] if r['frente'] == 'AGIL')} da frente ágil (squad e backlog). Os de maior VME materializados — IA abaixo de 85% de acerto (R09) e reajuste do provedor de IA (R06) — estão na interface entre as duas: o contrato é preditivo e o motor de IA é entregue pela R2.</p>
    <table>
      <thead><tr><th>ID</th><th>Evento de Risco</th><th>Frente</th><th class="center">Prob.</th><th class="num">Impacto</th><th class="num">VME</th><th>Resposta</th><th class="center">Status</th></tr></thead>
      <tbody>{r_rows}</tbody>
    </table>
    <h2>2. Ocorrências Materializadas e Imprevistos (Tabela 27 + Boletim B8)</h2>
    <table>
      <thead><tr><th>ID</th><th>Data</th><th>Risco</th><th>Descrição</th><th>Frente</th><th class="num">Custo Real</th><th class="num">Atraso</th></tr></thead>
      <tbody>{oc_rows}</tbody>
    </table>
    """
    docs.append(("D09_Riscos_e_Reservas.pdf", "D09", "Gestão de Riscos e Reservas", "Análise quantitativa (VME), matriz 5×5, riscos das frentes preditiva e ágil, reservas e ocorrências reais", d09))

    # ------------------------------------------------------------------
    # D10 — Aquisições e Qualidade Ágil
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
    retr_interno = sum(float(i["custo_retrabalho_rs"]) for i in db["25_inspecoes_aceite"] if not i["id_fornecedor"])
    tot_rep = sum(1 for i in db["25_inspecoes_aceite"] if i["resultado"] == "REPROVADO")
    ct04 = next(c for c in db["30_contratos"] if c["id_contrato"] == "CT04")
    ct04_pago = sum(float(x["valor_pago_rs"]) for x in db["31_contratos_medicoes"] if x["id_contrato"] == "CT04" and x["valor_pago_rs"])
    ct04_contr = float(ct04["valor_contratado_rs"])
    rec = next(pr for pr in m["props_eval"] if pr["reprov"] == 0)
    rec2 = next(pr for pr in m["props_eval"] if pr["reprov"] == 0 and pr["id_proposta"] != rec["id_proposta"])
    d10 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Contratos do Projeto</div><div class="kpi-val">{len(db['30_contratos'])}</div><div class="kpi-sub">Maioria na frente preditiva: equipamentos, logística, conteúdo, campanha, jurídico e IA</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Custo da Não Qualidade</div><div class="kpi-val">{f_brl0(tot_retr)}</div><div class="kpi-sub">{tot_rep} inspeções reprovadas (6 em F04) · {f_brl0(retr_interno)} de equipes internas</div></div>
      <div class="kpi-card warn"><div class="kpi-label">CT04 VisionAI (T&amp;M)</div><div class="kpi-val">{ct04_pago/ct04_contr*100:.0f}% pago</div><div class="kpi-sub">{f_brl0(ct04_pago)} pagos de {f_brl0(ct04_contr)} contratados</div></div>
      <div class="kpi-card"><div class="kpi-label">Recomendação Licitação</div><div class="kpi-val">{rec['id_proposta']} ({rec['id_fornecedor']})</div><div class="kpi-sub">{rec['forn']} · maior nota ({f_num(rec['nota'],2)}) sem histórico negativo</div></div>
    </div>
    <h2>1. Contratos do Projeto (Tabelas 30, 31 e 25)</h2>
    <table>
      <thead><tr><th>ID</th><th>Fornecedor</th><th>Tipo</th><th class="num">Contratado</th><th class="num">Pago</th><th class="num">Reprov.</th><th class="num">Retrabalho</th></tr></thead>
      <tbody>{ct_rows}</tbody>
    </table>
    <div class="callout alert">
      <strong>Contrato por tempo e material estourado:</strong> o CT04 (VisionAI, integração com o provedor de IA — atividades A11 e A12 da frente preditiva) já pagou <strong>{f_brl0(ct04_pago)}</strong>, {ct04_pago/ct04_contr:.1f} vezes o valor contratado, e concentra 6 das {tot_rep} reprovações de inspeção. Em tempo e material o risco das horas a mais fica com o contratante: cada retrabalho do fornecedor vira custo da Maré Seguros. Os {f_brl0(retr_interno)} restantes do custo da não qualidade vêm de inspeções de entregas internas, sem fornecedor.
    </div>
    <h2>2. Seleção de Fornecedor em Aberto — Monitoramento 24h (Tabela 32 · Conv. 15)</h2>
    <table>
      <thead><tr><th>Prop.</th><th>Fornecedor</th><th class="num">Preço</th><th class="num">Prazo</th><th class="num">Técnica</th><th class="num">Exp/Gar</th><th class="num">Nota (0–10)</th><th>Análise de Risco Histórico</th></tr></thead>
      <tbody>{pr_rows}</tbody>
    </table>
    <div class="callout alert">
      <strong>Armadilha do menor preço:</strong> a proposta mais barata (<strong>PR-01 · F04 VisionAI</strong>, R$ 87.800) é do fornecedor que acumulou <strong>6 reprovações</strong> e <strong>R$ 105.300 em ocorrências (OC-003 e OC-005)</strong>. Pela nota ponderada (Conv. 15), recomenda-se <strong>{rec['id_proposta']} ({rec['forn']}, nota {f_num(rec['nota'],2)})</strong>; a alternativa é <strong>{rec2['id_proposta']} ({rec2['forn']}, nota {f_num(rec2['nota'],2)})</strong>, {f_brl0(float(rec['preco_rs']) - float(rec2['preco_rs']))} mais barata.
    </div>
    <h2>3. Qualidade nas Duas Frentes</h2>
    <ul>
      <li><strong>Frente preditiva — inspeções de aceite (tabela 25):</strong> {tot_rep} reprovações e {f_brl0(tot_retr)} de retrabalho; os critérios de aceite de cada pacote estão no dicionário da EAP (D03).</li>
      <li><strong>Frente ágil — defeitos (tabela 24):</strong> {len(db['24_defeitos'])} defeitos registrados; o pedido direto <code>MS-222</code> gerou 5 bugs em uma única sprint (S15). A Definição de Pronto de cada épico está no D03 e a revisão por par passa a ser obrigatória.</li>
    </ul>
    """
    docs.append(("D10_Aquisicoes_e_Qualidade.pdf", "D10", "Aquisições, Contratos e Qualidade", "Contratos das duas frentes, seleção ponderada de fornecedor, inspeções de aceite e defeitos", d10))

    # ------------------------------------------------------------------
    # D11 — Mudanças e Bússola de Abordagem (híbrida, por domínio, com mapa de interfaces)
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
        audit = ('<span class="badge b-coral">⚠ ' + "; ".join(viols) + "</span>") if viols else '<span class="badge b-teal">OK</span>'
        sm_rows += f"<tr class='{cls}'><td class='mono'>{sm['id_mudanca']}</td><td>{sm['tipo_mudanca']}</td><td>{sm['nivel_decisor']} ({sm['status']})</td><td class='num mono'>{f_brl0(float(sm['impacto_custo_rs']))}</td><td class='num mono'>{sm['impacto_prazo_du']} du</td><td>{sm['descricao']}</td><td>{audit}</td></tr>"

    d11 = f"""
    <h2>1. Bússola de Abordagem por Domínio do Projeto (Slide 15)</h2>
    <div class="callout">
      <strong>Decisão do Grupo 3 — projeto híbrido:</strong> aplicando as quatro variáveis da Bússola a cada domínio, o aplicativo (a maior parte do trabalho) vai para a frente ágil; regulação, parcerias, equipamentos, conteúdo e lançamento têm escopo estável e mudança cara, e vão para a frente preditiva. O piloto fica na interface: tem data e marco, mas retroalimenta o backlog.
    </div>
    <table>
      <thead><tr><th>Domínio (EAP)</th><th>Escopo</th><th>Custo da Mudança</th><th>Entrega</th><th>Usuário</th><th>Abordagem</th></tr></thead>
      <tbody>
        <tr><td><strong>Aplicativo e UX</strong> (1.7 · EP01–EP08)</td><td>Incerto / evolutivo</td><td>Barato (código)</td><td>Em partes (R1, R2, R3)</td><td>Perto (piloto, NPS semanal)</td><td><span class="badge b-teal">ÁGIL</span></td></tr>
        <tr><td><strong>Jurídico, dados e regulatório</strong> (1.2.1–1.2.2 · Susep e LGPD)</td><td>Estável / normativo</td><td>Caro (reprovação, novo protocolo)</td><td>De uma vez (aprovação)</td><td>Longe (regulador)</td><td><span class="badge b-navy">PREDITIVA</span></td></tr>
        <tr><td><strong>Parcerias e provedor de IA</strong> (1.2.3)</td><td>Definido em contrato</td><td>Caro (aditivo, multa)</td><td>Marcos contratuais</td><td>Longe</td><td><span class="badge b-navy">PREDITIVA</span></td></tr>
        <tr><td><strong>Kits de vistoria e distribuição</strong> (1.3 · 40 oficinas)</td><td>Estável</td><td>Caro (compra física)</td><td>Lote / instalação</td><td>Média</td><td><span class="badge b-navy">PREDITIVA</span></td></tr>
        <tr><td><strong>Conteúdo, marca e campanha</strong> (1.4)</td><td>Definido</td><td>Médio (mídia comprada)</td><td>Datas de lançamento</td><td>Média</td><td><span class="badge b-navy">PREDITIVA</span></td></tr>
        <tr><td><strong>Piloto, atendimento e treinamento</strong> (1.5)</td><td>Definido + feedback</td><td>Médio</td><td>Ondas / marcos</td><td>Perto (oficinas e corretores)</td><td><span class="badge b-sand">PREDITIVA na interface</span></td></tr>
        <tr><td><strong>Testes finais, lançamento e estabilização</strong> (1.6)</td><td>Estável</td><td>Caro (data pública)</td><td>De uma vez</td><td>Público</td><td><span class="badge b-navy">PREDITIVA</span></td></tr>
      </tbody>
    </table>
    <h2>2. Mapa de Interfaces entre as Duas Trilhas</h2>
    <p>Caminho crítico previsto em 13/11: <strong>{crit_txt}</strong>. A Release 2 é o ponto de encontro que hoje segura o término do projeto.</p>
    {interfaces_table}
    <h2>3. Regra de Governança do Backlog e Auditoria de Alçadas (Tabela 28 × Tabela 05)</h2>
    <div class="callout alert">
      <strong>Falhas Críticas de Governança Identificadas:</strong> (1) <strong>4 aprovações acima da alçada do gerente</strong> (<code>SM-002, SM-004, SM-005, SM-011</code>, total R$ 63.600) violando limites de R$ 15 mil, 5 du e veto a escopo; (2) <strong>9 pedidos diretos (35 pts)</strong> de PI02 entraram no backlog sem passar pela PO nem por SM — só <code>MS-222</code> gerou 5 defeitos na Sprint S15.
    </div>
    <table>
      <thead><tr><th>SM</th><th>Tipo</th><th>Decisor / Status</th><th class="num">Custo</th><th class="num">Prazo</th><th>Descrição</th><th>Auditoria</th></tr></thead>
      <tbody>{sm_rows}</tbody>
    </table>
    """
    docs.append(("D11_Mudancas_e_Bussola_de_Abordagem.pdf", "D11", "Controle de Mudanças e Bússola de Abordagem", "Abordagem por domínio (híbrida), mapa de interfaces entre as trilhas e auditoria de alçadas", d11))

    # ------------------------------------------------------------------
    # D12 — Estratégia do Projeto (Estratégia Ágil)
    # ------------------------------------------------------------------
    d12 = f"""
    <div class="callout">
      <strong>Tese Estratégica para o Comitê Diretor:</strong> o projeto tem desvio simultâneo de prazo (<strong>+{net['delay_du']} du</strong>, término em {f_date(net['fend_date'])}) e de custo (<strong>+{f_brl0(evm['ent']-evm['ont'])}</strong>, IDC {f_num(evm['idc'],2)}). O prazo é decidido na interface entre as trilhas: a <strong>Release 2 (frente ágil)</strong> abre o caminho crítico e empurra a cadeia preditiva de testes, entrada em operação e encerramento ({crit_txt}). O VPL de C1 ainda é positivo ({f_brl0(c1['vpl'])}), mas o resultado líquido fica negativo ({f_brl0(c1['resultado'])}) depois do custo do atraso. Pelo critério VPL − custo do atraso, <strong>{best_sc['nome']}</strong> é o menos desfavorável ({f_brl0(best_sc['resultado'])}, +{f_brl0(best_sc['resultado'] - c1['resultado'])} sobre C1), mas alonga o término para {f_date(best_sc['end_date'])}; se o Comitê não aceitar alongar, a alternativa sem corte de escopo é <strong>C6 (duas ondas)</strong>.
    </div>
    <h2>1. Achados Diagnósticos Prioritários (Duas Frentes)</h2>
    <table>
      <thead><tr><th>#</th><th>Achado</th><th>Frente</th><th>Evidência Numérica (13/11)</th><th>Ação Estratégica</th><th>Dono</th></tr></thead>
      <tbody>
        <tr><td class="mono">A1</td><td>Release 2 no caminho crítico</td><td>Interface</td><td>R2 prevista para {f_date(ag['r2_d'])} (velocidade {f_num(m['vel_media'],1)} vs 17,3 pts/sp) segura A32 → A35 → A39; término {f_date(net['fend_date'])} (+{net['delay_du']} du)</td><td>Proteger a R2 (só itens MUST) e decidir o cenário de recuperação</td><td>P11 / P01 / PI01</td></tr>
        <tr><td class="mono">A2</td><td>Estouro de custo nas duas frentes</td><td>Projeto</td><td>ENT {f_brl0(evm['ent'])} vs ONT {f_brl0(evm['ont'])}; IDC preditiva {f_num(evm['idc_p'],2)} · ágil {f_num(evm['idc_a'],2)}</td><td>Teto para contratos T&amp;M e foco no escopo essencial</td><td>P01 / PI03</td></tr>
        <tr><td class="mono">A3</td><td>Escopo sem controle de mudança</td><td>Ágil</td><td>9 pedidos diretos de PI02 (35 pts); MS-222 gerou 5 bugs na S15</td><td>Trava de SM no Jira e realinhamento de PI02</td><td>P11 / PI01</td></tr>
        <tr><td class="mono">A4</td><td>Quebra de alçadas</td><td>Projeto</td><td>4 SMs (R$ 63,6k) aprovadas acima do limite do gerente</td><td>Aprovação vinculada ao nível decisor (tab. 05)</td><td>P01 / Comitê</td></tr>
        <tr><td class="mono">A5</td><td>Fornecedor crítico F04 (VisionAI)</td><td>Preditiva</td><td>CT04 pago muito acima do contratado; 6 reprovações em A11/A12; R$ 105,3k em ocorrências</td><td>Não contratar F04 no monitoramento 24h (PR-01)</td><td>P04 / Compras</td></tr>
        <tr><td class="mono">A6</td><td>Rendimento, não falta de gente</td><td>Preditiva</td><td>IP 0,64 (A11) e 0,69 (A20) com IE ~0,90; P09 com 204,5 h em out/26 (42 h planejadas)</td><td>Atacar a causa técnica e nivelar a alocação de operações</td><td>P02 / P09</td></tr>
        <tr><td class="mono">A7</td><td>Rotatividade no squad</td><td>Ágil</td><td>Saída da dev P14 (101 pts entregues); rampa de P18 (R$ 1.904/pt); IP-014 bloqueando MS-161</td><td>Revisão por par P15/P18 e limite de WIP no Jira</td><td>P12 (SM)</td></tr>
      </tbody>
    </table>
    <h2>2. Plano de Ação 30 / 60 / 90 Dias</h2>
    <div class="grid-2">
      <div class="card"><strong>0–30 dias (S16–S17):</strong> deliberar o cenário oficial no Comitê; congelar pedidos diretos fora de SM e realinhar PI02; resolver <code>IP-014</code> e os bugs de <code>MS-222</code>; concluir os {ag['rem_r2']} pts da <strong>Release 2 até {f_date(ag['r2_d'])}</strong>; preparar A32 (testes de carga e segurança) para começar no dia seguinte à R2; adjudicar o monitoramento 24h para {rec['id_proposta']} ({rec['forn']}).</div>
      <div class="card"><strong>31–90 dias (S18–S22):</strong> executar A32 e A33 (auditoria) sem folga; entrar em operação (A35) e conduzir a operação assistida (A36); na frente ágil, entregar EP07 e EP08 na R3 sem dívida técnica e acelerar a rampa de P18; formalizar o encerramento (A39) e as lições aprendidas (A38).</div>
    </div>
    """
    docs.append(("D12_Estrategia_do_Projeto.pdf", "D12", "Estratégia do Projeto", "Síntese diagnóstica das duas frentes, achados priorizados e plano 30/60/90 dias", d12))

    # ------------------------------------------------------------------
    # D13 — Pessoal e Custos de Pessoal (Foco Squad Ágil + Governança)
    # ------------------------------------------------------------------
    # Alocação planejada (tab. 40) × apontada (tab. 18) nos meses fechados — Conv. 18
    aloc_rows = ""
    for x in m["people"]:
        meses = sorted(k for k in set(x["hm_pl"]) | set(x["hm_ap"]) if k <= "2026-10")
        pl = sum(x["hm_pl"].get(k, 0.0) for k in meses)
        ap = sum(x["hm_ap"].get(k, 0.0) for k in meses)
        if pl <= 0:
            continue
        util = ap / pl * 100
        picos = [f"{k[5:]}/{k[2:4]}: {x['hm_ap'].get(k, 0):.0f} h × {x['hm_pl'].get(k, 0):.0f} h" for k in meses if x["hm_pl"].get(k, 0) > 0 and abs(x["hm_ap"].get(k, 0) - x["hm_pl"].get(k, 0)) / x["hm_pl"].get(k, 0) > 0.5]
        cls = "alert-row" if util > 120 or util < 60 else ""
        frente_lbl = {"AGIL": "Ágil", "GESTAO": "Gestão"}.get(x["frente"], "Preditiva")
        aloc_rows += f"<tr class='{cls}'><td class='mono'>{x['id']}</td><td>{x['nome']}</td><td class='center mono'>{frente_lbl}</td><td class='num mono'>{pl:.0f} h</td><td class='num mono'>{ap:.0f} h</td><td class='num mono'><strong>{util:.0f}%</strong></td><td style='font-size:7.4pt'>{'; '.join(picos[:3]) or '—'}</td></tr>"

    agil_gov = [x for x in m["people"] if x["frente"] in ("AGIL", "GESTAO")]
    apoio_prod = [x for x in m["people"] if x["frente"] not in ("AGIL", "GESTAO")]

    tot_folha_ag = sum(x["cm"] for x in agil_gov)
    tot_h_ag = sum(x["ht"] for x in agil_gov)
    tot_cp_ag = sum(x["cproj"] for x in agil_gov)
    tot_reaj_ag = sum(x["reaj_rs"] for x in agil_gov)
    tot_folha_all = sum(x["cm"] for x in m["people"])

    p_ag_rows = "".join(
        f"<tr><td class='mono'>{x['id']}</td><td><strong>{x['nome']}</strong><br/><span style='color:#64748B'>{x['papel']}</span></td><td class='center mono'>{'SQUAD ÁGIL' if x['frente']=='AGIL' else 'GOVERNANÇA'}</td><td class='center mono'>{x['vinculo']}</td><td class='num mono'>{f_brl(x['cm'])}</td><td class='num mono'>R$ {x['ch']:.0f}</td><td class='num mono'>{f_num(x['hn'],1)} + {f_num(x['he'],1)}</td><td class='num mono'>{f_brl0(x['cproj'])}</td><td class='num mono'>{f_brl0(x['reaj_rs'])}</td></tr>"
        for x in agil_gov
    )
    p_ap_rows = "".join(
        f"<tr><td class='mono'>{x['id']}</td><td><strong>{x['nome']}</strong><br/><span style='color:#64748B'>{x['papel']}</span></td><td class='center mono'>PREDITIVA</td><td class='center mono'>{x['vinculo']}</td><td class='num mono'>{f_brl(x['cm'])}</td><td class='num mono'>R$ {x['ch']:.0f}</td><td class='num mono'>{f_num(x['hn'],1)} + {f_num(x['he'],1)}</td><td class='num mono'>{f_brl0(x['cproj'])}</td><td class='num mono'>{f_brl0(x['reaj_rs'])}</td></tr>"
        for x in apoio_prod
    )
    tot_h_all = sum(x["ht"] for x in m["people"])
    tot_cp_all = sum(x["cproj"] for x in m["people"])
    tot_reaj_all = sum(x["reaj_rs"] for x in m["people"])
    tot_folha_pr = sum(x["cm"] for x in apoio_prod)
    d13 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Folha Mensal (18 pessoas)</div><div class="kpi-val">{f_brl(tot_folha_all)}</div><div class="kpi-sub">Bate o controle (tab. 04 × tab. 39)</div></div>
      <div class="kpi-card"><div class="kpi-label">Horas Apontadas (13/11)</div><div class="kpi-val">{f_num(tot_h_all,1)} h</div><div class="kpi-sub">Custo no projeto: {f_brl0(tot_cp_all)}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Por Frente</div><div class="kpi-val" style="font-size:10pt">Ágil + Gestão {f_brl0(tot_folha_ag)}</div><div class="kpi-sub">Preditiva {f_brl0(tot_folha_pr)} por mês</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Impacto de Reajuste</div><div class="kpi-val">{f_brl0(tot_reaj_all)}</div><div class="kpi-sub">Projeção até o término (Conv. 19)</div></div>
    </div>
    <h2>1. Frente Ágil e Gestão do Projeto (PMO/GP)</h2>
    <table>
      <thead><tr><th>ID</th><th>Profissional / Papel</th><th class="center">Núcleo</th><th class="center">Vínc.</th><th class="num">Custo Mensal</th><th class="num">R$/h</th><th class="num">Horas (N+E)</th><th class="num">Custo Proj.</th><th class="num">Reajuste Est.</th></tr></thead>
      <tbody>{p_ag_rows}<tr class="highlight"><td colspan="4">SUBTOTAL ÁGIL + GESTÃO ({len(agil_gov)} pessoas)</td><td class="num mono">{f_brl(tot_folha_ag)}</td><td></td><td class="num mono">{f_num(tot_h_ag,1)} h</td><td class="num mono">{f_brl0(tot_cp_ag)}</td><td class="num mono">{f_brl0(tot_reaj_ag)}</td></tr></tbody>
    </table>
    <h2>2. Frente Preditiva (Produto, Infra, Regulatório, Parcerias, Logística, Marketing, Operações e Segurança)</h2>
    <table>
      <thead><tr><th>ID</th><th>Profissional / Papel</th><th class="center">Frente</th><th class="center">Vínc.</th><th class="num">Custo Mensal</th><th class="num">R$/h</th><th class="num">Horas (N+E)</th><th class="num">Custo Proj.</th><th class="num">Reajuste Est.</th></tr></thead>
      <tbody>{p_ap_rows}</tbody>
    </table>
    <h2>3. Alocação Planejada × Apontada até out/26 (Tabelas 40 e 18 · Conv. 18)</h2>
    <p>Em vermelho, quem apontou mais de 120% ou menos de 60% do planejado nos meses fechados. Os meses com desvio acima de 50% aparecem na última coluna (apontado × planejado).</p>
    <table>
      <thead><tr><th>ID</th><th>Pessoa</th><th class="center">Frente</th><th class="num">Planejado</th><th class="num">Apontado</th><th class="num">Utilização</th><th>Meses com maior desvio</th></tr></thead>
      <tbody>{aloc_rows}</tbody>
    </table>
    """
    docs.append(("D13_Pessoal_e_Custos_de_Pessoal.pdf", "D13", "Pessoal e Custos de Pessoal", "Folha, custo-hora, horas apontadas, reajuste e alocação planejada × apontada nas duas frentes", d13))

    # ------------------------------------------------------------------
    # D14 — Produtividade das Equipes (fornecedores da preditiva + time ágil)
    # ------------------------------------------------------------------
    dev_rows = "".join(
        f"<tr class='{'alert-row' if x['id']=='P18' else ('highlight' if x['id']=='P14' else '')}'><td class='mono'>{x['id']}</td><td><strong>{x['nome']}</strong> ({x['papel']})</td><td class='num mono'><strong>{x['pts']} pts</strong></td><td class='num mono'>{f_num(x['ht'],1)} h</td><td class='num mono'>{f_num(x['pts_h'],3)} pts/h</td><td class='num mono'>{f_brl0(x['rs_pt'])}/pt</td><td>{'Saiu do projeto (OC-007) — maior produtividade' if x['id']=='P14' else ('Curva de rampa (substituto de P14)' if x['id']=='P18' else ('Foco em testes/validação de todo o squad' if x['id']=='P17' else 'Produtividade estável e consistente'))}</td></tr>"
        for x in m["people"] if x["pts_h"] is not None
    )
    sp_eff_rows = ""
    for sv in m["sp_vel"][-6:]:
        sraw = sp_map_full[sv["id"]]
        pd = float(sraw["pessoas_dia_disponiveis"] or 30)
        eff = sv["done"] / pd if pd else 0
        sp_eff_rows += f"<tr><td class='mono'>{sv['id']}</td><td class='center mono'>{f_date(sv['ini'])} – {f_date(sv['fim'])}</td><td class='num mono'>{pd:.0f} p-dia</td><td class='num mono'>{sv['plan']} pts</td><td class='num mono'><strong>{sv['done']} pts</strong></td><td class='num mono'>{eff:.2f} pts/p-dia</td><td>{sraw['horas_extras_autorizadas']}</td></tr>"

    sp_rows = ""
    for s in m["sup_prod"]:
        diag = "Baixo rendimento (IP)" if s["ip"] < 0.85 and s["ie"] >= 0.85 else ("Falta efetivo (IE)" if s["ie"] < 0.85 and s["ip"] >= 0.85 else ("Efetivo + rendimento" if s["ip"] < 0.85 else "Adequado"))
        cls = "alert-row" if s["ip"] < 0.75 else ""
        sp_rows += f"<tr class='{cls}'><td class='mono'>{s['id']}</td><td>{s['servico']} ({s['forn']})</td><td class='num mono'>{f_num(s['qex'],1)}/{f_num(s['qt'],1)} {s['un']}</td><td class='num mono'>{s['hh']:.0f} h</td><td class='num mono'>{f_num(s['pp'],3)} → {f_num(s['pr'],3)}</td><td class='num mono'><strong>{f_num(s['ip'],2)}</strong></td><td class='num mono'>{f_num(s['ie'],2)}</td><td>{diag}</td></tr>"

    d14 = f"""
    <div class="callout warn">
      <strong>Resposta central — falta gente ou rendimento?</strong> <strong>Rendimento, nas duas frentes.</strong> Na preditiva, os serviços críticos têm a equipe mobilizada perto do planejado, mas produzem menos por homem-hora: <strong>A11 (VisionAI)</strong> e <strong>A20 (conteúdo)</strong> têm IP de 0,64 e 0,69 com IE perto de 0,90 — retrabalho técnico e falhas de qualidade, não falta de efetivo. Na ágil, a queda vem da saída da desenvolvedora mais produtiva (P14, 0,118 pts/h), da rampa do substituto P18 (0,054 pts/h), de 9 pedidos diretos e do retrabalho de <code>MS-222</code>. Contratar mais gente não resolve nenhum dos dois casos.
    </div>
    <h2>1. Frente Preditiva — Produtividade dos Fornecedores (Tabelas 41 e 42 · Conv. 20)</h2>
    <div class="chart-box"><img src="{charts['d14_prod']}" /></div>
    <table>
      <thead><tr><th>Ativ.</th><th>Serviço / Fornecedor</th><th class="num">Exec. / Total</th><th class="num">Hh</th><th class="num">Prod. Plan → Real</th><th class="num">IP</th><th class="num">IE</th><th>Diagnóstico</th></tr></thead>
      <tbody>{sp_rows}</tbody>
    </table>
    <h2>2. Frente Ágil — Indicadores do Time</h2>
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Velocidade Recente</div><div class="kpi-val">{f_num(m['vel_media'],1)} pts/sp</div><div class="kpi-sub">Abaixo da meta original (17,3 pts/sp)</div></div>
      <div class="kpi-card"><div class="kpi-label">Custo Global / Ponto</div><div class="kpi-val">{f_brl0(m['custo_pt'])}/pt</div><div class="kpi-sub">CR Ágil / {done_pts_all} pts concluídos</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Impacto Turnover (P14)</div><div class="kpi-val">101 pts entregues</div><div class="kpi-sub">P18 em rampa (R$ 1.904/pt vs R$ 1.068)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Retrabalho S15</div><div class="kpi-val">5 bugs (MS-222)</div><div class="kpi-sub">S15 entregou só 9 pts</div></div>
    </div>
    <div class="chart-box"><img src="{charts['d14_squad']}" /></div>
    <h2>3. Produtividade Individual do Time Ágil (Pontos/Hora e Custo/Ponto)</h2>
    <table>
      <thead><tr><th>ID</th><th>Profissional</th><th class="num">Pontos</th><th class="num">Horas</th><th class="num">Pts / Hora</th><th class="num">Custo / Pt</th><th>Leitura Gerencial</th></tr></thead>
      <tbody>{dev_rows}</tbody>
    </table>
    <h2>4. Eficiência das Últimas 6 Sprints (Pontos por Pessoa-Dia Disponível)</h2>
    <table>
      <thead><tr><th>Sprint</th><th class="center">Período</th><th class="num">Capacidade</th><th class="num">Plan.</th><th class="num">Entregue</th><th class="num">Rendimento</th><th>HE Aut.</th></tr></thead>
      <tbody>{sp_eff_rows}</tbody>
    </table>
    """
    docs.append(("D14_Produtividade_das_Equipes.pdf", "D14", "Produtividade das Equipes", "Falta gente ou rendimento? Fornecedores da frente preditiva (IP × IE) e time ágil (pontos por hora)", d14))

    # ------------------------------------------------------------------
    # D15 — Análise Financeira do Produto Digital
    # ------------------------------------------------------------------
    c1_fl_rows = "".join(
        f"<tr><td class='center mono'>{r['ano']}</td><td class='num mono'>{f_brl0(r['inv'])}</td><td class='num mono'>{f_brl0(r['ben'])}</td><td class='num mono'>{f_brl0(r['cop'])}</td><td class='num mono'><strong>{f_brl0(r['fl'])}</strong></td><td class='num mono'>{f_brl0(r['acum'])}</td></tr>"
        for r in c1["fluxo"]
    )
    d15 = f"""
    <div class="kpi-grid">
      <div class="kpi-card alert"><div class="kpi-label">ENT do Projeto (C1)</div><div class="kpi-val">{f_brl0(evm['ent'])}</div><div class="kpi-sub">Preditiva {f_brl0(ent_p)} · Ágil {f_brl0(ent_a)}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Custo do Atraso (C1)</div><div class="kpi-val">{f_brl0(c1['catraso'])}</div><div class="kpi-sub">{c1['delay_du']} du × R$ 5.400/du</div></div>
      <div class="kpi-card navy"><div class="kpi-label">VPL Atualizado (C1)</div><div class="kpi-val">{f_brl0(c1['vpl'])}</div><div class="kpi-sub">TMA 14% · Payback {f_num(c1['payback'],2)} anos</div></div>
      <div class="kpi-card"><div class="kpi-label">Resultado Líquido (C1)</div><div class="kpi-val">{f_brl0(c1['resultado'])}</div><div class="kpi-sub">VPL − Custo do Atraso</div></div>
    </div>
    <h2>1. Fluxo de Caixa Atualizado do Projeto — Cenário Base C1 (Conv. 16 e 23)</h2>
    <table>
      <thead><tr><th class="center">Ano</th><th class="num">Investimento</th><th class="num">Benefício Bruto</th><th class="num">Custo Op.</th><th class="num">Fluxo Líquido</th><th class="num">Acumulado</th></tr></thead>
      <tbody>{c1_fl_rows}</tbody>
    </table>
    <h2>2. Decomposição dos Desvios Financeiros por Frente</h2>
    <ul>
      <li><strong>Frente preditiva (CR − VA = {f_brl0(evm['cr_p'] - evm['va_p'])}):</strong> retrabalho e horas a mais no contrato por tempo e material com o provedor de IA (CT04 · F04), ocorrências <code>OC-003</code> (reajuste do provedor, R$ 38.500) e <code>OC-005</code> (IA abaixo de 85% de acerto, R$ 66.800) e horas extras de operação no piloto.</li>
      <li><strong>Frente ágil (CR − VA = {f_brl0(evm['cr_a'] - evm['va_a'])}):</strong> queda de velocidade para {f_num(m['vel_media'],1)} pts/sprint, elevando o custo real por ponto para <strong>{f_brl0(m['custo_pt'])}/pt</strong>, além das ocorrências <code>OC-006</code> (pedidos diretos, R$ 11.000) e <code>OC-007</code> (saída de dev sênior, R$ 19.400).</li>
      <li><strong>Custo de cada dia de atraso:</strong> R$ 5.400 por dia útil; como a Release 2 está no caminho crítico, cada sprint (10 du) de atraso na frente ágil custa cerca de R$ 54.000 ao projeto.</li>
      <li><strong>Efeito no VPL do Caso de Negócio:</strong> o aumento de investimento somado à perda proporcional de receita no Ano 1 pelo atraso das releases reduz o VPL aprovado de <strong>{f_brl0(vpl_base)}</strong> para <strong>{f_brl0(c1['vpl'])}</strong> (queda de {f_brl0(vpl_base - c1['vpl'])}).</li>
      <li><strong>Custo de Governança (PMO/GP à parte):</strong> {f_brl0(evm['cr_g'])} acumulados até 13/11/2026.</li>
    </ul>
    """
    docs.append(("D15_Analise_Financeira.pdf", "D15", "Análise Financeira", "Fluxo de caixa atualizado, VPL (14% a.a.), payback, desvios por frente e custo do atraso", d15))

    # ------------------------------------------------------------------
    # D16 — Cenários e Decisão
    # ------------------------------------------------------------------
    loss_notes = {
        "C1": "Mantém velocidade atual (16,0 pts/sp), atraso de 32 du (R$ 172,8k) e estouro sem ação.",
        "C2": "Exige reforço de devs (+R$ 214,7k imediatos) com rampa nas sprints iniciais.",
        "C3": "Corta o épico EP03 (IA de danos) e itens Could da R3 (−1% benefício anual).",
        "C4": "Amplia backlog (multi-praça) empurrando entrega final para 30/03/27 (44 du).",
        "C5": "Substitui código próprio de IA por solução pronta (+R$ 10,6k/ano de licença fixa).",
        "C6": "Exige +R$ 34,8k e gestão da onda piloto antes da expansão para as demais praças.",
    }
    sc_rows = ""
    for s in m["scens"]:
        is_best = s["id"] == best_sc["id"]
        cls = "highlight" if is_best else ""
        trade = " ".join(loss_notes.get(x, "") for x in s["id"].split("+"))
        sc_rows += f"<tr class='{cls}'><td class='mono'><strong>{s['id']}</strong>{' ★' if is_best else ''}</td><td class='center mono'>{f_date(s['end_date'])}</td><td class='num mono'>{s['delay_du']} du</td><td class='num mono'>{f_brl0(s['ent'])}</td><td class='num mono'>{f_brl0(s['catraso'])}</td><td class='num mono'>{f_brl0(s['vpl'])}</td><td class='num mono'>{f_num(s['payback'],2) if s['payback'] else '—'}a</td><td class='num mono'><strong>{f_brl0(s['resultado'])}</strong></td><td>{trade}</td></tr>"

    d16 = f"""
    <div class="callout">
      <strong>Recomendação ao Comitê Diretor:</strong> Pelo critério econômico-financeiro (<strong>VPL − Custo do Atraso</strong>), o cenário com melhor resultado é <strong>{best_sc['nome']}</strong>, com <strong>VPL de {f_brl0(best_sc['vpl'])}</strong>, payback de <strong>{f_num(best_sc['payback'],2)} anos</strong> e resultado líquido de <strong>{f_brl0(best_sc['resultado'])}</strong> (ganho de <strong>+{f_brl0(best_sc['resultado'] - c1['resultado'])}</strong> sobre C1), assumindo o trade-off de ampliar o backlog e o término para <strong>{f_date(best_sc['end_date'])} ({best_sc['delay_du']} du)</strong>. Caso haja restrição rígida de caixa ou prazo, <strong>C3</strong> reduz o desembolso para R$ 3,92 mi (cortando EP03/IA) e <strong>C6</strong> mantém o backlog completo antecipando 50% do benefício na praça piloto.
    </div>
    <div class="callout warn">
      <strong>Atenção:</strong> todos os cenários têm resultado líquido negativo — {best_sc['id']} é o menos desfavorável, não um cenário lucrativo. Os cenários mexem nas duas frentes: C2 comprime atividades da rede preditiva e reforça o time ágil; C3 e C5 mudam o escopo do aplicativo (frente ágil) e, por consequência, a data da R2/R3 que segura a entrada em operação; C6 altera a implantação (frente preditiva).
    </div>
    <div class="chart-box"><img src="{charts['d16_scens']}" /></div>
    <h2>Comparativo Completo — Cenários C1 a C6 e Combinações Válidas (Conv. 21–23)</h2>
    <table>
      <thead><tr><th>Cenário</th><th class="center">Término</th><th class="num">Atraso</th><th class="num">ENT</th><th class="num">C. Atraso</th><th class="num">VPL (14%)</th><th class="num">Payback</th><th class="num">Resultado</th><th>O que se perde ao escolher</th></tr></thead>
      <tbody>{sc_rows}</tbody>
    </table>
    """
    docs.append(("D16_Cenarios_e_Decisao.pdf", "D16", "Cenários e Recomendação de Decisão", "Simulação dos 6 cenários (C1–C6) e combinações com impacto em backlog, prazo, VPL e trade-offs", d16))

    # ------------------------------------------------------------------
    # D17 — Mockups do Produto Digital
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
    # Mapa 3D (tabela 38) dispensado pelo professor para o Grupo 3 (23/11/2026) — D17 cobre só os mockups.
    d17 = f"""
    <div class="callout">
      <strong>Protótipo Interativo Publicado (frente ágil):</strong> As <strong>14 telas navegáveis</strong> do aplicativo Maré Seguros (com controle de data de 01/05 a 13/11 e filtro de cenários C1/C3/C4/C5) estão disponíveis ao vivo em <strong>https://sistema-ruddy.vercel.app</strong> na aba <em>Mockups do Produto</em>, cada uma ligada aos itens do backlog e à release que a entrega.
    </div>
    <h2>1. Catálogo das 14 Telas Navegáveis do Produto Digital (EP01–EP08)</h2>
    <table>
      <thead><tr><th>Tela</th><th>Nome da Tela</th><th class="center">Épico</th><th class="center">Rel.</th><th>Itens Backlog</th><th class="center">Status 13/11</th><th>Impacto nos Cenários</th></tr></thead>
      <tbody>{mk_rows}</tbody>
    </table>
    """
    docs.append(("D17_Mockups_do_Produto.pdf", "D17", "Mockups Navegáveis do Produto", "Catálogo das 14 telas do aplicativo Maré Seguros, com vínculos de backlog (MS-*), releases e status na data", d17))

    # Remove antigos PDFs D01..D17 para evitar duplicatas de nomes antigos (ex.: ProjectLibre)
    for fname in os.listdir(DOCS_DIR):
        if fname.startswith("D") and fname.endswith(".pdf") and len(fname) > 4 and fname[1:3].isdigit():
            os.remove(os.path.join(DOCS_DIR, fname))

    for filename, code, title, subtitle, body in docs:
        html = wrap_html(code, title, subtitle, body, logo_uri)
        out_path = os.path.join(DOCS_DIR, filename)
        render_pdf(html, out_path)
        size_kb = os.path.getsize(out_path) / 1024
        print(f"OK {filename} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    build_all_documents()
