"""Gera os 17 documentos oficiais (D01 a D17) em PDF na pasta docs/,
100% orientados à Trilha Ágil (Jira / Scrum) da Maré Seguros,
seguindo a identidade visual da marca (logo + paleta azul-marinho, verde-água, areia e coral suave).
"""
import os
import subprocess
import tempfile
from collections import Counter, defaultdict

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
CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
os.makedirs(DOCS_DIR, exist_ok=True)


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
<title>{code} — {title} | Maré Seguros (Trilha Ágil)</title>
<style>{CSS_TEMPLATE}</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo-box"><img src="{logo_uri}" alt="Maré Seguros" /></div>
      <div>
        <div class="doc-code">{code} · TRILHA ÁGIL (SCRUM / JIRA)</div>
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
    <span>Maré Seguros · Produto Digital (Trilha Ágil) · Aplicativo de Aviso de Sinistro com Vistoria por Foto</span>
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

    docs = []

    # ------------------------------------------------------------------
    # D01 — Termo de Abertura e Caso de Negócio (Trilha Ágil)
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
      <div class="kpi-card navy"><div class="kpi-label">Orçamento Trilha Ágil</div><div class="kpi-val">{f_brl0(evm['ont_a'])}</div><div class="kpi-sub">17 sprints LB × R$ 68.300/sprint</div></div>
      <div class="kpi-card"><div class="kpi-label">VPL Caso de Negócio</div><div class="kpi-val">{f_brl0(vpl_base)}</div><div class="kpi-sub">TMA aprovada: 14,0% a.a.</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Releases & Backlog</div><div class="kpi-val">3 Releases · 8 Épicos</div><div class="kpi-sub">{len(db['14_backlog_itens'])} itens ({total_pts_all} pts) no Jira Scrum</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Meta Contratual</div><div class="kpi-val">22/01/2027</div><div class="kpi-sub">Custo do atraso: R$ 5.400/du</div></div>
    </div>
    <h2>1. Termo de Abertura do Produto Digital (Agile Project Charter)</h2>
    <div class="callout">
      <strong>Visão do Produto:</strong> {p['objetivo_do_projeto']}<br/>
      <strong>Patrocinadora:</strong> Samara Guimarães (Diretora de Operações — PI01) &nbsp;|&nbsp;
      <strong>Product Owner:</strong> Sílvia Trindade (P11) &nbsp;|&nbsp;
      <strong>Scrum Master:</strong> Valéria Pinheiro (P12) &nbsp;|&nbsp;
      <strong>Trilha Adotada:</strong> Trilha Ágil (Scrum + Jira · Produto Digital).
    </div>
    <p>A <strong>Maré Seguros</strong>, seguradora regional de automóveis em Salvador/BA, moderniza o processo de sinistros por meio de um aplicativo móvel com vistoria guiada por foto, análise automática de danos por inteligência artificial e acompanhamento digital junto a 40 oficinas credenciadas e 25 corretores. Pela natureza evolutiva do produto digital, a equipe conduz o projeto pela <strong>Trilha Ágil</strong> com entregas incrementais a cada duas semanas.</p>
    <div class="grid-2">
      <div class="card"><strong>Cadência e Governança Ágil:</strong> Sprints quinzenais (14 dias corridos) iniciadas em 20/04/2026, backlog único priorizado por MoSCoW no Jira, revisões quinzenais com segurados/oficinas e métricas de fluxo (Velocidade, Burndown, DORA e NPS do piloto).</div>
      <div class="card"><strong>Estratégia de Releases:</strong> <strong>R1 (MVP — S06)</strong> entregue em 10/07/2026 para validar aviso e vistoria por foto; <strong>R2 (Operação — prev. S17 · 11/12/2026)</strong> habilita IA, oficinas e Pix; <strong>R3 (Evolução — prev. S22 · 19/02/2027)</strong> entrega portal do corretor e antifraude.</div>
    </div>
    <h2>2. Caso de Negócio Aprovado do Produto (Fluxo Anual — Tabela 02)</h2>
    <table>
      <thead><tr><th class="center">Ano</th><th class="num">Investimento</th><th class="num">Benefício Bruto</th><th class="num">Custo Operacional</th><th class="num">Fluxo Líquido</th><th class="num">Fluxo Acumulado</th></tr></thead>
      <tbody>{cn_rows}</tbody>
    </table>
    <div class="chart-box"><img src="{charts['d1_cashflow']}" /></div>
    """
    docs.append(("D01_Termo_de_Abertura_e_Caso_de_Negocio.pdf", "D01", "Termo de Abertura e Caso de Negócio", "Visão do produto digital, premissas da Trilha Ágil (Scrum/Jira) e viabilidade financeira", d01))

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
      <div class="kpi-card"><div class="kpi-label">Cerimônias & Ritos</div><div class="kpi-val">{len(db['33_reunioes'])}</div><div class="kpi-sub">Atas publicadas: {atas_ok}/{len(db['33_reunioes'])}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Patrocinadora (PI01)</div><div class="kpi-val">NEUTRO (6,0)</div><div class="kpi-sub">Presença em {patr_pres} reuniões (queda de LIDERA)</div></div>
    </div>
    <h2>1. Registro de Partes Interessadas e Engajamento (Nov/2026)</h2>
    <table>
      <thead><tr><th>ID</th><th>Parte Interessada / Contato</th><th class="center">P×I</th><th>Estratégia</th><th>Inicial → Desejado</th><th>Atual (Nov/26)</th></tr></thead>
      <tbody>{pi_rows}</tbody>
    </table>
    <div class="chart-box"><img src="{charts['d2_pi']}" /></div>
    <h2>2. Plano de Comunicação Ágil e Diagnóstico de Cerimônias</h2>
    <div class="callout warn">
      <strong>Alerta de Engajamento no Backlog:</strong> O Diretor Comercial (PI02, poder 4 × interesse 5) caiu para <strong>RESISTENTE (satisfação 2,7, zero interações em nov/26)</strong> após frustrações com o atraso da Release 2 — justamente quem inseriu <strong>9 pedidos diretos (35 pts)</strong> fora do rito de priorização do Product Owner. A Patrocinadora (PI01) também recuou de LIDERA para NEUTRO (6,0).
    </div>
    <ul>
      <li><strong>Sprint Review ({re_counts['REVISAO_DA_SPRINT']} edições) e Sprint Planning ({re_counts['PLANEJAMENTO_DA_SPRINT']} edições):</strong> fóruns oficiais quinzenais para demonstração do incremento funcional, feedback de usuários/oficinas (PI09) e priorização do backlog junto a PI02 e PI11 (PO).</li>
      <li><strong>Retrospectiva ({re_counts['RETROSPECTIVA']} edições):</strong> inspeção quinzenal de processo, qualidade e pulso do squad ágil conduzida pela Scrum Master (P12).</li>
      <li><strong>Comitê Diretor ({re_counts['COMITE_DIRETOR']} reuniões) e Alinhamentos ({re_counts['STATUS_SEMANAL']}):</strong> decisões de cenário, orçamento e reforço das alçadas com publicação obrigatória de ata.</li>
    </ul>
    """
    docs.append(("D02_Partes_Interessadas_e_Comunicacao.pdf", "D02", "Partes Interessadas e Comunicação", "Mapeamento Poder × Interesse, engajamento mensal e comunicação pelas cerimônias ágeis", d02))

    # ------------------------------------------------------------------
    # D03 — Estrutura de Entregas Ágeis e Dicionário de Épicos (100% Ágil)
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

    d03 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Hierarquia Ágil</div><div class="kpi-val">1 Produto · 3 Releases</div><div class="kpi-sub">8 Épicos · {len(db['14_backlog_itens'])} itens de backlog</div></div>
      <div class="kpi-card"><div class="kpi-label">Pontos Entregues</div><div class="kpi-val">{done_pts_all} / {total_pts_all} pts</div><div class="kpi-sub">{done_pts_all/total_pts_all*100:.1f}% do escopo total concluído</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Backlog Restante</div><div class="kpi-val">{total_pts_all - done_pts_all} pts</div><div class="kpi-sub">{ag['rem_r2']} pts para R2 · {ag['rem_r3']} pts até R3</div></div>
      <div class="kpi-card"><div class="kpi-label">Dona do Produto</div><div class="kpi-val">P11 Sílvia</div><div class="kpi-sub">Priorização MoSCoW e Critérios de Pronto</div></div>
    </div>
    <div class="callout">
      <strong>Estrutura de Entregas na Trilha Ágil (Product Breakdown Structure):</strong> Em substituição à decomposição tradicional em pacotes fixos, o escopo do produto digital Maré Seguros é organizado hierarquicamente em <strong>Releases (R1–R3) → Épicos orientados a valor (EP01–EP08) → Histórias de Usuário, Tarefas Técnicas e Defeitos</strong> gerenciados no Jira Scrum.
    </div>
    <h2>1. Decomposição por Release de Valor (Tabela 16)</h2>
    <table>
      <thead><tr><th>Release</th><th>Nome da Entrega</th><th>Objetivo de Negócio</th><th class="num">Itens</th><th class="num">Avanço em Pontos</th></tr></thead>
      <tbody>{rel_summary}</tbody>
    </table>
    <h2>2. Dicionário de Épicos e Definição de Pronto — DoD (Tabelas 13 e 14)</h2>
    <table>
      <thead><tr><th>Épico</th><th>Entrega / Persona</th><th class="center">Rel.</th><th class="num">Itens</th><th class="num">Concluído</th><th class="num">Restante</th><th>Critério de Aceite / Definição de Pronto (DoD)</th></tr></thead>
      <tbody>{ep_struct_rows}</tbody>
    </table>
    """
    docs.append(("D03_Estrutura_de_Entregas_Ageis_e_Epicos.pdf", "D03", "Estrutura de Entregas Ágeis e Épicos", "Decomposição do produto digital em Releases, Épicos (EP01–EP08), backlog e critérios de pronto (DoD)", d03))

    # ------------------------------------------------------------------
    # D04 — Roadmap de Releases e Cronograma de Sprints (Jira · 100% Ágil)
    # ------------------------------------------------------------------
    rel_rows_d4 = ""
    for r in db["16_releases"]:
        prev = f_date(r["data_real"]) if r["data_real"] else (f_date(ag["r2_d"]) if r["id_release"] == "R2" else f_date(ag["r3_d"]))
        sp_prev = r["id_sprint_planejada"] if r["data_real"] else (f"S{15 + ag['sr2']}" if r["id_release"] == "R2" else f"S{15 + ag['sr3']}")
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

    d04 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Cadência das Sprints</div><div class="kpi-val">14 dias corridos</div><div class="kpi-sub">15 concluídas (S01–S15) · 7 projetadas</div></div>
      <div class="kpi-card"><div class="kpi-label">Velocidade Real (5 últ.)</div><div class="kpi-val">{f_num(m['vel_media'],1)} pts/sp</div><div class="kpi-sub">Meta original: 17,3 pts/sprint</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Previsão Release 2</div><div class="kpi-val">{f_date(ag['r2_d'])} (S17)</div><div class="kpi-sub">Faltam {ag['rem_r2']} pts ({ag['sr2']} sprints)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Previsão Release 3</div><div class="kpi-val">{f_date(ag['r3_d'])} (S22)</div><div class="kpi-sub">Faltam {ag['rem_r3']} pts ({ag['sr3']} sprints)</div></div>
    </div>
    <div class="callout">
      <strong>Planejamento Empírico na Trilha Ágil (Jira Scrum):</strong> O horizonte de entrega é calculado diretamente pela <strong>velocidade real média das 5 últimas sprints ({f_num(m['vel_media'],1)} pts/sprint)</strong> sobre o backlog restante, respeitando os feriados de fim de ano e Carnaval registrados no calendário corporativo (<code>11_calendario.csv</code>).
    </div>
    <div class="chart-box"><img src="{charts['d4_roadmap']}" /></div>
    <h2>1. Marcos das Releases do Produto (Tabela 16)</h2>
    <table>
      <thead><tr><th>ID</th><th>Release</th><th class="center">Sprint / Data LB</th><th class="center">Real / Projetada</th><th>Status</th><th>Objetivo de Entrega</th></tr></thead>
      <tbody>{rel_rows_d4}</tbody>
    </table>
    <h2>2. Cronograma Completo de Sprints — Realizadas (S01–S15) e Projetadas (S16–S22)</h2>
    <table>
      <thead><tr><th>Sprint</th><th class="center">Período</th><th class="num">Plan.</th><th class="num">Entregue</th><th class="num">Ader.</th><th>Meta / Marco</th><th class="center">Situação</th></tr></thead>
      <tbody>{sp_table_rows}</tbody>
    </table>
    """
    docs.append(("D04_Roadmap_de_Releases_e_Cronograma_de_Sprints.pdf", "D04", "Roadmap de Releases e Cronograma de Sprints", "Planejamento empírico por velocidade no Jira Scrum, burndown de releases e calendário S01–S22", d04))

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

    d05 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">ONT Trilha Ágil</div><div class="kpi-val">{f_brl0(evm['ont_a'])}</div><div class="kpi-sub">17 sprints LB × R$ 68.300/sp</div></div>
      <div class="kpi-card"><div class="kpi-label">VA Ágil (13/11)</div><div class="kpi-val">{f_brl0(evm['va_a'])}</div><div class="kpi-sub">VP {f_brl0(evm['vp_a'])} · IDP = {f_num(evm['idp_a'], 3)}</div></div>
      <div class="kpi-card alert"><div class="kpi-label">ENT Ágil Projetada</div><div class="kpi-val">{f_brl0(ent_a)}</div><div class="kpi-sub">CR {f_brl0(evm['cr_a'])} · IDC = {f_num(evm['idc_a'], 3)}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Custo por Ponto & Reservas</div><div class="kpi-val">{f_brl0(m['custo_pt'])}/pt</div><div class="kpi-sub">Cont. R$ 73k · Ger. R$ 91k · Gestão {f_brl0(evm['cr_g'])}</div></div>
    </div>
    <h2>1. Composição do Custo Real da Trilha Ágil até 13/11/2026</h2>
    <table>
      <thead><tr><th>Natureza do Custo (Trilha Ágil)</th><th class="num">Realizado até 13/11</th><th class="num">% do CR Ágil</th></tr></thead>
      <tbody>{cat_agil_rows}<tr class="highlight"><td>Total Realizado — Trilha Ágil (CR Ágil)</td><td class="num mono">{f_brl(evm['cr_a'])}</td><td class="num mono">100,0%</td></tr></tbody>
    </table>
    <h2>2. Desempenho de Valor Agregado Ágil (Agile EVM — 25/09 × 13/11)</h2>
    <table>
      <thead><tr><th>Data de Corte</th><th class="num">ONT Ágil</th><th class="num">VP Ágil</th><th class="num">VA Ágil</th><th class="num">CR Ágil</th><th class="num">IDP</th><th class="num">IDC</th><th class="num">ENT Ágil</th></tr></thead>
      <tbody>
        <tr><td>Corte Intermediário (25/09/2026)</td><td class="num mono">{f_brl0(evm09['ont_a'])}</td><td class="num mono">{f_brl0(evm09['vp_a'])}</td><td class="num mono">{f_brl0(evm09['va_a'])}</td><td class="num mono">{f_brl0(evm09['cr_a'])}</td><td class="num mono">{f_num(evm09['idp_a'],3)}</td><td class="num mono">{f_num(evm09['idc_a'],3)}</td><td class="num mono">{f_brl0(ent_a_09)}</td></tr>
        <tr class="highlight"><td>Status Atual (13/11/2026 · Sprint S15)</td><td class="num mono">{f_brl0(evm['ont_a'])}</td><td class="num mono">{f_brl0(evm['vp_a'])}</td><td class="num mono">{f_brl0(evm['va_a'])}</td><td class="num mono">{f_brl0(evm['cr_a'])}</td><td class="num mono">{f_num(evm['idp_a'],3)}</td><td class="num mono">{f_num(evm['idc_a'],3)}</td><td class="num mono">{f_brl0(ent_a)}</td></tr>
      </tbody>
    </table>
    <div class="chart-box"><img src="{charts['d5_curva_s']}" /></div>
    <div class="callout warn">
      <strong>Leitura Financeira do Agile EVM:</strong> A Trilha Ágil entrega R$ 0,72 de valor agregado para cada R$ 1,00 gasto (<strong>IDC = 0,718</strong>), elevando o custo médio para <strong>{f_brl0(m['custo_pt'])}/story point</strong> e projetando estouro de <strong>+{f_brl0(ent_a - evm['ont_a'])}</strong> caso a velocidade de 16,0 pts/sprint e o retrabalho de defeitos não sejam corrigidos.
    </div>
    """
    docs.append(("D05_Orcamento_Agil_Curva_S_e_Reservas.pdf", "D05", "Orçamento Ágil, Curva S e Reservas", "Orçamento por sprint, Agile EVM (VP/VA/CR), custo por story point e reservas do projeto", d05))

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

    d06 = f"""
    <div class="callout">
      <strong>Governança de Papéis no Squad Ágil:</strong> <strong>R</strong> = Responsável pela construção/entrega · <strong>A</strong> = Aprovador de valor/escopo (Product Owner P11) · <strong>C</strong> = Consultado técnico/UX/QA · <strong>I</strong> = Informado nas Sprint Reviews. A Scrum Master (P12 Valéria) atua como facilitadora transversal das cerimônias e remoção de impedimentos.
    </div>
    <h2>1. Matriz RACI da Trilha Ágil por Épico do Produto (EP01–EP08)</h2>
    <table>
      <thead><tr><th>Épico</th><th>Entrega do Produto</th><th class="center">Rel.</th><th>R (Squad Execução)</th><th>A (Accountable)</th><th>C (Consultado)</th><th>I (Informado)</th></tr></thead>
      <tbody>{raci_ep_rows}</tbody>
    </table>
    <h2>2. Histograma de Alocação do Squad Ágil — Planejado × Apontado (Devs Principais)</h2>
    <div class="chart-box"><img src="{charts['d6_hist']}" /></div>
    <div class="callout warn">
      <strong>Leitura Gerencial do Histograma do Squad:</strong> <strong>P15 Kleber Nascimento</strong> manteve utilização contínua (~160–176 h/mês) com pico de <strong>215 h em ago/26 (+28% sobre o plano)</strong> durante a pressão da Sprint S12, coincidindo com a queda do pulso do time para 3,03. <strong>P16 Sílvia Moreira</strong> absorveu parte da saída da dev sênior P14 (Débora Leal), exigindo proteção de capacidade nas sprints S16–S17 para evitar novo desgaste.
    </div>
    """
    docs.append(("D06_Papeis_Ageis_RACI_e_Histograma.pdf", "D06", "Papéis Ágeis (RACI) e Histograma do Squad", "Responsabilidades do time Scrum por épico e análise de capacidade planejada × apontada", d06))

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
      <strong>Configuração Oficial no Jira (Trilha Ágil):</strong> Projeto Scrum com chave <code>MS</code>, versões <strong>R1, R2 e R3</strong>, os 8 épicos abaixo, backlog importado da base tratada, Sprint S15 executada no quadro (Boletins B5/B6) e sprints futuras (S16 em diante) dimensionadas pela velocidade real de <strong>{f_num(m['vel_media'],1)} pts/sprint</strong>.
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
    # D09 — Riscos e Reservas (Foco Produto Digital e Trilha Ágil)
    # ------------------------------------------------------------------
    open_th = [r for r in db["26_riscos_registro"] if r["tipo_risco"] == "AMEACA" and r["status"] == "ABERTO"]
    vme_open = sum(float(r["probabilidade_pct"]) / 100.0 * float(r["impacto_custo_rs"]) for r in open_th)
    oc_tot = sum(float(o["impacto_custo_real_rs"]) for o in db["27_riscos_ocorrencias"])
    r_rows = ""
    for r in db["26_riscos_registro"]:
        vme = float(r["probabilidade_pct"]) / 100.0 * float(r["impacto_custo_rs"])
        cls = "alert-row" if r["status"] == "OCORRIDO" else ("warn-row" if r["status"] == "ABERTO" and r["tipo_risco"] == "AMEACA" else "")
        area = "Squad / Backlog" if r["frente"] == "AGIL" else "Produto / Operação"
        r_rows += f"<tr class='{cls}'><td class='mono'>{r['id_risco']}</td><td>{r['descricao']}</td><td class='mono'>{area}</td><td class='center mono'>{r['probabilidade_pct']}%</td><td class='num mono'>{f_brl0(float(r['impacto_custo_rs']))}</td><td class='num mono'><strong>{f_brl0(vme)}</strong></td><td>{r['estrategia_resposta']}</td><td class='center'><span class='badge {'b-coral' if r['status']=='OCORRIDO' else ('b-sand' if r['status']=='ABERTO' else 'b-navy')}'>{r['status']}</span></td></tr>"

    oc_rows = "".join(
        f"<tr><td class='mono'>{o['id_ocorrencia']}</td><td class='mono'>{f_date(o['data'])}</td><td class='mono'>{o['id_risco'] or 'IMPREVISTO'}</td><td>{o['descricao']}</td><td class='mono'>{'Squad / Backlog' if o['frente']=='AGIL' else 'Produto / Operação'}</td><td class='num mono'>{f_brl0(float(o['impacto_custo_real_rs']))}</td><td class='num mono'>{o['impacto_prazo_real_du']} du</td></tr>"
        for o in db["27_riscos_ocorrencias"]
    )
    d09 = f"""
    <div class="kpi-grid">
      <div class="kpi-card warn"><div class="kpi-label">Exposição VME Aberta</div><div class="kpi-val">{f_brl0(vme_open)}</div><div class="kpi-sub">{len(open_th)} ameaças abertas no produto</div></div>
      <div class="kpi-card"><div class="kpi-label">Reserva de Contingência</div><div class="kpi-val">R$ 73.000</div><div class="kpi-sub">Cobre VME aberto (saldo +{f_brl0(73000-vme_open)})</div></div>
      <div class="kpi-card navy"><div class="kpi-label">Reserva Gerencial</div><div class="kpi-val">R$ 91.000</div><div class="kpi-sub">Para imprevistos (sob alçada PI01)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Ocorrências Materializadas</div><div class="kpi-val">{f_brl0(oc_tot)}</div><div class="kpi-sub">8 eventos (destaque OC-006/007/008)</div></div>
    </div>
    <div class="chart-box"><img src="{charts['d9_risks']}" /></div>
    <h2>1. Registro de Riscos do Produto Digital e Valor Monetário Esperado (Tabela 26)</h2>
    <table>
      <thead><tr><th>ID</th><th>Evento de Risco</th><th>Domínio</th><th class="center">Prob.</th><th class="num">Impacto</th><th class="num">VME</th><th>Resposta</th><th class="center">Status</th></tr></thead>
      <tbody>{r_rows}</tbody>
    </table>
    <h2>2. Ocorrências Materializadas e Imprevistos (Tabela 27 + Boletim B8)</h2>
    <table>
      <thead><tr><th>ID</th><th>Data</th><th>Risco</th><th>Descrição</th><th>Domínio</th><th class="num">Custo Real</th><th class="num">Atraso</th></tr></thead>
      <tbody>{oc_rows}</tbody>
    </table>
    """
    docs.append(("D09_Riscos_e_Reservas.pdf", "D09", "Gestão de Riscos e Reservas", "Análise quantitativa (VME), matriz 5×5, riscos do backlog ágil, reservas e ocorrências reais", d09))

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
    tot_rep = sum(1 for i in db["25_inspecoes_aceite"] if i["resultado"] == "REPROVADO")
    d10 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Contratos de Suporte</div><div class="kpi-val">10</div><div class="kpi-sub">Nuvem (CT02), IA (CT04), UX, QA e Apoio</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Custo Não Qualidade</div><div class="kpi-val">{f_brl0(tot_retr)}</div><div class="kpi-sub">{tot_rep} inspeções reprovadas (6 em F04)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Defeitos no Backlog</div><div class="kpi-val">{len(db['24_defeitos'])} bugs</div><div class="kpi-sub">5 defeitos escaparam para Produção</div></div>
      <div class="kpi-card"><div class="kpi-label">Recomendação Licitação</div><div class="kpi-val">PR-03 (F11)</div><div class="kpi-sub">Vértice · Melhor nota sem risco F04</div></div>
    </div>
    <h2>1. Contratos de Tecnologia e Apoio ao Produto Digital (Tabelas 30, 31 e 25)</h2>
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
      <strong>Qualidade Ágil e Armadilha de Menor Preço:</strong> No produto, o pedido direto <code>MS-222</code> gerou <strong>5 bugs em uma única sprint (S15)</strong>, reforçando a obrigatoriedade de revisão por par e Definição de Pronto. Em aquisições, a proposta mais barata (<strong>PR-01 · F04 VisionAI</strong>, R$ 87.800) pertence ao fornecedor que acumulou <strong>6 reprovações no motor de IA</strong> e <strong>R$ 105.300 em ocorrências (OC-003 e OC-005)</strong> — recomenda-se contratar <strong>PR-03 (F11 Vértice)</strong> ou <strong>PR-05 (F13 Polo)</strong>.
    </div>
    """
    docs.append(("D10_Aquisicoes_e_Qualidade.pdf", "D10", "Aquisições, Fornecedores e Qualidade Ágil", "Contratos de tecnologia, seleção ponderada de fornecedores, DoD, inspeções e defeitos", d10))

    # ------------------------------------------------------------------
    # D11 — Mudanças no Backlog e Bússola de Abordagem (Justificativa 100% Ágil)
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
    <h2>1. Bússola de Abordagem — Justificativa pela Escolha da Trilha Ágil</h2>
    <div class="callout">
      <strong>Decisão Metodológica do Grupo 3:</strong> Aplicando as quatro variáveis da Bússola de Abordagem ao aplicativo da Maré Seguros, o produto concentra alta incerteza de experiência do segurado, baixo custo de evolução em software, entregas incrementais de valor e proximidade diária com usuários do piloto — fundamentando a condução pela <strong>Trilha Ágil (Scrum + Jira)</strong>.
    </div>
    <table>
      <thead><tr><th>Dimensão da Bússola</th><th>Característica do Produto Digital Maré Seguros</th><th>Direção Indicada</th></tr></thead>
      <tbody>
        <tr><td><strong>Escopo</strong></td><td>Evolutivo: jornadas de foto, IA de danos, portal do corretor e antifraude refinadas com dados reais do piloto.</td><td><span class="badge b-teal">TRILHA ÁGIL</span></td></tr>
        <tr><td><strong>Custo da Mudança</strong></td><td>Baixo em software modular: histórias são repriorizadas entre sprints sem perda de ativo físico.</td><td><span class="badge b-teal">TRILHA ÁGIL</span></td></tr>
        <tr><td><strong>Cadência de Entrega</strong></td><td>Incremental em 3 releases (R1 MVP, R2 Operação, R3 Evolução) e deploys contínuos em homologação/produção.</td><td><span class="badge b-teal">TRILHA ÁGIL</span></td></tr>
        <tr><td><strong>Proximidade do Usuário</strong></td><td>Alta: 1.192 usuários ativos no piloto, 40 oficinas e NPS semanal (55) retroalimentam o backlog no Jira.</td><td><span class="badge b-teal">TRILHA ÁGIL</span></td></tr>
      </tbody>
    </table>
    <h2>2. Regra de Governança do Backlog e Auditoria de Alçadas (Tabela 28 × Tabela 05)</h2>
    <div class="callout alert">
      <strong>Falhas Críticas de Governança Identificadas:</strong> (1) <strong>4 aprovações acima da alçada do gerente</strong> (<code>SM-002, SM-004, SM-005, SM-011</code>, total R$ 63.600) violando limites de R$ 15 mil, 5 du e veto a escopo; (2) <strong>9 pedidos diretos (35 pts)</strong> de PI02 entraram no backlog sem passar pela PO nem por SM — só <code>MS-222</code> gerou 5 defeitos na Sprint S15.
    </div>
    <table>
      <thead><tr><th>SM</th><th>Tipo</th><th>Decisor / Status</th><th class="num">Custo</th><th class="num">Prazo</th><th>Descrição</th><th>Auditoria</th></tr></thead>
      <tbody>{sm_rows}</tbody>
    </table>
    """
    docs.append(("D11_Mudancas_e_Bussola_de_Abordagem.pdf", "D11", "Controle de Mudanças e Bússola de Abordagem", "Justificativa técnica da Trilha Ágil, governança do backlog e auditoria de alçadas", d11))

    # ------------------------------------------------------------------
    # D12 — Estratégia do Projeto (Estratégia Ágil)
    # ------------------------------------------------------------------
    d12 = f"""
    <div class="callout">
      <strong>Tese Estratégica para o Comitê Diretor (Trilha Ágil):</strong> O produto digital Maré Seguros mantém VPL positivo em C1 ({f_brl0(c1['vpl'])}), mas a queda de velocidade para <strong>{f_num(m['vel_media'],1)} pts/sprint</strong> e o custo ágil de <strong>{f_brl0(m['custo_pt'])}/pt</strong> (IDC Ágil {f_num(evm['idc_a'],3)}) empurram a Release 3 e geram resultado líquido negativo em C1 ({f_brl0(c1['resultado'])}). Entre os cenários simulados, <strong>{best_sc['id']} ({best_sc['nome']})</strong> entrega o <strong>maior VPL ({f_brl0(best_sc['vpl'])}) e melhor resultado líquido ({f_brl0(best_sc['resultado'])}, ganho de +{f_brl0(best_sc['resultado'] - c1['resultado'])} sobre C1)</strong>; caso o Comitê exija não alongar o horizonte até {f_date(best_sc['end_date'])}, a alternativa mais equilibrada sem cortar IA é <strong>C6 (implantação em duas ondas)</strong>.
    </div>
    <h2>1. Os 6 Achados Diagnósticos Prioritários da Trilha Ágil</h2>
    <table>
      <thead><tr><th>#</th><th>Achado</th><th>Evidência Numérica (13/11)</th><th>Ação Estratégica</th><th>Dono</th></tr></thead>
      <tbody>
        <tr><td class="mono">A1</td><td>Ritmo das Releases (R2/R3)</td><td>Velocidade {f_num(m['vel_media'],1)} vs 17,3 pts/sp; R2 em S17 (11/12) e R3 em S22 (19/02)</td><td>Deliberar entre C4 (valor) ou C6 (ondas)</td><td>P11 / PI01</td></tr>
        <tr><td class="mono">A2</td><td>Estouro do Agile EVM</td><td>ENT Ágil {f_brl0(ent_a)} vs ONT {f_brl0(evm['ont_a'])} (IDC {f_num(evm['idc_a'],3)}; {f_brl0(m['custo_pt'])}/pt)</td><td>Reduzir retrabalho e proteger foco em itens MUST</td><td>P01 / P11</td></tr>
        <tr><td class="mono">A3</td><td>Scope creep no backlog</td><td>9 pedidos diretos de PI02 (35 pts); MS-222 gerou 5 bugs na S15</td><td>Trava de SM no Jira + alinhamento com PI02</td><td>P11 / PI01</td></tr>
        <tr><td class="mono">A4</td><td>Quebra de alçadas</td><td>4 SMs (R$ 63,6k) aprovadas acima do limite do gerente</td><td>Gate formal por nível decisor (Tab. 05)</td><td>P01 / Comitê</td></tr>
        <tr><td class="mono">A5</td><td>Fornecedor crítico F04</td><td>6 reprovações no motor de IA + R$ 105,3k em ocorrências</td><td>Não contratar F04 em PR-01; eleger F11 Vértice</td><td>P01 / Compras</td></tr>
        <tr><td class="mono">A6</td><td>Rotatividade e WIP no Squad</td><td>Saída da dev P14 (101 pts); rampa de P18 ({f_brl0(1904)}/pt); IP-014 bloqueando MS-161</td><td>Pair programming P15/P18 e limite de WIP no Jira</td><td>P12 (SM)</td></tr>
      </tbody>
    </table>
    <h2>2. Plano Tático por Sprints (30 / 60 / 90 Dias)</h2>
    <div class="grid-2">
      <div class="card"><strong>Sprints S16–S17 (0–30 dias · Estabilização e R2):</strong> Deliberar cenário oficial (C4 ou C6); congelar pedidos diretos fora de SM; resolver impedimento <code>IP-014</code> e bugs de <code>MS-222</code>; concluir os 29 pts restantes da <strong>Release 2 em 11/12/2026</strong>; contratar F11 Vértice no monitoramento 24h.</div>
      <div class="card"><strong>Sprints S18–S22 (31–90 dias · R3 e Escala):</strong> Acelerar rampa de P18 com revisão por par obrigatória; entregar épicos EP07 (Corretor) e EP08 (Antifraude) sem dívida técnica; monitorar NPS (>55) e taxa de falha DORA (&lt;5%) até a entrega completa.</div>
    </div>
    """
    docs.append(("D12_Estrategia_do_Projeto.pdf", "D12", "Estratégia do Projeto (Trilha Ágil)", "Síntese diagnóstica, governança de recuperação do squad e plano tático por sprints", d12))

    # ------------------------------------------------------------------
    # D13 — Pessoal e Custos de Pessoal (Foco Squad Ágil + Governança)
    # ------------------------------------------------------------------
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
        f"<tr><td class='mono'>{x['id']}</td><td><strong>{x['nome']}</strong><br/><span style='color:#64748B'>{x['papel']}</span></td><td class='center mono'>APOIO PRODUTO</td><td class='center mono'>{x['vinculo']}</td><td class='num mono'>{f_brl(x['cm'])}</td><td class='num mono'>R$ {x['ch']:.0f}</td><td class='num mono'>{f_num(x['hn'],1)} + {f_num(x['he'],1)}</td><td class='num mono'>{f_brl0(x['cproj'])}</td><td class='num mono'>{f_brl0(x['reaj_rs'])}</td></tr>"
        for x in apoio_prod
    )
    d13 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Squad Ágil + Gov.</div><div class="kpi-val">{f_brl(tot_folha_ag)}/mês</div><div class="kpi-sub">8 Squad Ágil + 2 Governança (PMO/GP)</div></div>
      <div class="kpi-card"><div class="kpi-label">Horas Squad + Gov.</div><div class="kpi-val">{f_num(tot_h_ag,1)} h</div><div class="kpi-sub">Custo alocado: {f_brl0(tot_cp_ag)}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Folha Global (18 p.)</div><div class="kpi-val">{f_brl(tot_folha_all)}</div><div class="kpi-sub">100% reconciliada (Tab. 04 × Tab. 39)</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Impacto de Reajuste</div><div class="kpi-val">{f_brl0(tot_reaj_ag)}</div><div class="kpi-sub">Projeção Squad + Gov. até término</div></div>
    </div>
    <h2>1. Squad Ágil (8 Profissionais) e Governança do Produto (2 Profissionais)</h2>
    <table>
      <thead><tr><th>ID</th><th>Profissional / Papel</th><th class="center">Núcleo</th><th class="center">Vínc.</th><th class="num">Custo Mensal</th><th class="num">R$/h</th><th class="num">Horas (N+E)</th><th class="num">Custo Proj.</th><th class="num">Reajuste Est.</th></tr></thead>
      <tbody>{p_ag_rows}<tr class="highlight"><td colspan="4">SUBTOTAL SQUAD ÁGIL + GOVERNANÇA (10 pessoas)</td><td class="num mono">{f_brl(tot_folha_ag)}</td><td></td><td class="num mono">{f_num(tot_h_ag,1)} h</td><td class="num mono">{f_brl0(tot_cp_ag)}</td><td class="num mono">{f_brl0(tot_reaj_ag)}</td></tr></tbody>
    </table>
    <h2>2. Especialistas de Apoio ao Produto Digital (Regulação, Piloto, Segurança e Marca)</h2>
    <table>
      <thead><tr><th>ID</th><th>Profissional / Papel</th><th class="center">Núcleo</th><th class="center">Vínc.</th><th class="num">Custo Mensal</th><th class="num">R$/h</th><th class="num">Horas (N+E)</th><th class="num">Custo Proj.</th><th class="num">Reajuste Est.</th></tr></thead>
      <tbody>{p_ap_rows}</tbody>
    </table>
    """
    docs.append(("D13_Pessoal_e_Custos_de_Pessoal.pdf", "D13", "Pessoal e Custos de Pessoal (Squad Ágil)", "Folha salarial, custo-hora, apontamentos por sprint e impacto de reajuste no Squad Ágil", d13))

    # ------------------------------------------------------------------
    # D14 — Produtividade das Equipes Ágeis (100% Ágil)
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

    d14 = f"""
    <div class="kpi-grid">
      <div class="kpi-card navy"><div class="kpi-label">Velocidade Recente</div><div class="kpi-val">{f_num(m['vel_media'],1)} pts/sp</div><div class="kpi-sub">Abaixo da meta original (17,3 pts/sp)</div></div>
      <div class="kpi-card"><div class="kpi-label">Custo Global / Ponto</div><div class="kpi-val">{f_brl0(m['custo_pt'])}/pt</div><div class="kpi-sub">CR Ágil / 291 pts concluídos</div></div>
      <div class="kpi-card alert"><div class="kpi-label">Impacto Turnover (P14)</div><div class="kpi-val">−101 pts/hist.</div><div class="kpi-sub">P18 em rampa (R$ 1.904/pt vs R$ 1.068)</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Retrabalho S15</div><div class="kpi-val">5 bugs (MS-222)</div><div class="kpi-sub">Derrubou S15 para apenas 9 pts</div></div>
    </div>
    <div class="callout warn">
      <strong>Diagnóstico Central (Falta gente ou rendimento no Squad Ágil?):</strong> A queda de entrega não decorre apenas de capacidade — decorre da combinação de <strong>(1) saída da desenvolvedora mais produtiva (P14 Débora Leal, 0,118 pts/h)</strong> com curva de rampa do substituto P18 (0,054 pts/h), <strong>(2) interrupções por 9 pedidos diretos de PI02</strong> e <strong>(3) retrabalho de qualidade</strong> (5 defeitos de <code>MS-222</code> consumindo a Sprint S15).
    </div>
    <div class="chart-box"><img src="{charts['d14_prod']}" /></div>
    <h2>1. Produtividade Individual do Time de Engenharia e QA (Pontos/Hora e Custo/Ponto)</h2>
    <table>
      <thead><tr><th>ID</th><th>Profissional</th><th class="num">Pontos</th><th class="num">Horas</th><th class="num">Pts / Hora</th><th class="num">Custo / Pt</th><th>Leitura Gerencial</th></tr></thead>
      <tbody>{dev_rows}</tbody>
    </table>
    <h2>2. Eficiência das Últimas 6 Sprints (Pontos por Pessoa-Dia Disponível)</h2>
    <table>
      <thead><tr><th>Sprint</th><th class="center">Período</th><th class="num">Capacidade</th><th class="num">Plan.</th><th class="num">Entregue</th><th class="num">Rendimento</th><th>HE Aut.</th></tr></thead>
      <tbody>{sp_eff_rows}</tbody>
    </table>
    """
    docs.append(("D14_Produtividade_das_Equipes.pdf", "D14", "Produtividade do Squad Ágil", "Pontos por hora, custo por story point, impacto de turnover (P14→P18) e eficiência por sprint", d14))

    # ------------------------------------------------------------------
    # D15 — Análise Financeira do Produto Digital
    # ------------------------------------------------------------------
    c1_fl_rows = "".join(
        f"<tr><td class='center mono'>{r['ano']}</td><td class='num mono'>{f_brl0(r['inv'])}</td><td class='num mono'>{f_brl0(r['ben'])}</td><td class='num mono'>{f_brl0(r['cop'])}</td><td class='num mono'><strong>{f_brl0(r['fl'])}</strong></td><td class='num mono'>{f_brl0(r['acum'])}</td></tr>"
        for r in c1["fluxo"]
    )
    d15 = f"""
    <div class="kpi-grid">
      <div class="kpi-card alert"><div class="kpi-label">ENT Ágil / Produto (C1)</div><div class="kpi-val">{f_brl0(ent_a)}</div><div class="kpi-sub">ENT global caso: {f_brl0(evm['ent'])}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">Custo do Atraso (C1)</div><div class="kpi-val">{f_brl0(c1['catraso'])}</div><div class="kpi-sub">{c1['delay_du']} du × R$ 5.400/du</div></div>
      <div class="kpi-card navy"><div class="kpi-label">VPL Atualizado (C1)</div><div class="kpi-val">{f_brl0(c1['vpl'])}</div><div class="kpi-sub">TMA 14% · Payback {f_num(c1['payback'],2)} anos</div></div>
      <div class="kpi-card"><div class="kpi-label">Resultado Líquido (C1)</div><div class="kpi-val">{f_brl0(c1['resultado'])}</div><div class="kpi-sub">VPL − Custo do Atraso</div></div>
    </div>
    <h2>1. Fluxo de Caixa Atualizado do Produto Digital — Cenário Base C1 (Conv. 16 e 23)</h2>
    <table>
      <thead><tr><th class="center">Ano</th><th class="num">Investimento</th><th class="num">Benefício Bruto</th><th class="num">Custo Op.</th><th class="num">Fluxo Líquido</th><th class="num">Acumulado</th></tr></thead>
      <tbody>{c1_fl_rows}</tbody>
    </table>
    <h2>2. Decomposição dos Desvios Financeiros na Trilha Ágil</h2>
    <ul>
      <li><strong>Desvio de Custo da Trilha Ágil (CR Ágil − VA Ágil = {f_brl0(evm['cr_a'] - evm['va_a'])}):</strong> impulsionado pela queda de velocidade para 16,0 pts/sprint, elevando o custo real por ponto para <strong>{f_brl0(m['custo_pt'])}/pt</strong>, além das ocorrências ágeis <code>OC-006</code> (pedidos diretos, R$ 11.000) e <code>OC-007</code> (saída de dev sênior, R$ 19.400).</li>
      <li><strong>Efeito no VPL do Caso de Negócio:</strong> o aumento de investimento somado à perda proporcional de receita no Ano 1 pelo atraso das releases reduz o VPL aprovado de <strong>{f_brl0(vpl_base)}</strong> para <strong>{f_brl0(c1['vpl'])}</strong> (queda de {f_brl0(vpl_base - c1['vpl'])}).</li>
      <li><strong>Custo de Governança (PMO/GP à parte):</strong> {f_brl0(evm['cr_g'])} acumulados até 13/11/2026.</li>
    </ul>
    """
    docs.append(("D15_Analise_Financeira.pdf", "D15", "Análise Financeira do Produto Digital", "Fluxo de caixa atualizado, VPL (14% a.a.), payback, custo por ponto e custo do atraso", d15))

    # ------------------------------------------------------------------
    # D16 — Cenários e Decisão (Visão Trilha Ágil)
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
      <strong>Recomendação Oficial ao Comitê Diretor:</strong> Pelo critério econômico-financeiro (<strong>VPL − Custo do Atraso</strong>), o cenário ótimo é <strong>{best_sc['id']} ({best_sc['nome']})</strong>, com <strong>VPL de {f_brl0(best_sc['vpl'])}</strong>, payback de <strong>{f_num(best_sc['payback'],2)} anos</strong> e resultado líquido de <strong>{f_brl0(best_sc['resultado'])}</strong> (ganho de <strong>+{f_brl0(best_sc['resultado'] - c1['resultado'])}</strong> sobre C1), assumindo o trade-off de ampliar o backlog e o término para <strong>{f_date(best_sc['end_date'])} ({best_sc['delay_du']} du)</strong>. Caso haja restrição rígida de caixa ou prazo, <strong>C3</strong> reduz o desembolso para R$ 3,92 mi (cortando EP03/IA) e <strong>C6</strong> mantém o backlog completo antecipando 50% do benefício na praça piloto.
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
    # D17 — Mockups do Produto Digital e Arquitetura 3D
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
    el3d_agil = [e for e in db["38_elementos_3d"] if e["vinculo_tipo"] in ("EPICO", "NENHUM")]
    el3d_rows = "".join(
        f"<tr><td class='mono'>{e['id_elemento']}</td><td><strong>{e['nome_elemento']}</strong></td><td class='mono'>{e['tipo_elemento']}</td><td class='center mono'>({e['x']},{e['y']},{e['z']})</td><td class='center mono'>{e['largura']}×{e['comprimento']}×{e['altura']}</td><td class='mono'>{e['vinculo_ids'] or 'Plataforma Base'}</td></tr>"
        for e in el3d_agil
    )
    d17 = f"""
    <div class="callout">
      <strong>Protótipo Interativo Publicado (Trilha Ágil):</strong> As <strong>14 telas navegáveis</strong> do aplicativo Maré Seguros (com controle de data de 01/05 a 13/11 e filtro de cenários C1/C3/C4/C5) e o <strong>Mapa 3D Esquemático dos Módulos em Three.js</strong> estão disponíveis ao vivo em <strong>https://sistema-ruddy.vercel.app</strong> na aba <em>Mockups do Produto</em>.
    </div>
    <h2>1. Catálogo das 14 Telas Navegáveis do Produto Digital (EP01–EP08)</h2>
    <table>
      <thead><tr><th>Tela</th><th>Nome da Tela</th><th class="center">Épico</th><th class="center">Rel.</th><th>Itens Backlog</th><th class="center">Status 13/11</th><th>Impacto nos Cenários</th></tr></thead>
      <tbody>{mk_rows}</tbody>
    </table>
    <h2>2. Módulos Funcionais no Mapa 3D Esquemático (Tabela 38 — Épicos EP01–EP08)</h2>
    <table>
      <thead><tr><th>ID</th><th>Módulo do Produto Digital</th><th>Tipo</th><th class="center">Posição (x,y,z)</th><th class="center">Dimensões (m)</th><th>Épico Vinculado</th></tr></thead>
      <tbody>{el3d_rows}</tbody>
    </table>
    <div class="callout">
      <strong>Cobertura Territorial no Mapa 3D:</strong> Além dos 8 módulos de software acima, o mapa interativo representa os serviços de nuvem/IA/suporte e as <strong>10 praças de implantação na Bahia</strong> (Salvador, Feira de Santana, Vitória da Conquista, Itabuna, Juazeiro, Barreiras, Camaçari, Lauro de Freitas, Ilhéus e Jequié).
    </div>
    """
    docs.append(("D17_Mockups_do_Produto_e_Mapa_3D.pdf", "D17", "Mockups Navegáveis e Arquitetura 3D", "Catálogo das 14 telas do aplicativo Maré Seguros, vínculos de backlog (MS-*) e módulos 3D", d17))

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
