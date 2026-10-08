#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sincronizador automático de resultados, partidos y clasificación para UD Centinela.
Fuente: FutbolTenerife (Regional Segunda - Grupo 1 Tenerife 2026-27)
Sincroniza las 30 jornadas completas, actas oficiales de partidos de UD Centinela,
goleadores individuales y calendarios .ics para dispositivos móviles.
"""

import json
import os
import re
import ssl
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone

URL_FUTBOLTENERIFE = "https://futboltenerife.com/1regional-segunda-grupo-uno/"
URL_JORNADA_BASE = "https://futboltenerife.com/1regional-segunda-grupo-uno/proxima-jornada.php"
URL_ACTA = "https://futboltenerife.com/registro-login-remoto/muestra_mensaje.php"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CALENDAR_JSON_PATH = os.path.join(BASE_DIR, "assets", "data", "calendar.json")
PLAYERS_JSON_PATH = os.path.join(BASE_DIR, "assets", "data", "players.json")

ctx = ssl._create_unverified_context()

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

def fetch_html(url, timeout=20):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    )
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
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

def norm_str(s):
    if not s:
        return ""
    s = s.lower()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', s)

PLAYER_PATTERNS = {
    'nauzet': ['nauzet', 'acostacarrillo'],
    'champi': ['champi', 'sergiogonzalez', 'gonzalezgonzalezsergio'],
    'tinguaro': ['tinguaro', 'lizandrotinguaro', 'arbeloaguiar'],
    'zacaria': ['zakaria', 'zacaria', 'aitaamana'],
    'pablo': ['mendezafonso', 'mendezpablo', 'pablomendez'],
    'aday': ['gonzalezdorta', 'dortaaday', 'adaygonzalez'],
    'sebastian': ['rodriguezalegria', 'sebastiangabriel', 'alegriasebastian'],
    'angel': ['perezcasanova', 'casanovaangel', 'angelperez'],
    'colcho': ['garciadominguez', 'cristiancolcho', 'dominguezcristian'],
    'nano': ['angelmartos', 'martosangel', 'nano'],
    'iriome': ['iriomegonzalez', 'gonzaleziriome'],
    'jose-angel': ['joseangel'],
    'adrian-tejera': ['adriantejera', 'tejeraadrian'],
    'joel': ['joel'],
    'rayco': ['rayco'],
    'julio': ['julio'],
    'yeray': ['yeray', 'melon'],
    'miguel': ['miguel'],
    'edgar': ['edgar'],
    'salvador': ['salvador', 'salva'],
    'ruben': ['ruben'],
    'cristian': ['cristian'],
    'jordan': ['jordan'],
    'ayoze': ['ayoze']
}

def match_player_name(raw_name):
    n = norm_str(raw_name)
    for pid, patterns in PLAYER_PATTERNS.items():
        for pat in patterns:
            if pat in n:
                return pid
    return None

def fetch_acta_events(match_ext_id, local, visitante, gollocal, golvisi, jornada):
    """
    Obtiene los eventos y goleadores oficiales del acta federativa desde FutbolTenerife
    """
    params = {
        "id": str(match_ext_id),
        "local": local,
        "visitante": visitante,
        "mensa": "",
        "usuario": "",
        "email": "",
        "pass": "",
        "registro": "",
        "categoria": "1regional-segunda-grupo-uno",
        "escudoloc": "",
        "escudovisi": "",
        "gollocal": str(gollocal) if gollocal is not None else "",
        "golvisi": str(golvisi) if golvisi is not None else "",
        "jornada": str(jornada)
    }
    data = urllib.parse.urlencode(params).encode('utf-8')
    req = urllib.request.Request(URL_ACTA, data=data, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=12) as r:
            html = r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Aviso: no se pudo obtener el acta del partido {match_ext_id}: {e}")
        return []

    # Extraer formato: (10') Acosta Carrillo, Nauzet
    goals = re.findall(r"\((\d+)\'\)\s*([A-Za-zÀ-ÿ\s,\.-]+)", html)
    events = []
    
    for minute_str, raw_name in goals:
        clean_name = raw_name.strip()
        if "entrenador" in clean_name.lower() or "arbitro" in clean_name.lower():
            continue
        pid = match_player_name(clean_name)
        if pid:
            events.append({
                "type": "goal",
                "minute": int(minute_str),
                "scorerId": pid,
                "assistId": None
            })
    return events

def fetch_all_jornadas_matches():
    """
    Descarga y analiza los partidos de las 30 jornadas del campeonato
    """
    all_matches = []
    print("Obteniendo calendario completo de las 30 jornadas desde FutbolTenerife...")

    for j in range(1, 31):
        url = f"{URL_JORNADA_BASE}?id={j}&cat=calendario_regional_segunda_g1"
        try:
            html = fetch_html(url, timeout=15)
        except Exception as e:
            print(f"Error descargando Jornada {j}: {e}")
            continue

        blocks = re.split(r'<div style="width:100%; float:left;margin-bottom:2px; "', html)
        for b in blocks[1:]:
            date_match = re.search(r'(\d{2}[-/]\d{2}[-/]\d{4})', b)
            time_match = re.search(r'(\d{1,2}:\d{2})', b)
            modal_match = re.search(r"modal\((.*?)\)", b)

            date_raw = date_match.group(1) if date_match else None
            time_raw = time_match.group(1) if time_match else None

            if modal_match:
                parts = [p.strip("'\" ") for p in modal_match.group(1).split(",")]
                ext_id = parts[0] if len(parts) > 0 else ""
                local = parts[1] if len(parts) > 1 else ""
                visi = parts[2] if len(parts) > 2 else ""
                gl = parts[11] if len(parts) > 11 else ""
                gv = parts[12] if len(parts) > 12 else ""
                jor = parts[13] if len(parts) > 13 else str(j)

                formatted_date = date_raw.replace("-", "/") if date_raw else None

                status = "upcoming"
                home_score = None
                away_score = None
                if gl.isdigit() and gv.isdigit():
                    home_score = int(gl)
                    away_score = int(gv)
                    status = "live" if "gol1" in b else "finished"

                all_matches.append({
                    "roundNumber": int(jor) if jor.isdigit() else j,
                    "extMatchId": ext_id,
                    "homeId": normalize_team(local),
                    "awayId": normalize_team(visi),
                    "localRaw": local,
                    "visiRaw": visi,
                    "homeScore": home_score,
                    "awayScore": away_score,
                    "status": status,
                    "date": formatted_date,
                    "time": time_raw
                })
        time.sleep(0.04)

    return all_matches

def sync():
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{now_str}] Iniciando sincronización integral desde FutbolTenerife...")

    if not os.path.exists(CALENDAR_JSON_PATH):
        print(f"ERROR: No existe {CALENDAR_JSON_PATH}")
        sys.exit(1)

    with open(CALENDAR_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    teams_dict = {t["id"]: t for t in data.get("teams", [])}

    # 1. Parsear clasificación
    html_main = fetch_html(URL_FUTBOLTENERIFE)
    new_standings = parse_standings(html_main, teams_dict)
    standings_changed = False

    if new_standings and len(new_standings) >= 16:
        old_standings_str = json.dumps(data.get("standings", []), sort_keys=True)
        new_standings_str = json.dumps(new_standings, sort_keys=True)
        if old_standings_str != new_standings_str:
            print(f"Clasificación actualizada con variaciones ({len(new_standings)} equipos).")
            data["standings"] = new_standings
            standings_changed = True
        else:
            print(f"Clasificación sin cambios ({len(new_standings)} equipos).")

    # 2. Descargar y sincronizar los partidos de las 30 jornadas
    parsed_matches = fetch_all_jornadas_matches()
    print(f"Total de partidos parseados del portal: {len(parsed_matches)}")

    matches_changed_count = 0
    centinela_events_updated = 0

    for pm in parsed_matches:
        for m in data.get("matches", []):
            m_round = m.get("roundNumber")
            m_home_id = m.get("homeId") or normalize_team(m.get("home"))
            m_away_id = m.get("awayId") or normalize_team(m.get("away"))

            if m_round == pm["roundNumber"] and m_home_id == pm["homeId"] and m_away_id == pm["awayId"]:
                changed = False

                # Asegurar identificadores y logos
                if not m.get("homeId"):
                    m["homeId"] = pm["homeId"]
                if not m.get("awayId"):
                    m["awayId"] = pm["awayId"]
                if not m.get("homeLogo") and pm["homeId"] in teams_dict:
                    m["homeLogo"] = teams_dict[pm["homeId"]].get("logo", "")
                if not m.get("awayLogo") and pm["awayId"] in teams_dict:
                    m["awayLogo"] = teams_dict[pm["awayId"]].get("logo", "")

                # Actualizar marcador y estado
                if m.get("homeScore") != pm["homeScore"] or m.get("awayScore") != pm["awayScore"] or m.get("status") != pm["status"]:
                    print(f" -> Marcador: {m.get('round')} | {m.get('home')} {pm['homeScore']} - {pm['awayScore']} {m.get('away')} ({pm['status']})")
                    m["homeScore"] = pm["homeScore"]
                    m["awayScore"] = pm["awayScore"]
                    m["status"] = pm["status"]
                    changed = True

                # Actualizar fecha y hora si han cambiado
                if pm["date"] and m.get("date") != pm["date"]:
                    print(f" -> Fecha reprogramada: {m.get('round')} {m.get('home')} vs {m.get('away')} ({m.get('date')} -> {pm['date']})")
                    m["date"] = pm["date"]
                    changed = True

                if pm["time"] and m.get("time") != pm["time"]:
                    print(f" -> Horario reprogramado: {m.get('round')} {m.get('home')} vs {m.get('away')} ({m.get('time')} -> {pm['time']})")
                    m["time"] = pm["time"]
                    changed = True

                # Para partidos terminados de UD Centinela: obtener acta oficial si no tiene eventos o minutos
                is_centinela = (pm["homeId"] == "ud-centinela" or pm["awayId"] == "ud-centinela")
                if is_centinela and pm["status"] == "finished":
                    existing_events = m.get("events", [])
                    has_minutes = any(e.get("minute") is not None for e in existing_events)
                    needs_acta = len(existing_events) == 0 or not has_minutes

                    if needs_acta and pm["extMatchId"]:
                        events = fetch_acta_events(
                            pm["extMatchId"], pm["localRaw"], pm["visiRaw"],
                            pm["homeScore"], pm["awayScore"], pm["roundNumber"]
                        )
                        if events:
                            print(f" -> Acta oficial incorporada para {m.get('round')}: {len(events)} goles registrados con minutos oficiales.")
                            m["events"] = events
                            centinela_events_updated += 1
                            changed = True

                if changed:
                    matches_changed_count += 1
                break

    print(f"Total de partidos modificados o reprogramados: {matches_changed_count}")

    # 3. Determinar próximo partido de la UD Centinela
    centinela_matches = [
        m for m in data.get("matches", [])
        if (m.get("homeId") == "ud-centinela" or m.get("awayId") == "ud-centinela" or
            normalize_team(m.get("home")) == "ud-centinela" or normalize_team(m.get("away")) == "ud-centinela")
    ]
    centinela_matches.sort(key=lambda x: x.get("roundNumber", 0))

    next_match = None
    for m in centinela_matches:
        if m.get("status") in ("upcoming", "live"):
            next_match = m
            break

    if not next_match and centinela_matches:
        next_match = centinela_matches[-1]

    next_match_changed = False
    if next_match:
        old_next = data.get("nextMatch", {})
        if json.dumps(old_next, sort_keys=True) != json.dumps(next_match, sort_keys=True):
            data["nextMatch"] = next_match
            next_match_changed = True
            print(f"Próximo partido de Centinela actualizado: {next_match.get('round')} | {next_match.get('home')} vs {next_match.get('away')} ({next_match.get('date')} {next_match.get('time')})")

    # 4. Actualizar estadísticas de jugadores en players.json
    players_changed = False
    if os.path.exists(PLAYERS_JSON_PATH):
        try:
            with open(PLAYERS_JSON_PATH, "r", encoding="utf-8") as pf:
                pdata = json.load(pf)

            # Contabilizar goles desde los eventos de todos los partidos terminados
            goal_counts = {}
            for m in centinela_matches:
                if m.get("status") == "finished" and isinstance(m.get("events"), list):
                    for ev in m["events"]:
                        if ev.get("type") == "goal" and ev.get("scorerId"):
                            pid = ev["scorerId"]
                            goal_counts[pid] = goal_counts.get(pid, 0) + 1

            for p in pdata.get("players", []):
                pid = p.get("id")
                # Excluir cuerpo técnico excepto Iriome (presidente y jugador activo)
                is_staff = pid in ['cuerpo-tecnico', 'juan-manuel', 'tono', 'joel-pf']
                if not is_staff:
                    new_goals = goal_counts.get(pid, 0)
                    if p.get("goals") != new_goals:
                        print(f" -> Goles actualizados para {p.get('name')}: {p.get('goals')} -> {new_goals}")
                        p["goals"] = new_goals
                        players_changed = True

            if players_changed:
                pdata["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
                with open(PLAYERS_JSON_PATH, "w", encoding="utf-8") as pf:
                    json.dump(pdata, pf, indent=2, ensure_ascii=False)
                print("Estadísticas de plantilla actualizadas con éxito en players.json.")
        except Exception as e:
            print(f"Aviso actualizando players.json: {e}")

    # 5. Guardar JSON y regenerar calendarios solo si hay cambios reales
    force = "--force" in sys.argv
    has_real_changes = (matches_changed_count > 0) or standings_changed or next_match_changed or players_changed or force

    if has_real_changes:
        data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with open(CALENDAR_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Cambios detectados y guardados exitosamente en calendar.json.")

        # Regenerar archivos iCalendar (.ics)
        try:
            from generate_ics import generate_ics
            generate_ics()
        except Exception as e:
            print(f"Aviso: no se pudo regenerar el archivo .ics: {e}")

        return True
    else:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Sin novedades: ni resultados ni clasificación han variado. Archivo no modificado.")
        return False

if __name__ == "__main__":
    sync()
