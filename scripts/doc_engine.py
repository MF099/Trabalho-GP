"""Motor de dados, cálculos oficiais (23 convenções) e gráficos da identidade Maré Seguros
para geração dos 17 documentos (D01–D17) na data de status 13/11/2026.
"""
import base64
import csv
import math
import os
from collections import defaultdict
from datetime import datetime, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLEAN_DIR = os.path.join(BASE_DIR, "dados_tratados")
LOGO_PATH = os.path.join(BASE_DIR, "mare_seguros.jpeg")

# Paleta oficial Maré Seguros
NAVY = "#0D2F52"
TEAL = "#139297"
TEAL_LIGHT = "#2DD4BF"
SAND = "#B89456"
CORAL = "#B85D53"
SLATE_TEXT = "#1E293B"
MUTED = "#64748B"
GRID_COLOR = "#E2E8F0"

plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Arial", "Helvetica"]
plt.rcParams["axes.edgecolor"] = "#CBD5E1"
plt.rcParams["axes.linewidth"] = 0.8


def f_brl(v, dec=2):
    s = f"{v:,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"


def f_brl0(v):
    return f_brl(v, 0)


def f_num(v, dec=1):
    return f"{v:,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def f_date(iso):
    if not iso or len(iso) < 10:
        return "—"
    y, m, d = iso[:10].split("-")
    return f"{d}/{m}/{y}"


def add_days(iso, days):
    dt = datetime.strptime(iso[:10], "%Y-%m-%d") + timedelta(days=days)
    return dt.strftime("%Y-%m-%d")


def logo_data_uri():
    with open(LOGO_PATH, "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("ascii")


def fig_to_data_uri(fig):
    import io
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def load_database_1311():
    db = {}
    for fname in sorted(os.listdir(CLEAN_DIR)):
        if fname.endswith(".csv"):
            with open(os.path.join(CLEAN_DIR, fname), "r", encoding="utf-8") as f:
                db[fname[:-4]] = list(csv.DictReader(f))

    # Aplica Boletins B1-B9 (Quinzena de campo 03 a 13/11/2026)
    db["17_avanco_semanal"].extend([
        {"semana_fim": "2026-11-06", "id_atividade": "A27", "avanco_acumulado_pct": "60", "situacao": "EM_ANDAMENTO", "data_inicio_real": "2026-10-05", "data_termino_real": "", "id_responsavel": "P09"},
        {"semana_fim": "2026-11-06", "id_atividade": "A29", "avanco_acumulado_pct": "25", "situacao": "EM_ANDAMENTO", "data_inicio_real": "2026-10-22", "data_termino_real": "", "id_responsavel": "P09"},
        {"semana_fim": "2026-11-06", "id_atividade": "A34", "avanco_acumulado_pct": "100", "situacao": "CONCLUIDA", "data_inicio_real": "2026-10-27", "data_termino_real": "2026-11-04", "id_responsavel": "P09"},
        {"semana_fim": "2026-11-13", "id_atividade": "A27", "avanco_acumulado_pct": "75", "situacao": "EM_ANDAMENTO", "data_inicio_real": "2026-10-05", "data_termino_real": "", "id_responsavel": "P09"},
        {"semana_fim": "2026-11-13", "id_atividade": "A29", "avanco_acumulado_pct": "35", "situacao": "EM_ANDAMENTO", "data_inicio_real": "2026-10-22", "data_termino_real": "", "id_responsavel": "P09"},
    ])
    b2 = [
        ("2026-11-02","P01","GESTAO","GESTAO","32.0","0.0"),("2026-11-02","P02","GESTAO","GESTAO","32.0","0.0"),
        ("2026-11-02","P09","ATIVIDADE","A27","15.5","7.5"),("2026-11-02","P09","ATIVIDADE","A29","9.5","4.0"),
        ("2026-11-02","P09","ATIVIDADE","A34","7.0","3.0"),
        ("2026-11-02","P11","SPRINT","S15","32.0","0.0"),("2026-11-02","P12","SPRINT","S15","32.0","0.0"),
        ("2026-11-02","P13","SPRINT","S15","32.0","0.0"),("2026-11-02","P15","SPRINT","S15","32.0","0.0"),
        ("2026-11-02","P16","SPRINT","S15","32.0","0.0"),("2026-11-02","P17","SPRINT","S15","32.0","0.0"),
        ("2026-11-02","P18","SPRINT","S15","32.0","0.0"),
        ("2026-11-09","P01","GESTAO","GESTAO","40.0","0.0"),("2026-11-09","P02","GESTAO","GESTAO","40.0","0.0"),
        ("2026-11-09","P09","ATIVIDADE","A27","25.0","3.5"),("2026-11-09","P09","ATIVIDADE","A29","15.0","2.0"),
        ("2026-11-09","P11","SPRINT","S15","40.0","0.0"),("2026-11-09","P12","SPRINT","S15","40.0","0.0"),
        ("2026-11-09","P13","SPRINT","S15","40.0","0.0"),("2026-11-09","P15","SPRINT","S15","40.0","0.0"),
        ("2026-11-09","P16","SPRINT","S15","40.0","0.0"),("2026-11-09","P17","SPRINT","S15","40.0","0.0"),
        ("2026-11-09","P18","SPRINT","S15","40.0","0.0"),
    ]
    for s, p, t, i, hn, he in b2:
        db["18_apontamento_horas"].append({"semana_inicio": s, "id_pessoa": p, "tipo_item": t, "id_item": i, "horas_normais": hn, "horas_extras": he})

    db["19_custos_realizados"].extend([
        {"id_lancamento": "L00118", "data": "2026-11-04", "frente": "PREDITIVA", "categoria_custo": "OUTROS", "id_atividade": "A27", "codigo_eap": "1.5.1", "id_contrato": "", "id_fornecedor": "", "documento": "NF-A27-001", "descricao": "Taxas, viagens e despesas — piloto", "valor_rs": "30975.96"},
        {"id_lancamento": "L00119", "data": "2026-11-07", "frente": "GESTAO", "categoria_custo": "INDIRETO", "id_atividade": "", "codigo_eap": "", "id_contrato": "", "id_fornecedor": "", "documento": "NF-GES-2611-45", "descricao": "Escritório do projeto, veículos e comunicação", "valor_rs": "8035.22"},
        {"id_lancamento": "L00120", "data": "2026-11-10", "frente": "AGIL", "categoria_custo": "LICENCAS_E_NUVEM", "id_atividade": "", "codigo_eap": "", "id_contrato": "CT02", "id_fornecedor": "F02", "documento": "NF-NUV-2611", "descricao": "Nuvem, licenças e ferramentas do time", "valor_rs": "44599.44"},
        {"id_lancamento": "L00121", "data": "2026-11-13", "frente": "GESTAO", "categoria_custo": "INDIRETO", "id_atividade": "", "codigo_eap": "", "id_contrato": "", "id_fornecedor": "", "documento": "NF-GES-2611-30", "descricao": "Seguros, taxas e auditorias", "valor_rs": "5256.75"},
    ])
    db["25_inspecoes_aceite"].extend([
        {"id_inspecao": "IN-056", "data": "2026-11-04", "id_atividade": "A29", "tipo_inspecao": "LISTA_DE_VERIFICACAO", "itens_verificados": "50", "itens_nao_conformes": "1", "resultado": "APROVADO", "id_fornecedor": "F09", "horas_retrabalho": "4.1", "custo_retrabalho_rs": "450.59"},
        {"id_inspecao": "IN-057", "data": "2026-11-04", "id_atividade": "A34", "tipo_inspecao": "LISTA_DE_VERIFICACAO", "itens_verificados": "38", "itens_nao_conformes": "0", "resultado": "APROVADO", "id_fornecedor": "", "horas_retrabalho": "0.0", "custo_retrabalho_rs": "0.00"},
        {"id_inspecao": "IN-058", "data": "2026-11-11", "id_atividade": "A27", "tipo_inspecao": "LISTA_DE_VERIFICACAO", "itens_verificados": "26", "itens_nao_conformes": "2", "resultado": "APROVADO_COM_RESSALVA", "id_fornecedor": "", "horas_retrabalho": "10.6", "custo_retrabalho_rs": "1527.91"},
    ])

    for s in db["15_sprints"]:
        if s["id_sprint"] == "S15":
            s["pessoas_dia_disponiveis"] = "27"
            s["horas_extras_autorizadas"] = "NAO"
            s["meta_da_sprint"] = "Avançar o épico Vistoria por foto"

    db["14_backlog_itens"].extend([
        {"id_item": "MS-230", "id_epico": "EP07", "tipo_item": "BUG", "titulo": "Corrigir falha em cupom de lançamento (1)", "historia_de_usuario": "", "pontos": "1", "prioridade_moscow": "MUST", "valor_de_negocio": "30", "ordem_no_backlog": "130", "id_release": "R2", "origem": "DEFEITO", "id_mudanca": "", "id_solicitante": "", "data_criacao": "2026-11-05", "status": "A_FAZER", "id_sprint_atual": "", "id_responsavel": "", "revisao_por_par": "", "data_inicio": "", "data_conclusao": ""},
        {"id_item": "MS-231", "id_epico": "EP07", "tipo_item": "BUG", "titulo": "Corrigir falha em cupom de lançamento (2)", "historia_de_usuario": "", "pontos": "1", "prioridade_moscow": "MUST", "valor_de_negocio": "30", "ordem_no_backlog": "131", "id_release": "R2", "origem": "DEFEITO", "id_mudanca": "", "id_solicitante": "", "data_criacao": "2026-11-05", "status": "EM_REVISAO", "id_sprint_atual": "S15", "id_responsavel": "P15", "revisao_por_par": "1", "data_inicio": "2026-11-13", "data_conclusao": ""},
        {"id_item": "MS-232", "id_epico": "EP07", "tipo_item": "BUG", "titulo": "Corrigir falha em cupom de lançamento (3)", "historia_de_usuario": "", "pontos": "1", "prioridade_moscow": "MUST", "valor_de_negocio": "20", "ordem_no_backlog": "132", "id_release": "R2", "origem": "DEFEITO", "id_mudanca": "", "id_solicitante": "", "data_criacao": "2026-11-05", "status": "A_FAZER", "id_sprint_atual": "", "id_responsavel": "", "revisao_por_par": "", "data_inicio": "", "data_conclusao": ""},
        {"id_item": "MS-233", "id_epico": "EP07", "tipo_item": "BUG", "titulo": "Corrigir falha em cupom de lançamento (4)", "historia_de_usuario": "", "pontos": "2", "prioridade_moscow": "MUST", "valor_de_negocio": "20", "ordem_no_backlog": "133", "id_release": "R2", "origem": "DEFEITO", "id_mudanca": "", "id_solicitante": "", "data_criacao": "2026-11-12", "status": "A_FAZER", "id_sprint_atual": "", "id_responsavel": "", "revisao_por_par": "", "data_inicio": "", "data_conclusao": ""},
        {"id_item": "MS-234", "id_epico": "EP07", "tipo_item": "BUG", "titulo": "Corrigir falha em cupom de lançamento (tela)", "historia_de_usuario": "", "pontos": "2", "prioridade_moscow": "MUST", "valor_de_negocio": "35", "ordem_no_backlog": "134", "id_release": "R2", "origem": "DEFEITO", "id_mudanca": "", "id_solicitante": "", "data_criacao": "2026-11-13", "status": "EM_ANDAMENTO", "id_sprint_atual": "S15", "id_responsavel": "P18", "revisao_por_par": "", "data_inicio": "2026-11-13", "data_conclusao": ""},
    ])
    db["24_defeitos"].extend([
        {"id_defeito": "DF-035", "id_item_defeito": "MS-230", "id_item_origem": "MS-222", "severidade": "MEDIA", "ambiente_detectado": "HOMOLOGACAO", "data_abertura": "2026-11-05", "data_resolucao": ""},
        {"id_defeito": "DF-036", "id_item_defeito": "MS-231", "id_item_origem": "MS-222", "severidade": "MEDIA", "ambiente_detectado": "HOMOLOGACAO", "data_abertura": "2026-11-05", "data_resolucao": ""},
        {"id_defeito": "DF-037", "id_item_defeito": "MS-232", "id_item_origem": "MS-222", "severidade": "BAIXA", "ambiente_detectado": "HOMOLOGACAO", "data_abertura": "2026-11-05", "data_resolucao": ""},
        {"id_defeito": "DF-038", "id_item_defeito": "MS-233", "id_item_origem": "MS-222", "severidade": "BAIXA", "ambiente_detectado": "TESTE", "data_abertura": "2026-11-12", "data_resolucao": ""},
        {"id_defeito": "DF-039", "id_item_defeito": "MS-234", "id_item_origem": "MS-222", "severidade": "MEDIA", "ambiente_detectado": "PRODUCAO", "data_abertura": "2026-11-13", "data_resolucao": ""},
    ])
    for iid, pts, orig, conc in [
        ("MS-158","3","TRANSBORDO","0"),("MS-223","1","TRANSBORDO","1"),("MS-224","8","TRANSBORDO","0"),
        ("MS-227","1","TRANSBORDO","1"),("MS-228","2","TRANSBORDO","1"),("MS-159","5","PLANEJAMENTO","1"),
        ("MS-160","8","PLANEJAMENTO","0"),("MS-161","3","PLANEJAMENTO","0"),("MS-231","1","ADICIONADO_DURANTE","0"),
        ("MS-234","2","ADICIONADO_DURANTE","0"),
    ]:
        db["20_sprint_itens"].append({"id_sprint": "S15", "id_item": iid, "pontos": pts, "origem_na_sprint": orig, "concluido_na_sprint": conc})

    b6 = [
        ("2026-11-03","MS-159","A_FAZER","EM_ANDAMENTO","P16"),("2026-11-03","MS-223","EM_REVISAO","EM_TESTE","P16"),
        ("2026-11-03","MS-223","EM_TESTE","CONCLUIDO","P17"),("2026-11-05","MS-158","EM_ANDAMENTO","EM_REVISAO","P18"),
        ("2026-11-05","MS-158","EM_REVISAO","EM_TESTE","P18"),("2026-11-05","MS-158","EM_TESTE","EM_ANDAMENTO","P17"),
        ("2026-11-06","MS-228","EM_ANDAMENTO","EM_REVISAO","P18"),("2026-11-09","MS-227","EM_ANDAMENTO","EM_REVISAO","P18"),
        ("2026-11-09","MS-227","EM_REVISAO","EM_TESTE","P18"),("2026-11-09","MS-228","EM_REVISAO","EM_TESTE","P18"),
        ("2026-11-09","MS-227","EM_TESTE","CONCLUIDO","P17"),("2026-11-09","MS-228","EM_TESTE","CONCLUIDO","P17"),
        ("2026-11-10","MS-159","EM_ANDAMENTO","EM_REVISAO","P16"),("2026-11-10","MS-158","EM_ANDAMENTO","EM_REVISAO","P18"),
        ("2026-11-11","MS-224","EM_ANDAMENTO","EM_REVISAO","P15"),("2026-11-11","MS-160","A_FAZER","EM_ANDAMENTO","P16"),
        ("2026-11-11","MS-161","A_FAZER","EM_ANDAMENTO","P18"),("2026-11-11","MS-158","EM_REVISAO","EM_TESTE","P18"),
        ("2026-11-11","MS-159","EM_REVISAO","EM_TESTE","P16"),("2026-11-11","MS-224","EM_REVISAO","EM_TESTE","P15"),
        ("2026-11-11","MS-158","EM_TESTE","EM_ANDAMENTO","P17"),("2026-11-12","MS-158","EM_ANDAMENTO","EM_REVISAO","P15"),
        ("2026-11-12","MS-158","EM_REVISAO","EM_TESTE","P15"),("2026-11-12","MS-159","EM_TESTE","CONCLUIDO","P17"),
        ("2026-11-13","MS-231","A_FAZER","EM_ANDAMENTO","P15"),("2026-11-13","MS-231","EM_ANDAMENTO","EM_REVISAO","P15"),
        ("2026-11-13","MS-234","A_FAZER","EM_ANDAMENTO","P18"),
    ]
    for idx, (d, iid, so, sd, p) in enumerate(b6, 453):
        db["21_itens_transicoes"].append({"id_transicao": f"TR-{idx:04d}", "id_item": iid, "data": d, "status_origem": so, "status_destino": sd, "id_pessoa": p})

    upd = {
        "MS-223": ("CONCLUIDO", None, "2026-11-03", "P17"),
        "MS-227": ("CONCLUIDO", None, "2026-11-09", "P17"),
        "MS-228": ("CONCLUIDO", None, "2026-11-09", "P17"),
        "MS-159": ("CONCLUIDO", "2026-11-03", "2026-11-12", "P17"),
        "MS-158": ("EM_TESTE", None, None, "P15"),
        "MS-224": ("EM_TESTE", None, None, "P15"),
        "MS-160": ("EM_ANDAMENTO", "2026-11-11", None, "P16"),
        "MS-161": ("EM_ANDAMENTO", "2026-11-11", None, "P18"),
    }
    for b in db["14_backlog_itens"]:
        if b["id_item"] in upd:
            st, di, dc, resp = upd[b["id_item"]]
            b["status"] = st
            b["id_sprint_atual"] = "S15"
            if di and not b["data_inicio"]:
                b["data_inicio"] = di
            if dc:
                b["data_conclusao"] = dc
            if resp:
                b["id_responsavel"] = resp

    db["22_impedimentos"].append({"id_impedimento": "IP-014", "id_item": "MS-161", "data_abertura": "2026-11-12", "data_fechamento": "", "tipo_impedimento": "AGUARDANDO_OUTRO_TIME", "dias_uteis_bloqueado": "", "id_pessoa": "P18"})
    for ip in db["22_impedimentos"]:
        if ip["id_impedimento"] == "IP-012":
            ip["data_fechamento"], ip["dias_uteis_bloqueado"] = "2026-11-06", "6"
        elif ip["id_impedimento"] == "IP-013":
            ip["data_fechamento"], ip["dias_uteis_bloqueado"] = "2026-11-06", "5"

    db["23_implantacoes"].extend([
        {"id_implantacao": "IMP-055", "data": "2026-11-03", "id_sprint": "S15", "ambiente": "HOMOLOGACAO", "versao": "1.55", "itens_implantados": "5", "tempo_ate_producao_h": "47.4", "falhou": "0", "tempo_restauracao_h": ""},
        {"id_implantacao": "IMP-056", "data": "2026-11-04", "id_sprint": "S15", "ambiente": "HOMOLOGACAO", "versao": "1.56", "itens_implantados": "5", "tempo_ate_producao_h": "21.2", "falhou": "0", "tempo_restauracao_h": ""},
        {"id_implantacao": "IMP-057", "data": "2026-11-04", "id_sprint": "S15", "ambiente": "PRODUCAO", "versao": "1.57", "itens_implantados": "3", "tempo_ate_producao_h": "20.1", "falhou": "0", "tempo_restauracao_h": ""},
        {"id_implantacao": "IMP-058", "data": "2026-11-05", "id_sprint": "S15", "ambiente": "HOMOLOGACAO", "versao": "1.58", "itens_implantados": "5", "tempo_ate_producao_h": "28.5", "falhou": "0", "tempo_restauracao_h": ""},
        {"id_implantacao": "IMP-059", "data": "2026-11-06", "id_sprint": "S15", "ambiente": "HOMOLOGACAO", "versao": "1.59", "itens_implantados": "1", "tempo_ate_producao_h": "15.0", "falhou": "0", "tempo_restauracao_h": ""},
        {"id_implantacao": "IMP-060", "data": "2026-11-06", "id_sprint": "S15", "ambiente": "PRODUCAO", "versao": "1.60", "itens_implantados": "4", "tempo_ate_producao_h": "31.4", "falhou": "0", "tempo_restauracao_h": ""},
        {"id_implantacao": "IMP-061", "data": "2026-11-11", "id_sprint": "S15", "ambiente": "PRODUCAO", "versao": "1.61", "itens_implantados": "3", "tempo_ate_producao_h": "50.2", "falhou": "0", "tempo_restauracao_h": ""},
    ])
    db["27_riscos_ocorrencias"].append({
        "id_ocorrencia": "OC-008", "data": "2026-11-09", "id_risco": "", "descricao": "Credencial exposta em repositório de código",
        "frente": "PREDITIVA", "id_atividade": "A27", "impacto_custo_real_rs": "2900.00", "impacto_prazo_real_du": "4", "custo_ja_incluido_em_pagamentos": "NAO"
    })
    db["33_reunioes"].extend([
        {"id_reuniao": "RE-087", "data": "2026-11-03", "tipo_reuniao": "PLANEJAMENTO_DA_SPRINT", "duracao_min": "120", "convidados": "8", "presentes": "8", "patrocinador_presente": "0", "decisoes_tomadas": "1", "pendencias_abertas": "0", "ata_publicada": "1"},
        {"id_reuniao": "RE-088", "data": "2026-11-03", "tipo_reuniao": "STATUS_SEMANAL", "duracao_min": "75", "convidados": "9", "presentes": "8", "patrocinador_presente": "0", "decisoes_tomadas": "1", "pendencias_abertas": "3", "ata_publicada": "0"},
        {"id_reuniao": "RE-089", "data": "2026-11-10", "tipo_reuniao": "STATUS_SEMANAL", "duracao_min": "90", "convidados": "11", "presentes": "9", "patrocinador_presente": "0", "decisoes_tomadas": "0", "pendencias_abertas": "5", "ata_publicada": "1"},
        {"id_reuniao": "RE-090", "data": "2026-11-12", "tipo_reuniao": "COMITE_DIRETOR", "duracao_min": "120", "convidados": "6", "presentes": "4", "patrocinador_presente": "1", "decisoes_tomadas": "3", "pendencias_abertas": "3", "ata_publicada": "1"},
        {"id_reuniao": "RE-091", "data": "2026-11-13", "tipo_reuniao": "RETROSPECTIVA", "duracao_min": "60", "convidados": "8", "presentes": "8", "patrocinador_presente": "0", "decisoes_tomadas": "1", "pendencias_abertas": "1", "ata_publicada": "1"},
        {"id_reuniao": "RE-092", "data": "2026-11-13", "tipo_reuniao": "REVISAO_DA_SPRINT", "duracao_min": "60", "convidados": "11", "presentes": "10", "patrocinador_presente": "0", "decisoes_tomadas": "0", "pendencias_abertas": "3", "ata_publicada": "1"},
    ])
    for pid, niv, sat, inter in [
        ("PI01","NEUTRO","6.0","1"),("PI02","RESISTENTE","2.7","0"),("PI03","APOIA","8.0","3"),
        ("PI04","LIDERA","8.7","5"),("PI05","APOIA","7.4","4"),("PI06","NEUTRO","5.1","3"),
        ("PI07","APOIA","7.9","5"),("PI08","APOIA","7.7","5"),("PI09","APOIA","6.6","4"),
        ("PI10","APOIA","8.0","4"),("PI11","NEUTRO","6.6","3"),("PI12","APOIA","8.2","4"),
        ("PI13","APOIA","7.4","2"),
    ]:
        db["34_engajamento_mensal"].append({"mes": "2026-11-01", "id_parte": pid, "nivel_engajamento": niv, "satisfacao": sat, "interacoes_no_mes": inter})
    db["35_pulso_equipe"].append({"id_sprint": "S15", "satisfacao_media": "3.94", "respostas": "6"})
    db["37_funil_piloto_semanal"].extend([
        {"semana_inicio": "2026-11-02", "alcance": "2256", "cadastros": "416", "ativados": "231", "ativos_na_semana": "1192", "retidos_4_semanas": "446", "receita_rs": "0.00", "indicacoes": "35", "nps": "46", "chamados_suporte": "46"},
        {"semana_inicio": "2026-11-09", "alcance": "2289", "cadastros": "424", "ativados": "245", "ativos_na_semana": "1192", "retidos_4_semanas": "531", "receita_rs": "0.00", "indicacoes": "31", "nps": "55", "chamados_suporte": "48"},
    ])
    return db


def compute_all_metrics(db, status_date="2026-11-13"):
    params = {r["parametro"]: r["valor"] for r in db["01_projeto_parametros"]}
    cal = sorted(db["11_calendario"], key=lambda x: x["data"])
    du_to_date = {int(r["dia_util_projeto"]): r["data"] for r in cal if r["dia_util_projeto"]}

    def last_du(dstr):
        for r in reversed(cal):
            if r["data"] <= dstr and r["dia_util_projeto"]:
                return int(r["dia_util_projeto"])
        return 1

    def next_du(dstr):
        for r in cal:
            if r["data"] >= dstr and r["dia_util_projeto"]:
                return int(r["dia_util_projeto"])
        return len(cal)

    def count_du(a, b):
        return sum(1 for r in cal if a <= r["data"] <= b and r["dia_util"] == "1")

    def cal_days(a, b):
        return (datetime.strptime(b[:10], "%Y-%m-%d") - datetime.strptime(a[:10], "%Y-%m-%d")).days

    status_du = last_du(status_date)
    contratual_du = last_du(params["data_termino_contratual"])
    fator_he = float(params["fator_hora_extra"])
    tma = float(params["taxa_minima_de_atratividade_aa"])
    custo_atraso_du = float(params["custo_do_atraso_por_du_rs"])
    eq_cost = {p["id_pessoa"]: float(p["custo_hora_rs"]) for p in db["04_equipe"]}

    # Orçamento por atividade
    orc_act = defaultdict(float)
    for r in db["09_orcamento_linha_de_base"]:
        orc_act[r["id_atividade"]] += float(r["valor_orcado_rs"])

    # Agile metrics
    sprints = sorted(db["15_sprints"], key=lambda s: int(s["numero"]))
    sp_vel = []
    for s in sprints:
        if s["data_fim"] <= status_date:
            items = [x for x in db["20_sprint_itens"] if x["id_sprint"] == s["id_sprint"]]
            pts_plan = sum(int(x["pontos"]) for x in items)
            pts_done = sum(int(x["pontos"]) for x in items if x["concluido_na_sprint"] == "1")
            sp_vel.append({"id": s["id_sprint"], "num": int(s["numero"]), "ini": s["data_inicio"], "fim": s["data_fim"], "plan": pts_plan, "done": pts_done})
    vel_media = sum(x["done"] for x in sp_vel[-5:]) / 5.0

    def agile_forecast(backlog_rows, recs=None):
        active = [b for b in backlog_rows if b["prioridade_moscow"] != "WONT"]
        is_done = lambda b: b["status"] == "CONCLUIDO" and (not b.get("data_conclusao") or b["data_conclusao"] <= status_date)
        rem_r2 = sum(int(b["pontos"]) for b in active if not is_done(b) and b["id_release"] in ("R1", "R2"))
        rem_r3 = sum(int(b["pontos"]) for b in active if not is_done(b) and b["id_release"] in ("R1", "R2", "R3"))

        def sp_need(pts):
            if pts <= 0:
                return 0
            if not recs:
                return math.ceil(pts / vel_media)
            done, sp = 0.0, 0
            while done < pts - 1e-9:
                sp += 1
                v = vel_media
                for r in recs:
                    if sp > int(r["sprints_de_rampa"]):
                        v += int(r["quantidade"]) * float(r["ganho_velocidade_pontos_por_sprint"])
                done += v
            return sp

        sr2, sr3 = sp_need(rem_r2), sp_need(rem_r3)
        sp_map = {int(s["numero"]): s["data_fim"] for s in sprints}
        def end_of(off):
            n = 15 + off
            d = sp_map[n] if n in sp_map else add_days("2026-11-13", off * 14)
            return d, last_du(d)
        r2_d, r2_du = end_of(sr2)
        r3_d, r3_du = end_of(sr3)
        return {"rem_r2": rem_r2, "rem_r3": rem_r3, "sr2": sr2, "sr3": sr3, "r2_d": r2_d, "r2_du": r2_du, "r3_d": r3_d, "r3_du": r3_du}

    ag_base = agile_forecast(db["14_backlog_itens"])

    # Network CPM (LB & Forecast)
    latest_av = {}
    for r in db["17_avanco_semanal"]:
        if r["semana_fim"] <= status_date:
            aid = r["id_atividade"]
            if aid not in latest_av or r["semana_fim"] >= latest_av[aid]["semana_fim"]:
                latest_av[aid] = r

    def run_network(af, act_mods=None):
        nodes = {}
        for a in db["07_atividades"]:
            aid = a["id_atividade"]
            if a["tipo_atividade"] == "ESTIMADA":
                o, m, p = int(a["duracao_otimista_du"]), int(a["duracao_mais_provavel_du"]), int(a["duracao_pessimista_du"])
                dur = math.ceil((o + 4 * m + p) / 6)
                sig = (p - o) / 6.0
            else:
                o = m = p = 0
                dur = int(a["duracao_fixa_du"])
                sig = 0.0
            nodes[aid] = {"id": aid, "nome": a["nome_atividade"], "eap": a["codigo_eap"], "disc": a["disciplina"], "tipo": a["tipo_atividade"], "o": o, "m": m, "p": p, "dur_lb": dur, "sigma": sig}

        preds = defaultdict(list)
        for d in db["08_dependencias"]:
            preds[d["id_sucessora"]].append((d["id_predecessora"], d["tipo_dependencia"], int(d["defasagem_du"])))

        # Baseline
        def topo_sort(nids, pmap):
            succs = defaultdict(list)
            indeg = {u: len(pmap[u]) for u in nids}
            for u in nids:
                for pr, _, _ in pmap[u]:
                    succs[pr].append(u)
            q = [u for u in nids if indeg[u] == 0]
            order = []
            while q:
                u = q.pop(0)
                order.append(u)
                for v in succs[u]:
                    indeg[v] -= 1
                    if indeg[v] == 0:
                        q.append(v)
            return order, succs

        lb_order, lb_succs = topo_sort(list(nodes.keys()), preds)
        es_lb, ef_lb = {}, {}
        for u in lb_order:
            s = 1
            for pr, t, lag in preds[u]:
                s = max(s, ef_lb[pr] + 1 + lag if t == "TI" else es_lb[pr] + lag)
            es_lb[u] = s
            ef_lb[u] = s + nodes[u]["dur_lb"] - 1
        dur_lb_proj = max(ef_lb.values())
        ls_lb, lf_lb = {}, {}
        for u in reversed(lb_order):
            f = dur_lb_proj
            for v in lb_succs[u]:
                for pr, t, lag in preds[v]:
                    if pr == u:
                        f = min(f, ls_lb[v] - 1 - lag if t == "TI" else ls_lb[v] - lag + nodes[u]["dur_lb"] - 1)
            lf_lb[u] = f
            ls_lb[u] = f - nodes[u]["dur_lb"] + 1
        crit_lb = [u for u in lb_order if ls_lb[u] == es_lb[u]]

        # Forecast with optional mods
        fnodes = dict(nodes)
        fpreds = defaultdict(list, {k: list(v) for k, v in preds.items()})
        excl, alt_dur = set(), {}
        for mod in (act_mods or []):
            aid = mod["id_atividade"]
            if mod["acao"] == "EXCLUIR":
                excl.add(aid)
                alt_dur[aid] = 0
            elif mod["acao"] == "ALTERAR_DURACAO":
                alt_dur[aid] = int(mod["duracao_du"])
            elif mod["acao"] == "INCLUIR":
                d = int(mod["duracao_du"])
                fnodes[aid] = {"id": aid, "nome": mod["nome_atividade"], "eap": "CENARIO", "disc": mod["disciplina"], "tipo": "ESTIMADA", "o": d, "m": d, "p": d, "dur_lb": d, "sigma": 0.0}
                if mod["predecessoras"]:
                    for item in mod["predecessoras"].split(";"):
                        pr, tp, lg = item.split(":")
                        fpreds[aid].append((pr, tp, int(lg)))
                if mod["sucessoras"]:
                    for item in mod["sucessoras"].split(";"):
                        sc, tp, lg = item.split(":")
                        fpreds[sc].append((aid, tp, int(lg)))

        forder, fsuccs = topo_sort(list(fnodes.keys()), fpreds)
        fes, fef, fdur = {}, {}, {}
        for u in forder:
            nd = fnodes[u]
            av = latest_av.get(u)
            if u in excl:
                s = status_du + 1
                for pr, t, lag in fpreds[u]:
                    s = max(s, fef[pr] + 1 + lag if t == "TI" else fes[pr] + lag)
                fes[u], fef[u], fdur[u] = s, s - 1, 0
            elif av and av["situacao"] == "CONCLUIDA":
                fes[u] = next_du(av["data_inicio_real"])
                fef[u] = last_du(av["data_termino_real"])
                fdur[u] = max(1, fef[u] - fes[u] + 1)
            elif nd["tipo"] == "MARCO_AGIL":
                fes[u] = next_du(av["data_inicio_real"]) if av and av["data_inicio_real"] else es_lb.get(u, 40)
                fef[u] = last_du("2026-07-10") if u == "A40" else (af["r2_du"] if u == "A41" else af["r3_du"])
                fdur[u] = max(1, fef[u] - fes[u] + 1)
            elif av and float(av["avanco_acumulado_pct"]) > 0:
                rem = math.ceil(nd["dur_lb"] * (1.0 - float(av["avanco_acumulado_pct"]) / 100.0))
                if u in alt_dur:
                    rem = max(1, rem - (nd["dur_lb"] - alt_dur[u]))
                fes[u] = next_du(av["data_inicio_real"]) if av["data_inicio_real"] else status_du
                fef[u] = status_du + rem
                fdur[u] = max(1, fef[u] - fes[u] + 1)
            else:
                dur = alt_dur.get(u, nd["dur_lb"])
                s = status_du + 1
                for pr, t, lag in fpreds[u]:
                    s = max(s, fef[pr] + 1 + lag if t == "TI" else fes[pr] + lag)
                fes[u], fef[u], fdur[u] = s, s + dur - 1, dur

        fend_du = max(fef.values())
        fls, flf = {}, {}
        for u in reversed(forder):
            f = fend_du
            for v in fsuccs[u]:
                for pr, t, lag in fpreds[v]:
                    if pr == u:
                        f = min(f, fls[v] - 1 - lag if t == "TI" else fls[v] - lag + fdur[u] - 1)
            flf[u] = f
            fls[u] = f - fdur[u] + 1
        crit_f = [u for u in forder if u not in excl and not (latest_av.get(u) and latest_av[u]["situacao"] == "CONCLUIDA") and fls[u] == fes[u]]

        acts_out = []
        for u in forder:
            nd = fnodes[u]
            av = latest_av.get(u)
            acts_out.append({
                **nd,
                "es_lb": es_lb.get(u, fes[u]), "ef_lb": ef_lb.get(u, fef[u]),
                "ls_lb": ls_lb.get(u, fls[u]), "lf_lb": lf_lb.get(u, flf[u]),
                "folga_lb": ls_lb.get(u, fls[u]) - es_lb.get(u, fes[u]),
                "crit_lb": u in crit_lb,
                "avanco": float(av["avanco_acumulado_pct"]) if av else 0.0,
                "situacao": "EXCLUIDA" if u in excl else (av["situacao"] if av else "NAO_INICIADA"),
                "fes": fes[u], "fef": fef[u], "fls": fls[u], "flf": flf[u],
                "crit_f": u in crit_f,
                "f_end_date": du_to_date.get(fef[u], ""),
                "lb_end_date": du_to_date.get(ef_lb.get(u, fef[u]), ""),
                "orc": orc_act.get(u, 0.0),
            })

        return {
            "acts": acts_out, "dur_lb": dur_lb_proj, "end_lb": du_to_date[dur_lb_proj],
            "crit_lb": crit_lb, "fend_du": fend_du, "fend_date": du_to_date[fend_du],
            "crit_f": crit_f, "delay_du": max(0, fend_du - contratual_du),
        }

    net = run_network(ag_base)

    # EVM helper
    def eval_evm(dstr):
        du = last_du(dstr)
        lav = {}
        for r in db["17_avanco_semanal"]:
            if r["semana_fim"] <= dstr:
                aid = r["id_atividade"]
                if aid not in lav or r["semana_fim"] >= lav[aid][0]:
                    lav[aid] = (r["semana_fim"], float(r["avanco_acumulado_pct"]))
        ont_p = vp_p = va_p = 0.0
        for a in net["acts"]:
            if a["tipo"] == "MARCO_AGIL" or a["eap"] == "CENARIO":
                continue
            b = a["orc"]
            ont_p += b
            if du >= a["ef_lb"]:
                vp_p += b
            elif du >= a["es_lb"]:
                vp_p += b * (du - a["es_lb"] + 1) / a["dur_lb"]
            va_p += b * (lav[a["id"]][1] / 100.0 if a["id"] in lav else 0.0)
        plan_sp = [s for s in sprints if s["planejada_na_linha_de_base"] == "1"]
        ont_a = sum(float(s["orcamento_sprint_rs"]) for s in plan_sp)
        vp_a = 0.0
        for s in plan_sp:
            if s["data_fim"] <= dstr:
                vp_a += float(s["orcamento_sprint_rs"])
            elif s["data_inicio"] <= dstr:
                vp_a += float(s["orcamento_sprint_rs"]) * min(1.0, count_du(s["data_inicio"], dstr) / max(1, int(s["dias_uteis"])))
        lb_b = [b for b in db["14_backlog_itens"] if b["origem"] == "PLANO_INICIAL" and b["prioridade_moscow"] != "WONT"]
        pts_t = sum(int(b["pontos"]) for b in lb_b)
        pts_d = sum(int(b["pontos"]) for b in lb_b if b["status"] == "CONCLUIDO" and b["data_conclusao"] and b["data_conclusao"] <= dstr)
        va_a = ont_a * (pts_d / pts_t) if pts_t else 0.0
        cr_p = sum(float(c["valor_rs"]) for c in db["19_custos_realizados"] if c["frente"] == "PREDITIVA" and c["data"] <= dstr)
        cr_a = sum(float(c["valor_rs"]) for c in db["19_custos_realizados"] if c["frente"] == "AGIL" and c["data"] <= dstr)
        cr_g = sum(float(c["valor_rs"]) for c in db["19_custos_realizados"] if c["frente"] == "GESTAO" and c["data"] <= dstr)
        for h in db["18_apontamento_horas"]:
            if add_days(h["semana_inicio"], 4) <= dstr:
                c = (float(h["horas_normais"]) + float(h["horas_extras"]) * fator_he) * eq_cost[h["id_pessoa"]]
                if h["tipo_item"] == "ATIVIDADE":
                    cr_p += c
                elif h["tipo_item"] == "SPRINT":
                    cr_a += c
                elif h["tipo_item"] == "GESTAO":
                    cr_g += c
        ont, vp, va, cr = ont_p + ont_a, vp_p + vp_a, va_p + va_a, cr_p + cr_a
        idp = va / vp if vp else 0.0
        idc = va / cr if cr else 0.0
        ent = ont / idc if idc else ont
        idpt = (ont - va) / (ont - cr) if (ont - cr) else 0.0
        return {"ont_p": ont_p, "ont_a": ont_a, "ont": ont, "vp_p": vp_p, "vp_a": vp_a, "vp": vp, "va_p": va_p, "va_a": va_a, "va": va, "cr_p": cr_p, "cr_a": cr_a, "cr_g": cr_g, "cr": cr, "idp": idp, "idc": idc, "ent": ent, "idpt": idpt, "idp_p": va_p / vp_p if vp_p else 0, "idc_p": va_p / cr_p if cr_p else 0, "idp_a": va_a / vp_a if vp_a else 0, "idc_a": va_a / cr_a if cr_a else 0}

    evm_1113 = eval_evm("2026-11-13")
    evm_0925 = eval_evm("2026-09-25")
    curva_dates = ["2026-02-28","2026-03-31","2026-04-30","2026-05-31","2026-06-30","2026-07-31","2026-08-31","2026-09-25","2026-10-30","2026-11-13"]
    curva_s = [{"data": d, "label": f_date(d)[:5], **eval_evm(d)} for d in curva_dates]

    # Scenarios (C1..C6 + combos)
    pts_done_all = sum(int(b["pontos"]) for b in db["14_backlog_itens"] if b["status"] == "CONCLUIDO")
    custo_pt = evm_1113["cr_a"] / pts_done_all

    def sim_scen(ids):
        sel = [c for c in db["43_cenarios"] if c["id_cenario"] in ids]
        amods = [a for a in db["44_cenario_atividades"] if a["id_cenario"] in ids]
        bmods = [b for b in db["45_cenario_backlog"] if b["id_cenario"] in ids]
        rmods = [r for r in db["46_cenario_recursos"] if r["id_cenario"] in ids]
        excl_b = {b["id_item"] for b in bmods if b["acao"] == "EXCLUIR"}
        incl_b = [b for b in bmods if b["acao"] == "INCLUIR"]
        bmod_list = [b for b in db["14_backlog_itens"] if b["id_item"] not in excl_b] + [
            {"id_item": x["id_item"], "pontos": x["pontos"], "prioridade_moscow": "MUST", "id_release": x["id_release"], "status": "A_FAZER", "data_conclusao": ""} for x in incl_b
        ]
        af = agile_forecast(bmod_list, rmods)
        sn = run_network(af, amods)
        c44 = sum(float(a["custo_adicional_rs"]) for a in amods)
        pi = sum(int(x["pontos"]) for x in incl_b)
        pe = sum(int(b["pontos"]) for b in db["14_backlog_itens"] if b["id_item"] in excl_b)
        crec = sum(int(r["quantidade"]) * float(r["custo_mensal_rs"]) * int(r["meses"]) for r in rmods)
        iadd = sum(float(c["investimento_adicional_rs"]) for c in sel)
        ent_c = evm_1113["ent"] + c44 + (pi - pe) * custo_pt + crec + iadd
        catraso = sn["delay_du"] * custo_atraso_du
        vben = sum(float(c["variacao_beneficio_pct"]) for c in sel) / 100.0
        vcop = sum(float(c["variacao_custo_operacional_anual_rs"]) for c in sel)
        cdays = max(0, cal_days(net["end_lb"], sn["fend_date"]))
        meses = cdays / 30.4
        cant = next((c for c in sel if float(c["parcela_beneficio_antecipada_pct"]) > 0 and c["id_atividade_gatilho"]), None)
        if cant:
            gat = next((a for a in sn["acts"] if a["id"] == cant["id_atividade_gatilho"]), None)
            if gat:
                p_ant = float(cant["parcela_beneficio_antecipada_pct"]) / 100.0
                meses = p_ant * (max(0, cal_days(net["end_lb"], gat["f_end_date"])) / 30.4) + (1 - p_ant) * (cdays / 30.4)
        acum = vpl = 0.0
        fluxo = []
        for row in db["02_caso_de_negocio"]:
            ano = int(row["ano"])
            inv = float(row["investimento_rs"]) + (ent_c - evm_1113["ont"] if ano == 0 else 0.0)
            ben = float(row["beneficio_bruto_rs"]) * (1 + vben)
            cop = float(row["custo_operacional_rs"]) + (vcop if ano >= 1 else 0.0)
            fl = ben - cop - inv
            if ano == 1:
                fl = fl * max(0.0, 1.0 - meses / 12.0)
            acum += fl
            vpl += fl / ((1 + tma) ** ano)
            fluxo.append({"ano": ano, "inv": inv, "ben": ben, "cop": cop, "fl": fl, "acum": acum})
        payback = None
        for i in range(1, len(fluxo)):
            if fluxo[i - 1]["acum"] < 0 <= fluxo[i]["acum"]:
                payback = fluxo[i - 1]["ano"] + abs(fluxo[i - 1]["acum"]) / max(1.0, fluxo[i]["fl"])
                break
        return {
            "id": "+".join(ids), "nome": " + ".join(f"{s['id_cenario']} ({s['nome_cenario']})" for s in sel),
            "end_date": sn["fend_date"], "delay_du": sn["delay_du"], "meses": meses,
            "ent": ent_c, "catraso": catraso, "vpl": vpl, "payback": payback,
            "resultado": vpl - catraso, "fluxo": fluxo, "crit": sn["crit_f"],
        }

    scens = [sim_scen(c) for c in [["C1"],["C2"],["C3"],["C4"],["C5"],["C6"],["C2","C4"],["C2","C6"],["C2","C3"],["C2","C5"],["C2","C3","C6"],["C2","C5","C6"]]]

    # People & Productivity
    folha_map = {f["id_pessoa"]: f for f in db["39_cargos_salarios"]}
    pts_dev = defaultdict(int)
    for b in db["14_backlog_itens"]:
        if b["status"] == "CONCLUIDO" and b["id_responsavel"]:
            pts_dev[b["id_responsavel"]] += int(b["pontos"])
    people = []
    for p in db["04_equipe"]:
        pid = p["id_pessoa"]
        f = folha_map[pid]
        enc = float(f["encargos_pct"])
        enc = enc / 100.0 if enc > 1 else enc
        cm = float(f["remuneracao_mensal_rs"]) * (1 + enc) + float(f["beneficios_mensais_rs"])
        ch = float(p["custo_hora_rs"])
        ph = [h for h in db["18_apontamento_horas"] if h["id_pessoa"] == pid]
        hn = sum(float(h["horas_normais"]) for h in ph)
        he = sum(float(h["horas_extras"]) for h in ph)
        cproj = (hn + he * fator_he) * ch
        h_sp = sum(float(h["horas_normais"]) + float(h["horas_extras"]) for h in ph if h["tipo_item"] == "SPRINT")
        c_sp = sum((float(h["horas_normais"]) + float(h["horas_extras"]) * fator_he) * ch for h in ph if h["tipo_item"] == "SPRINT")
        # Monthly plan vs actual
        hm_ap = defaultdict(float)
        for h in ph:
            hm_ap[h["semana_inicio"][:7]] += float(h["horas_normais"]) + float(h["horas_extras"])
        hm_pl = {a["mes"][:7]: float(a["horas_planejadas"]) for a in db["40_alocacao_planejada"] if a["id_pessoa"] == pid}
        # Reajuste Conv 19 (closed months <= 2026-10)
        closed_yms = sorted(y for y in set(hm_ap.keys()) | set(hm_pl.keys()) if y <= "2026-10")
        last3 = closed_yms[-3:]
        avg3 = sum(hm_ap[y] for y in last3) / len(last3) if last3 else 0.0
        reaj_rs = 0.0
        if f["mes_do_reajuste"] and float(f["reajuste_previsto_pct"]) > 0:
            rp = float(f["reajuste_previsto_pct"])
            rp = rp / 100.0 if rp > 1 else rp
            sym = max(f["mes_do_reajuste"][:7], "2026-12")
            eym = net["fend_date"][:7]
            if sym <= eym and (not p["data_saida"] or p["data_saida"][:7] >= sym):
                sy, sm = map(int, sym.split("-"))
                ey, em = map(int, eym.split("-"))
                reaj_rs = avg3 * max(0, (ey - sy) * 12 + (em - sm) + 1) * ch * rp
        pts = pts_dev[pid]
        people.append({
            "id": pid, "nome": p["nome"], "papel": p["papel"], "frente": p["frente"], "vinculo": p["vinculo"],
            "cm": cm, "ch": ch, "hn": hn, "he": he, "ht": hn + he, "cproj": cproj, "reaj_rs": reaj_rs,
            "pts": pts, "pts_h": pts / h_sp if (pts and h_sp) else None, "rs_pt": c_sp / pts if (pts and c_sp) else None,
            "hm_ap": hm_ap, "hm_pl": hm_pl,
        })

    # Productivity tab 41 & 42
    forn_map = {f["id_fornecedor"]: f["nome"] for f in db["29_fornecedores"]}
    cont_map = {c["id_contrato"]: c for c in db["30_contratos"]}
    sup_prod = []
    for ref in db["41_produtividade_referencia"]:
        rows = sorted([x for x in db["42_producao_semanal"] if x["id_atividade"] == ref["id_atividade"]], key=lambda x: x["semana_fim"])
        q_ex = sum(float(x["quantidade_executada"]) for x in rows)
        hh = sum(float(x["hh_trabalhadas"]) for x in rows)
        ef = sum(float(x["efetivo_medio"]) for x in rows) / len(rows) if rows else 0.0
        ef3 = sum(float(x["efetivo_medio"]) for x in rows[-3:]) / len(rows[-3:]) if rows else 0.0
        pr = q_ex / hh if hh else 0.0
        pp = float(ref["produtividade_planejada"])
        ep = float(ref["equipe_planejada_pessoas"])
        ip = pr / pp if pp else 0.0
        ie = ef / ep if ep else 0.0
        q_rem = max(0.0, float(ref["quantidade_total"]) - q_ex)
        drem = 0 if q_rem <= 0 else math.ceil(q_rem / (pr * ef3 * 8)) if (pr * ef3 > 0) else 0
        c = cont_map.get(ref["id_contrato"])
        sup_prod.append({
            "id": ref["id_atividade"], "servico": ref["servico"], "un": ref["unidade"],
            "forn": forn_map.get(c["id_fornecedor"], "Interno") if c else "Interno",
            "qt": float(ref["quantidade_total"]), "qex": q_ex, "hh": hh, "pp": pp, "pr": pr,
            "ip": ip, "ep": ep, "ef": ef, "ie": ie, "drem": drem,
        })

    # Procurement / Proposals (Conv 15) & Fines (Conv 14)
    props = db["32_propostas_fornecedores"]
    min_p = min(float(p["preco_rs"]) for p in props)
    min_d = min(float(p["prazo_du"]) for p in props)
    max_e = max(float(p["projetos_similares"]) for p in props)
    max_g = max(float(p["garantia_meses"]) for p in props)
    props_eval = []
    for p in props:
        nota = (
            float(params["peso_criterio_preco"]) * (min_p / float(p["preco_rs"]))
            + float(params["peso_criterio_tecnica"]) * (float(p["nota_tecnica"]) / 10.0)
            + float(params["peso_criterio_prazo"]) * (min_d / float(p["prazo_du"]))
            + float(params["peso_criterio_experiencia"]) * (float(p["projetos_similares"]) / max_e)
            + float(params["peso_criterio_garantia"]) * (float(p["garantia_meses"]) / max_g)
        )
        reprov = sum(1 for i in db["25_inspecoes_aceite"] if i["id_fornecedor"] == p["id_fornecedor"] and i["resultado"] == "REPROVADO")
        props_eval.append({**p, "forn": forn_map.get(p["id_fornecedor"], p["id_fornecedor"]), "nota": nota * 10, "reprov": reprov})
    props_eval.sort(key=lambda x: -x["nota"])

    return {
        "params": params, "net": net, "evm_1113": evm_1113, "evm_0925": evm_0925,
        "curva_s": curva_s, "sp_vel": sp_vel, "vel_media": vel_media, "ag_base": ag_base,
        "scens": scens, "people": people, "sup_prod": sup_prod, "props_eval": props_eval,
        "custo_pt": custo_pt, "cal_helpers": {"count_du": count_du, "cal_days": cal_days},
    }


def generate_charts(db, m):
    charts = {}

    # 1. D1: Caso de Negócio (Fluxo de caixa anual)
    fig, ax = plt.subplots(figsize=(7.5, 3.1))
    anos = [int(r["ano"]) for r in db["02_caso_de_negocio"]]
    fls = [(float(r["beneficio_bruto_rs"]) - float(r["custo_operacional_rs"]) - float(r["investimento_rs"])) / 1000 for r in db["02_caso_de_negocio"]]
    acum = np.cumsum(fls)
    colors = [CORAL if v < 0 else TEAL for v in fls]
    ax.bar(anos, fls, color=colors, width=0.55, label="Fluxo Líquido Anual (R$ mil)")
    ax.plot(anos, acum, color=NAVY, marker="o", linewidth=2.2, label="Fluxo Acumulado (R$ mil)")
    ax.axhline(0, color="#94A3B8", linewidth=0.9)
    ax.set_title("Caso de Negócio Aprovado — Fluxo de Caixa (R$ mil)", fontsize=10, fontweight="bold", color=NAVY)
    ax.set_xlabel("Ano (0 = Implantação)", fontsize=8.5, color=MUTED)
    ax.grid(axis="y", color=GRID_COLOR, linestyle="--", linewidth=0.6)
    ax.legend(fontsize=8, frameon=False)
    charts["d1_cashflow"] = fig_to_data_uri(fig)

    # 2. D2: Matriz Poder x Interesse
    fig, ax = plt.subplots(figsize=(6.8, 3.6))
    ax.axvline(3.5, color=NAVY, linestyle="--", linewidth=1, alpha=0.5)
    ax.axhline(3.5, color=NAVY, linestyle="--", linewidth=1, alpha=0.5)
    ax.fill_between([3.5, 5.5], 3.5, 5.5, color=TEAL, alpha=0.08)
    offsets = defaultdict(int)
    for pi in db["03_partes_interessadas"]:
        x, y = int(pi["interesse"]), int(pi["poder"])
        k = (x, y)
        dy = offsets[k] * 0.24 - 0.1
        offsets[k] += 1
        col = CORAL if pi["id_parte"] == "PI02" else (TEAL if x >= 4 and y >= 4 else NAVY)
        ax.scatter(x, y + dy, s=65, color=col, zorder=4)
        ax.text(x + 0.09, y + dy, pi["id_parte"], fontsize=8, fontweight="bold", color=col, va="center")
    ax.set_xlim(0.5, 5.6)
    ax.set_ylim(0.5, 5.6)
    ax.set_xlabel("Interesse (1 a 5)", fontsize=8.5, color=MUTED)
    ax.set_ylabel("Poder (1 a 5)", fontsize=8.5, color=MUTED)
    ax.set_title("Matriz Poder × Interesse das Partes Interessadas", fontsize=10, fontweight="bold", color=NAVY)
    ax.text(4.5, 5.3, "GERENCIAR DE PERTO", fontsize=7.5, fontweight="bold", color=TEAL, ha="center")
    ax.text(2.0, 5.3, "MANTER SATISFEITO", fontsize=7.5, fontweight="bold", color=NAVY, ha="center")
    ax.text(4.5, 0.7, "MANTER INFORMADO", fontsize=7.5, fontweight="bold", color=MUTED, ha="center")
    ax.text(2.0, 0.7, "MONITORAR", fontsize=7.5, fontweight="bold", color=MUTED, ha="center")
    ax.grid(color=GRID_COLOR, linestyle=":", linewidth=0.6)
    charts["d2_pi"] = fig_to_data_uri(fig)

    # 3. D5: Curva S da Trilha Ágil (VP Ágil, VA Ágil, CR Ágil)
    fig, ax = plt.subplots(figsize=(7.5, 2.85))
    xs = [c["label"] for c in m["curva_s"]]
    ax.plot(xs, [c["vp_a"] / 1000 for c in m["curva_s"]], color=NAVY, marker="o", lw=2.2, label="VP Ágil (Planejado)")
    ax.plot(xs, [c["va_a"] / 1000 for c in m["curva_s"]], color=TEAL, marker="s", lw=2.4, label="VA Ágil (Valor Agregado)")
    ax.plot(xs, [c["cr_a"] / 1000 for c in m["curva_s"]], color=CORAL, marker="^", lw=2.2, label="CR Ágil (Custo Real)")
    ax.set_title("Curva S da Trilha Ágil — VP, VA e Custo Real Acumulado (R$ mil)", fontsize=10, fontweight="bold", color=NAVY)
    ax.grid(axis="y", color=GRID_COLOR, linestyle="--", linewidth=0.6)
    ax.legend(fontsize=8, frameon=False)
    charts["d5_curva_s"] = fig_to_data_uri(fig)

    # 4. D6: Histograma do Squad Ágil (P15 e P16)
    fig, axes = plt.subplots(1, 2, figsize=(8.0, 2.9))
    for ax, pid, title in [(axes[0], "P15", "P15 Kleber Nascimento (Dev)"), (axes[1], "P16", "P16 Sílvia Moreira (Dev)")]:
        p = next(x for x in m["people"] if x["id"] == pid)
        yms = sorted(y for y in set(p["hm_ap"].keys()) | set(p["hm_pl"].keys()) if y <= "2026-10")
        x = np.arange(len(yms))
        w = 0.36
        ax.bar(x - w / 2, [p["hm_pl"].get(y, 0) for y in yms], w, color=NAVY, alpha=0.8, label="Planejado")
        ax.bar(x + w / 2, [p["hm_ap"].get(y, 0) for y in yms], w, color=TEAL, label="Apontado")
        ax.set_xticks(x)
        ax.set_xticklabels([y[5:] + "/26" for y in yms], fontsize=7.5)
        ax.set_title(title, fontsize=9, fontweight="bold", color=NAVY)
        ax.grid(axis="y", color=GRID_COLOR, linestyle="--", linewidth=0.6)
        ax.legend(fontsize=7.5, frameon=False)
    charts["d6_hist"] = fig_to_data_uri(fig)

    # 5. D8: Velocidade das Sprints + Pulso
    fig, axes = plt.subplots(1, 2, figsize=(8.2, 3.0))
    sps = [x["id"] for x in m["sp_vel"]]
    x = np.arange(len(sps))
    axes[0].bar(x, [x_["done"] for x_ in m["sp_vel"]], color=TEAL, width=0.6, label="Entregue (pts)")
    axes[0].axhline(17.3, color=NAVY, linestyle="--", lw=1.2, label="Meta LB (17,3)")
    axes[0].axhline(m["vel_media"], color=SAND, linestyle="-", lw=1.5, label=f"Média 5 últ. ({m['vel_media']:.1f})")
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(sps, fontsize=7, rotation=45)
    axes[0].set_title("Velocidade por Sprint (S01–S15)", fontsize=9, fontweight="bold", color=NAVY)
    axes[0].legend(fontsize=7, frameon=False)
    axes[0].grid(axis="y", color=GRID_COLOR, linestyle="--", lw=0.6)

    pulso = db["35_pulso_equipe"]
    axes[1].plot([p["id_sprint"] for p in pulso], [float(p["satisfacao_media"]) for p in pulso], color=NAVY, marker="o", lw=2)
    axes[1].set_ylim(2.5, 4.8)
    axes[1].tick_params(axis="x", labelsize=7, rotation=45)
    axes[1].set_title("Pulso da Equipe Ágil (1 a 5)", fontsize=9, fontweight="bold", color=NAVY)
    axes[1].grid(axis="y", color=GRID_COLOR, linestyle="--", lw=0.6)
    charts["d8_agile"] = fig_to_data_uri(fig)

    # 6. D9: Matriz de Riscos 5x5 + VME vs Reserva
    fig, axes = plt.subplots(1, 2, figsize=(8.0, 3.1), gridspec_kw={"width_ratios": [1.3, 1]})
    ont = m["evm_1113"]["ont"]
    open_r = [r for r in db["26_riscos_registro"] if r["tipo_risco"] == "AMEACA" and r["status"] == "ABERTO"]
    mat = np.zeros((5, 5))
    for i in range(5):
        for j in range(5):
            mat[i, j] = (i + 1) * (j + 1)
    axes[0].imshow(mat, origin="lower", cmap="YlGnBu", alpha=0.28, extent=[0.5, 5.5, 0.5, 5.5])
    cell_off = defaultdict(int)
    vme_tot = 0.0
    for r in open_r:
        prob = float(r["probabilidade_pct"])
        imp = float(r["impacto_custo_rs"])
        vme_tot += (prob / 100.0) * imp
        pb = 1 if prob <= 10 else 2 if prob <= 30 else 3 if prob <= 50 else 4 if prob <= 70 else 5
        ipct = (imp / ont) * 100
        ib = 1 if ipct < 0.25 else 2 if ipct < 0.5 else 3 if ipct < 1.0 else 4 if ipct < 2.0 else 5
        off = cell_off[(ib, pb)] * 0.22 - 0.1
        cell_off[(ib, pb)] += 1
        axes[0].scatter(ib, pb + off, color=CORAL if pb * ib >= 12 else NAVY, s=45)
        axes[0].text(ib + 0.1, pb + off, r["id_risco"], fontsize=7.5, fontweight="bold", color=NAVY, va="center")
    axes[0].set_xticks([1,2,3,4,5]); axes[0].set_yticks([1,2,3,4,5])
    axes[0].set_xlabel("Impacto (1–5)", fontsize=8); axes[0].set_ylabel("Probabilidade (1–5)", fontsize=8)
    axes[0].set_title("Matriz 5×5 — Ameaças Abertas", fontsize=9, fontweight="bold", color=NAVY)

    axes[1].bar(["VME Aberto", "Reserva Conting."], [vme_tot / 1000, 73.0], color=[SAND, TEAL], width=0.5)
    axes[1].set_ylabel("R$ mil", fontsize=8)
    axes[1].set_title("Exposição × Reserva (R$ mil)", fontsize=9, fontweight="bold", color=NAVY)
    for idx, val in enumerate([vme_tot / 1000, 73.0]):
        axes[1].text(idx, val + 1.5, f"R$ {val:.1f}k", ha="center", fontsize=8, fontweight="bold", color=NAVY)
    axes[1].grid(axis="y", color=GRID_COLOR, linestyle="--", lw=0.6)
    charts["d9_risks"] = fig_to_data_uri(fig)

    # 7. D14: Produtividade do Squad Ágil (Pontos entregues e Custo por Ponto)
    fig, axes = plt.subplots(1, 2, figsize=(8.2, 2.95))
    devs = [x for x in m["people"] if x["frente"] == "AGIL" and x["pts"] > 0]
    d_labels = [f"{x['id']}\n{x['nome'].split()[0]}" for x in devs]
    x = np.arange(len(devs))
    axes[0].bar(x, [d["pts"] for d in devs], color=TEAL, width=0.55)
    for i, d in enumerate(devs):
        axes[0].text(i, d["pts"] + 2.5, f"{d['pts']} pts\n({d['pts_h']:.3f}/h)", ha="center", fontsize=7.2, fontweight="bold", color=NAVY)
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(d_labels, fontsize=7.5)
    axes[0].set_ylim(0, max(d["pts"] for d in devs) * 1.25)
    axes[0].set_title("Pontos Concluídos e Rendimento (pts/h)", fontsize=9, fontweight="bold", color=NAVY)
    axes[0].grid(axis="y", color=GRID_COLOR, linestyle="--", lw=0.6)

    core_devs = [d for d in devs if d["id"] != "P17"]
    cx = np.arange(len(core_devs))
    c_cols = [CORAL if d["rs_pt"] > 1500 else NAVY for d in core_devs]
    axes[1].bar(cx, [d["rs_pt"] for d in core_devs], color=c_cols, width=0.52)
    for i, d in enumerate(core_devs):
        axes[1].text(i, d["rs_pt"] + 45, f"R$ {d['rs_pt']:,.0f}".replace(",", "."), ha="center", fontsize=7.5, fontweight="bold", color=NAVY)
    axes[1].set_xticks(cx)
    axes[1].set_xticklabels([f"{d['id']}\n{d['nome'].split()[0]}" for d in core_devs], fontsize=7.5)
    axes[1].set_ylim(0, max(d["rs_pt"] for d in core_devs) * 1.22)
    axes[1].set_title("Custo Direto por Ponto — Devs (R$/pt)", fontsize=9, fontweight="bold", color=NAVY)
    axes[1].grid(axis="y", color=GRID_COLOR, linestyle="--", lw=0.6)
    charts["d14_prod"] = fig_to_data_uri(fig)

    # 7b. D4: Roadmap de Sprints e Projeção de Releases (Burndown de Pontos)
    fig, ax = plt.subplots(figsize=(7.8, 2.85))
    total_pts = sum(int(b["pontos"]) for b in db["14_backlog_itens"] if b["prioridade_moscow"] != "WONT")
    rem_hist = []
    cum_done = 0
    sp_labels = []
    for s in m["sp_vel"]:
        cum_done += s["done"]
        rem_hist.append(max(0, total_pts - cum_done))
        sp_labels.append(s["id"])
    # Forecast S16..S22
    proj_labels = list(sp_labels)
    proj_vals = [None] * (len(sp_labels) - 1) + [rem_hist[-1]]
    rem_cur = rem_hist[-1]
    for k in range(1, m["ag_base"]["sr3"] + 1):
        proj_labels.append(f"S{15 + k}")
        rem_cur = max(0, rem_cur - m["vel_media"])
        proj_vals.append(rem_cur)
    ax.plot(sp_labels, rem_hist, color=NAVY, marker="o", lw=2.2, label="Backlog Restante Real (S01–S15)")
    ax.plot(proj_labels[len(sp_labels)-1:], proj_vals[len(sp_labels)-1:], color=TEAL, marker="s", linestyle="--", lw=2.2, label=f"Projeção ({m['vel_media']:.1f} pts/sprint)")
    ax.axvline(len(sp_labels) - 1, color=SAND, linestyle=":", lw=1.4, label="Corte 13/11 (S15)")
    ax.axvline(len(sp_labels) - 1 + m["ag_base"]["sr2"], color=TEAL_LIGHT, linestyle="--", lw=1.2, label="Prev. R2 (S17)")
    ax.set_title("Burndown de Release e Projeção de Sprints (Trilha Ágil — S01 a S22)", fontsize=9.5, fontweight="bold", color=NAVY)
    ax.set_ylabel("Pontos Restantes", fontsize=8, color=MUTED)
    ax.tick_params(axis="x", labelsize=7, rotation=45)
    ax.grid(axis="y", color=GRID_COLOR, linestyle="--", lw=0.6)
    ax.legend(fontsize=7.3, frameon=False)
    charts["d4_roadmap"] = fig_to_data_uri(fig)

    # 8. D16: Cenários (Resultado Líquido + Fluxo Acumulado M7)
    fig, axes = plt.subplots(1, 2, figsize=(8.4, 3.2))
    top_sc = [s for s in m["scens"] if s["id"] in ("C1","C2","C3","C4","C5","C6","C2+C4","C2+C6")]
    x = np.arange(len(top_sc))
    cols = [TEAL if s["id"] == "C4" else (NAVY if s["id"] == "C1" else "#4B6B8A") for s in top_sc]
    axes[0].bar(x, [s["resultado"] / 1000 for s in top_sc], color=cols, width=0.58)
    axes[0].set_xticks(x)
    axes[0].set_xticklabels([s["id"] for s in top_sc], fontsize=7.5)
    axes[0].set_ylabel("R$ mil", fontsize=8)
    axes[0].set_title("Resultado (VPL − Custo Atraso)", fontsize=9, fontweight="bold", color=NAVY)
    axes[0].grid(axis="y", color=GRID_COLOR, linestyle="--", lw=0.6)

    for sid, col, lw in [("C1", MUTED, 1.8), ("C3", SAND, 1.8), ("C4", TEAL, 2.6), ("C2+C4", CORAL, 1.8)]:
        sc = next(s for s in m["scens"] if s["id"] == sid)
        axes[1].plot([r["ano"] for r in sc["fluxo"]], [r["acum"] / 1000 for r in sc["fluxo"]], color=col, lw=lw, marker="o", markersize=3.5, label=sid)
    axes[1].axhline(0, color="#94A3B8", lw=0.8)
    axes[1].set_title("Fluxo de Caixa Acumulado (M7 + C2+C4)", fontsize=9, fontweight="bold", color=NAVY)
    axes[1].set_xlabel("Ano", fontsize=8)
    axes[1].legend(fontsize=7.5, frameon=False)
    axes[1].grid(axis="y", color=GRID_COLOR, linestyle="--", lw=0.6)
    charts["d16_scens"] = fig_to_data_uri(fig)

    return charts
