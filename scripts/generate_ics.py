#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de archivos iCalendar (.ics) para la UD Centinela.
Genera el calendario oficial de todos los partidos de la temporada 2026/2027
100% compatible con Apple Calendar (iPhone, Mac), Google Calendar (Android, Web),
Xiaomi Mi Calendario (MIUI / HyperOS), Samsung Calendar y Outlook.
Usa la librería icalendar y escritura binaria pura ('wb') para garantizar
estricto cumplimiento de RFC 5545 (sin retornos de carro duplicados \r\r\n,
con salto de línea a 75 octetos y codificación UTC limpia).
"""

import json
import os
from datetime import datetime, timedelta, timezone
import icalendar

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CALENDAR_JSON = os.path.join(BASE_DIR, "assets", "data", "calendar.json")
OUTPUT_ICS = os.path.join(BASE_DIR, "assets", "ud-centinela-2026-2027.ics")
OUTPUT_ICS_ALIAS = os.path.join(BASE_DIR, "assets", "calendario.ics")

VENUE_MAP = {
    "EL MOLINO (CA)": "Estadio Municipal El Molino, Icod de los Vinos, Santa Cruz de Tenerife",
    "TEGUESTE (CA)": "Campo Municipal Los Laureles, Tegueste, Santa Cruz de Tenerife",
    "RAVELO (CA)": "Campo Municipal de Ravelo, El Sauzal, Santa Cruz de Tenerife",
    "LAS TORRES - TF (CA)": "Campo Municipal Las Torres, Taco, San Cristóbal de La Laguna",
    "CALETA INTERIAN (CA)": "Campo Municipal de Caleta de Interián, Garachico",
    "LOS CUARTOS (CN)": "Estadio Municipal Los Cuartos, La Orotava, Santa Cruz de Tenerife",
    "PACHO I (CA)": "Campo Municipal El Pacho, San Cristóbal de La Laguna",
    "BUENAVISTA (CA)": "Campo Municipal Los Cabildos, Buenavista del Norte",
    "LA PERDOMA (CA)": "Campo Municipal de La Perdoma, La Orotava",
    "AVENCIO HDEZ. (CA)": "Campo Municipal Avencio Hernández, Tacoronte",
    "JUAN VALIENTE (CA)": "Campo Municipal Juan Valiente, Los Silos",
    "LA MATANZA (CA)": "Estadio Municipal de La Matanza de Acentejo",
    "BCO. LAS LAJAS (CA)": "Campo Municipal Barranco Las Lajas, Tacoronte",
}

def is_canary_dst(dt):
    # En Canarias: horario de verano comienza último domingo de marzo, termina último domingo de octubre
    year = dt.year
    last_sun_march = datetime(year, 3, 31) - timedelta(days=(datetime(year, 3, 31).weekday() + 1) % 7)
    last_sun_oct = datetime(year, 10, 31) - timedelta(days=(datetime(year, 10, 31).weekday() + 1) % 7)
    dst_start = last_sun_march.replace(hour=1, minute=0)
    dst_end = last_sun_oct.replace(hour=1, minute=0)
    return dst_start <= dt < dst_end

def canary_to_utc(dt):
    if is_canary_dst(dt):
        return dt - timedelta(hours=1)
    return dt

def generate_ics():
    with open(CALENDAR_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    matches = [
        m for m in data.get("matches", [])
        if "centinela" in m.get("home", "").lower()
        or "centinela" in m.get("away", "").lower()
        or m.get("homeId") == "ud-centinela"
        or m.get("awayId") == "ud-centinela"
    ]
    matches.sort(key=lambda x: x.get("roundNumber", 0))

    now_utc = datetime.now(timezone.utc)

    # 1. Calendario de temporada completa (RFC 5545 oficial)
    full_cal = icalendar.Calendar()
    full_cal.add("prodid", "-//UD Centinela//Calendario Oficial 2026-2027//ES")
    full_cal.add("version", "2.0")
    full_cal.add("calscale", "GREGORIAN")
    full_cal.add("method", "PUBLISH")
    full_cal.add("x-wr-calname", "UD Centinela - Partidos 2026/27")
    full_cal.add("x-wr-caldesc", "Calendario oficial de partidos del primer equipo de la UD Centinela en Segunda Regional Tenerife (Temporada 2026/27)")
    full_cal.add("x-wr-timezone", "Atlantic/Canary")

    ics_dir = os.path.join(BASE_DIR, "assets", "ics")
    os.makedirs(ics_dir, exist_ok=True)

    next_match_raw = None

    for m in matches:
        jornada = m.get("roundNumber", 1)
        d, mo, y = [int(x) for x in m.get("date", "19/09/2026").split("/")]
        time_str = m.get("time", "21:00")
        h, mi = [int(x) for x in time_str.split(":")]
        dt_local = datetime(y, mo, d, h, mi)
        dt_utc_start = canary_to_utc(dt_local).replace(tzinfo=timezone.utc)
        dt_utc_end = dt_utc_start + timedelta(minutes=105)

        home = m.get("home", "")
        away = m.get("away", "")
        is_home = (m.get("homeId") == "ud-centinela") or ("centinela" in home.lower())
        raw_venue = m.get("venue", "").strip()
        venue = VENUE_MAP.get(raw_venue, raw_venue if raw_venue else ("Estadio Municipal El Molino, Icod de los Vinos" if is_home else "Tenerife, Islas Canarias"))

        opponent = away if is_home else home
        summary = f"UD Centinela vs {opponent} (J{jornada})" if is_home else f"{opponent} vs UD Centinela (J{jornada})"
        home_away_text = "Casa" if is_home else "Fuera"

        desc = (
            f"Segunda Regional Tenerife - Jornada {jornada}\n"
            f"{home} vs {away}\n"
            f"Condicion: {home_away_text}\n"
            f"Campo: {venue}\n"
            f"Hora: {time_str} (hora canaria)\n\n"
            f"Web oficial: https://udcentinela.github.io/calendario/\n"
            f"Aupa Centinela!"
        )

        ev = icalendar.Event()
        ev.add("uid", f"match-j{jornada}-2026-2027@udcentinela.github.io")
        ev.add("dtstamp", now_utc)
        ev.add("dtstart", dt_utc_start)
        ev.add("dtend", dt_utc_end)
        ev.add("summary", summary)
        ev.add("location", venue)
        ev.add("description", desc)
        ev.add("status", "CONFIRMED")
        ev.add("transp", "OPAQUE")

        alarm = icalendar.Alarm()
        alarm.add("action", "DISPLAY")
        alarm.add("description", f"Recordatorio: {summary}")
        alarm.add("trigger", icalendar.vDuration(timedelta(hours=-2)))
        ev.add_component(alarm)

        full_cal.add_component(ev)

        # 2. Calendario individual para móviles (Xiaomi Mi Calendario / Android / iPhone)
        single_cal = icalendar.Calendar()
        single_cal.add("prodid", "-//UD Centinela//ES")
        single_cal.add("version", "2.0")
        single_cal.add("calscale", "GREGORIAN")
        single_cal.add_component(ev)

        single_raw = single_cal.to_ical()
        with open(os.path.join(ics_dir, f"jornada-{jornada}.ics"), "wb") as f:
            f.write(single_raw)
        with open(os.path.join(ics_dir, f"j{jornada}.ics"), "wb") as f:
            f.write(single_raw)

        if next_match_raw is None and (m.get("status") == "upcoming" or m.get("homeScore") is None):
            next_match_raw = single_raw

    # Guardar calendarios de temporada completa en modo binario
    full_raw = full_cal.to_ical()
    with open(OUTPUT_ICS, "wb") as f:
        f.write(full_raw)
    with open(OUTPUT_ICS_ALIAS, "wb") as f:
        f.write(full_raw)

    # Si no hay próximo partido futuro, tomar el primero
    if next_match_raw is None and matches:
        first_cal = icalendar.Calendar()
        first_cal.add("prodid", "-//UD Centinela//ES")
        first_cal.add("version", "2.0")
        first_cal.add("calscale", "GREGORIAN")
        # take first event from full_cal
        first_ev = full_cal.walk("vevent")[0]
        first_cal.add_component(first_ev)
        next_match_raw = first_cal.to_ical()

    if next_match_raw:
        proximo_file = os.path.join(BASE_DIR, "assets", "ud-centinela-proximo-partido.ics")
        with open(proximo_file, "wb") as f:
            f.write(next_match_raw)

    print(f"Generado con éxito: {OUTPUT_ICS} ({len(matches)} partidos, {len(full_raw)} bytes)")
    print(f"Generado con éxito: {OUTPUT_ICS_ALIAS}")
    print(f"Generados {len(matches)} archivos individuales en {ics_dir}")

if __name__ == "__main__":
    generate_ics()
