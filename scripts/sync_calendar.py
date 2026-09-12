#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sincronizador automático de resultados, partidos y clasificación para UD Centinela.
Fuente: FutbolTenerife (Regional Segunda - Grupo 1 Tenerife 2026-27)
"""

import json
import os
import re
import ssl
import sys
import urllib.request
from datetime import datetime, timezone

URL_FUTBOLTENERIFE = "https://futboltenerife.com/1regional-segunda-grupo-uno/"
CALENDAR_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "data", "calendar.json")

def normalize_team(name):
    if not name:
        return None
    n = name.lower().replace(".", "").replace(" ", "").replace("-", "")
    if "centinela" in n:
        return "ud-centinela"
    if "portezuelo" in n:
        return "portezuelo"
    if "silense" in n:
        return "cd-juventud-silense"
    if "jeronimo" in n or "jerónimo" in n:
        return "cd-san-jeronimo"
    if "perdoma" in n:
        return "atletico-perdoma-b"
    if "buenavista" in n:
        return "cd-buenavista"
    if "sandiego" in n or "diego" in n:
        return "cd-san-diego"
    if "tegueste" in n:
        return "afb-tegueste"
    if "vlm" in n or "vistalmon" in n or "canarias" in n:
        return "vlm-fc"
    if "interian" in n or "interián" in n:
        return "cd-juventud-interian"
    if "pirata" in n:
        return "cd-once-piratas"
    if "gara" in n:
        return "rcd-gara"
    if "ravelo" in n:
        return "sd-ravelo-b"
    if "matanza" in n:
        return "ud-matanza"
    if "tacorontecf" in n or "realtacoronte" in n:
        return "tacoronte-cf"
    if "tacoronte" in n:
        return "ud-tacoronte"
    return None

def fetch_html():
    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(
        URL_FUTBOLTENERIFE,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    )
    with urllib.request.urlopen(req, context=ctx, timeout=25) as resp:
        return resp.read().decode("utf-8", errors="ignore")

def parse_standings(html, teams_dict):
    """
    Extrae la clasificación oficial de la tabla de FutbolTenerife
    """
    pattern = re.compile(
        r'<div class="orden"[^>]*>.*?</div>\s*'
        r'<div[^>]*>(\d+)</div>.*?'
        r'<img[^>]*title="([^"]*)"[^>]*>.*?'
        r'<div[^>]*>\s*([^<]+)<style>.*?'
        r'<div[^>]*>([-\d]+)</div>\s*' # PT
        r'<div[^>]*>([-\d]+)</div>\s*' # DF
        r'<div[^>]*>([-\d]+)</div>\s*' # J
        r'<div[^>]*>([-\d]+)</div>\s*' # G
        r'<div[^>]*>([-\d]+)</div>\s*' # E
        r'<div[^>]*>([-\d]+)</div>\s*' # P
        r'<div[^>]*>([-\d]+)</div>\s*' # GF
        r'<div[^>]*>([-\d]+)</div>',   # GC
        re.DOTALL
    )

    rows = pattern.findall(html)
    standings = []
    seen_ids = set()

    for r in rows:
        pos_str, title_img, raw_team_name, pt, df, pj, pg, pe, pp, gf, gc = r
        team_id = normalize_team(raw_team_name) or normalize_team(title_img)
        if not team_id:
            continue

        team_meta = teams_dict.get(team_id, {})
        standings.append({
            "id": team_id,
            "position": int(pos_str.strip()),
            "team": team_meta.get("name", raw_team_name.strip()),
            "shortName": team_meta.get("shortName", raw_team_name.strip()),
            "logo": team_meta.get("logo", ""),
            "played": int(pj.strip()),
            "won": int(pg.strip()),
            "drawn": int(pe.strip()),
            "lost": int(pp.strip()),
            "goalsFor": int(gf.strip()),
            "goalsAgainst": int(gc.strip()),
            "goalDifference": int(df.strip()),
            "points": int(pt.strip())
        })
        seen_ids.add(team_id)

    # Añadir equipos que falten si la tabla no los incluyera a todos
    for tid, tmeta in teams_dict.items():
        if tid not in seen_ids:
            standings.append({
                "id": tid,
                "position": len(standings) + 1,
                "team": tmeta.get("name", tid),
                "shortName": tmeta.get("shortName", tid),
                "logo": tmeta.get("logo", ""),
                "played": 0,
                "won": 0,
                "drawn": 0,
                "lost": 0,
                "goalsFor": 0,
                "goalsAgainst": 0,
                "goalDifference": 0,
                "points": 0
            })

    return standings

def parse_matches(html):
    """
    Extrae los partidos con sus resultados o estado
    """
    pattern = re.compile(
        r'<div[^>]*font-size:\s*12px[^>]*>([^<]+)</div>\s*'
        r'<div[^>]*>\s*<img[^>]*>\s*</div>\s*'
        r'<div class="([^"]+)">([^<]*)</div>\s*'
        r'<div class="([^"]+)">([^<]*)</div>\s*'
        r'<div[^>]*>\s*<img[^>]*>\s*</div>\s*'
        r'<div[^>]*font-size:\s*12px[^>]*>([^<]+)</div>',
        re.IGNORECASE
    )

    results = []
    for m in pattern.finditer(html):
        t1, c1, s1, c2, s2, t2 = m.groups()
        h_id = normalize_team(t1.strip())
        a_id = normalize_team(t2.strip())
        if not h_id or not a_id:
            continue

        score1 = s1.strip()
        score2 = s2.strip()

        # Determinar estado
        status = "upcoming"
        home_score = None
        away_score = None

        if score1.isdigit() and score2.isdigit():
            home_score = int(score1)
            away_score = int(score2)
            if "gol1cate" in c1 or "gol1cate" in c2:
                status = "live"
            else:
                status = "finished"

        results.append({
            "homeId": h_id,
            "awayId": a_id,
            "homeScore": home_score,
            "awayScore": away_score,
            "status": status
        })

    return results

def sync():
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{now_str}] Iniciando sincronización desde FutbolTenerife...")
    html = fetch_html()
    print(f"Descargados {len(html)} bytes de {URL_FUTBOLTENERIFE}")

    if not os.path.exists(CALENDAR_JSON_PATH):
        print(f"ERROR: No existe {CALENDAR_JSON_PATH}")
        sys.exit(1)

    with open(CALENDAR_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    teams_dict = {t["id"]: t for t in data.get("teams", [])}

    # 1. Parsear clasificación
    new_standings = parse_standings(html, teams_dict)
    if new_standings and len(new_standings) == 16:
        print(f"Clasificación parseada con éxito: {len(new_standings)} equipos.")
        data["standings"] = new_standings
    else:
        print(f"Aviso: se encontraron {len(new_standings)} equipos en clasificación.")
        if new_standings:
            data["standings"] = new_standings

    # 2. Parsear partidos y actualizar matches
    parsed_matches = parse_matches(html)
    print(f"Partidos parseados del portal: {len(parsed_matches)}")

    updated_count = 0
    for pm in parsed_matches:
        for m in data.get("matches", []):
            m_home_id = m.get("homeId") or normalize_team(m.get("home"))
            m_away_id = m.get("awayId") or normalize_team(m.get("away"))

            if m_home_id == pm["homeId"] and m_away_id == pm["awayId"]:
                # Asegurar ids y logos si faltaban
                if not m.get("homeId"):
                    m["homeId"] = pm["homeId"]
                if not m.get("awayId"):
                    m["awayId"] = pm["awayId"]
                if not m.get("homeLogo") and pm["homeId"] in teams_dict:
                    m["homeLogo"] = teams_dict[pm["homeId"]].get("logo", "")
                if not m.get("awayLogo") and pm["awayId"] in teams_dict:
                    m["awayLogo"] = teams_dict[pm["awayId"]].get("logo", "")

                if m.get("homeScore") != pm["homeScore"] or m.get("awayScore") != pm["awayScore"] or m.get("status") != pm["status"]:
                    print(f" -> Actualizado: {m.get('home')} {pm['homeScore']} - {pm['awayScore']} {m.get('away')} ({pm['status']})")
                    m["homeScore"] = pm["homeScore"]
                    m["awayScore"] = pm["awayScore"]
                    m["status"] = pm["status"]
                    updated_count += 1
                break

    print(f"Total de partidos actualizados en el calendario: {updated_count}")

    # 3. Determinar próximo partido de la UD Centinela
    centinela_matches = [
        m for m in data.get("matches", [])
        if (m.get("homeId") == "ud-centinela" or m.get("awayId") == "ud-centinela" or
            normalize_team(m.get("home")) == "ud-centinela" or normalize_team(m.get("away")) == "ud-centinela")
    ]

    next_match = None
    for m in centinela_matches:
        if m.get("status") in ("upcoming", "live"):
            next_match = m
            break

    if not next_match and centinela_matches:
        next_match = centinela_matches[-1]

    if next_match:
        data["nextMatch"] = next_match
        print(f"Próximo partido de Centinela fijado: {next_match.get('round')} | {next_match.get('home')} vs {next_match.get('away')} ({next_match.get('date')} {next_match.get('time')})")

    # 4. Actualizar timestamp
    data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # 5. Guardar JSON
    with open(CALENDAR_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Sincronización completada exitosamente en calendar.json.")
    return updated_count > 0 or len(new_standings) > 0

if __name__ == "__main__":
    sync()
