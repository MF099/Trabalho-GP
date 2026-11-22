"""Script de tratamento e validação dos 46 CSVs do Grupo 3 (Maré Seguros).
Mantém dados/ intacto e gera dados_tratados/ com os dados limpos até 30/10/2026.
"""
import csv
import os
import shutil
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "dados")
CLEAN_DIR = os.path.join(BASE_DIR, "dados_tratados")

os.makedirs(CLEAN_DIR, exist_ok=True)


def load_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return reader.fieldnames, list(reader)


def save_csv(path, fieldnames, rows):
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def clean_all():
    # Copia todas as tabelas primeiro
    for fname in sorted(os.listdir(RAW_DIR)):
        if fname.endswith(".csv"):
            shutil.copy2(os.path.join(RAW_DIR, fname), os.path.join(CLEAN_DIR, fname))

    # 1. 18_apontamento_horas.csv: deduplicar e corrigir 400.0 -> 40.0
    cols18, rows18 = load_csv(os.path.join(RAW_DIR, "18_apontamento_horas.csv"))
    seen18 = set()
    clean18 = []
    for r in rows18:
        key = (r["semana_inicio"], r["id_pessoa"], r["tipo_item"], r["id_item"])
        if key in seen18:
            continue
        seen18.add(key)
        if float(r["horas_normais"]) == 400.0:
            r["horas_normais"] = "40.0"
        clean18.append(r)
    save_csv(os.path.join(CLEAN_DIR, "18_apontamento_horas.csv"), cols18, clean18)

    # 2. 17_avanco_semanal.csv: preencher semanas faltantes (lacunas de 14 dias)
    cols17, rows17 = load_csv(os.path.join(RAW_DIR, "17_avanco_semanal.csv"))
    by_act = {}
    for r in rows17:
        by_act.setdefault(r["id_atividade"], []).append(r)
    filled17 = list(rows17)
    for aid, items in by_act.items():
        items.sort(key=lambda x: x["semana_fim"])
        for i in range(1, len(items)):
            d0 = datetime.strptime(items[i - 1]["semana_fim"], "%Y-%m-%d")
            d1 = datetime.strptime(items[i]["semana_fim"], "%Y-%m-%d")
            if (d1 - d0).days == 14:
                missing = dict(items[i - 1])
                missing["semana_fim"] = (d0 + timedelta(days=7)).strftime("%Y-%m-%d")
                missing["situacao"] = "EM_ANDAMENTO"
                missing["data_termino_real"] = ""
                filled17.append(missing)
    filled17.sort(key=lambda x: (x["semana_fim"], x["id_atividade"]))
    save_csv(os.path.join(CLEAN_DIR, "17_avanco_semanal.csv"), cols17, filled17)

    # 3. 19_custos_realizados.csv: apropriar lançamentos PREDITIVA sem atividade / EAP=DIVERSOS
    _, acts = load_csv(os.path.join(RAW_DIR, "07_atividades.csv"))
    act_eap = {a["id_atividade"]: a["codigo_eap"] for a in acts}
    _, meds = load_csv(os.path.join(RAW_DIR, "31_contratos_medicoes.csv"))
    med_act = {m["id_medicao"]: m["id_atividade"] for m in meds}

    cols19, rows19 = load_csv(os.path.join(RAW_DIR, "19_custos_realizados.csv"))
    for r in rows19:
        if r["frente"] == "PREDITIVA" and (not r["id_atividade"] or r["codigo_eap"] == "DIVERSOS"):
            doc = r["documento"]
            if doc in med_act:
                aid = med_act[doc]
            elif doc.startswith("NF-A"):
                aid = doc.split("-")[1]
            else:
                raise ValueError(f"Nao foi possivel apropriar {r}")
            r["id_atividade"] = aid
            r["codigo_eap"] = act_eap[aid]
    save_csv(os.path.join(CLEAN_DIR, "19_custos_realizados.csv"), cols19, rows19)

    # 4. 21_itens_transicoes.csv: normalizar status_destino
    status_map = {
        "EM_ANDAMENTO": "EM_ANDAMENTO", "em_andamento": "EM_ANDAMENTO", "EM ANDAMENTO": "EM_ANDAMENTO",
        "EM_REVISAO": "EM_REVISAO", "EM REVISAO": "EM_REVISAO", "Em revisão": "EM_REVISAO",
        "EM_TESTE": "EM_TESTE", "em_teste": "EM_TESTE", "Em teste": "EM_TESTE",
        "CONCLUIDO": "CONCLUIDO", "concluido": "CONCLUIDO", "Concluído": "CONCLUIDO", "DONE": "CONCLUIDO",
    }
    cols21, rows21 = load_csv(os.path.join(RAW_DIR, "21_itens_transicoes.csv"))
    for r in rows21:
        r["status_destino"] = status_map[r["status_destino"]]
    save_csv(os.path.join(CLEAN_DIR, "21_itens_transicoes.csv"), cols21, rows21)

    # 5. 25_inspecoes_aceite.csv: normalizar resultado
    res_map = {
        "APROVADO": "APROVADO", "aprovado": "APROVADO", "Aprovado": "APROVADO",
        "APROVADO_COM_RESSALVA": "APROVADO_COM_RESSALVA", "APROVADO COM RESSALVA": "APROVADO_COM_RESSALVA",
        "REPROVADO": "REPROVADO",
    }
    cols25, rows25 = load_csv(os.path.join(RAW_DIR, "25_inspecoes_aceite.csv"))
    for r in rows25:
        r["resultado"] = res_map[r["resultado"]]
    save_csv(os.path.join(CLEAN_DIR, "25_inspecoes_aceite.csv"), cols25, rows25)

    # Conferência automática contra os controles até 30/10/2026
    total_h = sum(float(r["horas_normais"]) + float(r["horas_extras"]) for r in clean18)
    total_c = round(sum(float(r["valor_rs"]) for r in rows19), 2)
    pred_c = round(sum(float(r["valor_rs"]) for r in rows19 if r["frente"] == "PREDITIVA"), 2)
    assert len(clean18) == 418, f"Esperado 418 linhas em tab 18, obtido {len(clean18)}"
    assert abs(total_h - 12579.5) < 1e-6, f"Esperado 12579.5h, obtido {total_h}"
    assert len(filled17) == 147, f"Esperado 147 linhas em tab 17, obtido {len(filled17)}"
    assert len(rows19) == 117 and abs(total_c - 2116731.44) < 1e-6 and abs(pred_c - 1694947.79) < 1e-6
    assert len(rows21) == 452
    print("OK! Todos os dados tratados conferem 100% com os numeros de controle ate 30/10/2026.")


if __name__ == "__main__":
    clean_all()
