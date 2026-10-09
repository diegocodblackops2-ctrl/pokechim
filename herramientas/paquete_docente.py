"""Genera la pauta PRIVADA para el profesor (vista de corrección del LMS) en dist/lms_proyecto/.

Contiene, por forma (A y B): brief público, etapas con preguntas y respuestas esperadas, modelo de referencia por etapa,
actualización resuelta, anclas de calificación y rúbrica C1–C4. NO va en el SCORM ni en el repositorio.
Uso: python3 herramientas/paquete_docente.py
"""
import glob, json, os, shutil

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    c = json.load(open(glob.glob(os.path.join(RAIZ, "autoria_privada", "**", "IATU_Contenido_completo_v3.json"), recursive=True)[0], encoding="utf-8"))
    pauta = json.load(open(os.path.join(RAIZ, "autoria_privada", "proyecto_auto_v1.json"), encoding="utf-8"))
    out = {"curso": "IATU-C05", "version": c["version"], "privado": True,
           "nota": "Pauta para el profesor. Contiene respuestas: mostrar solo en la vista docente del LMS.",
           "rubrica": c["rubric"], "pesos": pauta["criterios"],
           "regla": "Nota del proyecto = Σ peso × nivel / 3 (niveles 0–3). Aprueba con global ≥ 80 (0,4 situaciones + 0,6 proyecto) y proyecto ≥ 75, sin fallo crítico.",
           "formas": {}}
    for p in c["projects"]:
        modelo = {b["title"].split(".")[0].strip(): b for b in p["model"]}
        etapas = []
        for e in pauta["formas"][p["form"]]["etapas"]:
            num = e["title"].split("·")[0].strip()
            ref = modelo.get(num)
            items = []
            for it in e["items"]:
                esperado = None
                if it["t"] == "classify": esperado = {r[1]: it["cats"][it["key"][r[0]]] for r in it["rows"]}
                elif it["t"] == "multi": esperado = [it["opts"][i] for i in it["key"]]
                elif it["t"] == "mcq": esperado = it["opts"][it["key"]]
                elif it["t"] == "num": esperado = {f[0]: f[1] for f in it["fields"]}
                elif it["t"] == "order": esperado = it["steps"]
                elif it["t"] in ("prompt", "text"): esperado = [ch["label"] for ch in it["checks"]]
                items.append({"tipo": it["t"], "pregunta": it.get("q") or it.get("label", ""), "puntos_pauta": it["pts"], "esperado": esperado, "por_que": it.get("why", "")})
            etapas.append({"id": e["id"], "titulo": e["title"], "criterio": e["crit"], "items": items,
                           "modelo": {"titulo": ref["title"], "texto": ref["text"]} if ref else {"titulo": "Actualización resuelta", "texto": p["update_model"]}})
        pub = {k: p[k] for k in ("title", "role", "audience", "purpose", "task", "restrictions", "update", "accepted", "critical_policy") if k in p}
        out["formas"][p["form"]] = {"brief": pub, "documentos": p["documents"], "etapas": etapas, "anclas": p["anchors"]}
    d = os.path.join(RAIZ, "dist", "lms_proyecto"); os.makedirs(d, exist_ok=True)
    json.dump(out, open(os.path.join(d, "pauta_docente.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    shutil.copy(os.path.join(RAIZ, "docs", "INTEGRACION_PROYECTO_LMS.md"), d)
    print("dist/lms_proyecto/pauta_docente.json", os.path.getsize(os.path.join(d, "pauta_docente.json")), "bytes")


if __name__ == "__main__":
    main()
