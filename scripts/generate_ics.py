#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de archivos iCalendar (.ics) para la UD Centinela.
Genera el calendario oficial de todos los partidos de la temporada 2026/2027
compatible con Apple Calendar (iPhone, Mac), Google Calendar (Android, Web),
Samsung Calendar y Outlook.
"""

import json
import os
from datetime import datetime, timedelta, timezone

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

def clean_ics_text(text):
    if not text:
        return ""
    # RFC 5545 escaping for text fields
    return text.replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\n', '\\n')

def generate_ics():
    with open(CALENDAR_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    matches = data.get("matches", [])
    centinela_matches = []
    for m in matches:
        home_id = m.get("homeId", "")
        away_id = m.get("awayId", "")
        home_name = m.get("home", "").lower()
        away_name = m.get("away", "").lower()
        if home_id == "ud-centinela" or away_id == "ud-centinela" or "centinela" in home_name or "centinela" in away_name:
            centinela_matches.append(m)

    # Sort by round number
    centinela_matches.sort(key=lambda x: x.get("roundNumber", 0))

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//UD Centinela//Calendario Oficial 2026-2027//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:UD Centinela - Partidos 2026/27",
        "X-WR-CALDESC:Calendario oficial de partidos del primer equipo de la UD Centinela en Segunda Regional de Tenerife (Temporada 2026/27).",
        "X-WR-TIMEZONE:Atlantic/Canary",
        "REFRESH-INTERVAL;VALUE=DURATION:P1D",
        "X-PUBLISHED-TTL:P1D",
        "BEGIN:VTIMEZONE",
        "TZID:Atlantic/Canary",
        "X-LIC-LOCATION:Atlantic/Canary",
        "BEGIN:STANDARD",
        "TZOFFSETFROM:+0100",
        "TZOFFSETTO:+0000",
        "TZNAME:WET",
        "DTSTART:19701025T020000",
        "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
        "END:STANDARD",
        "BEGIN:DAYLIGHT",
        "TZOFFSETFROM:+0000",
        "TZOFFSETTO:+0100",
        "TZNAME:WEST",
        "DTSTART:19700329T010000",
        "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
        "END:DAYLIGHT",
        "END:VTIMEZONE"
    ]

    now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    for m in centinela_matches:
        jornada = m.get("roundNumber", 1)
        date_str = m.get("date", "")  # DD/MM/YYYY
        time_str = m.get("time", "21:00")  # HH:MM
        home = m.get("home", "")
        away = m.get("away", "")
        raw_venue = m.get("venue", "").strip()

        is_home = (m.get("homeId") == "ud-centinela") or ("centinela" in home.lower())
        venue = VENUE_MAP.get(raw_venue, raw_venue if raw_venue else ("Estadio Municipal El Molino, Icod de los Vinos" if is_home else "Tenerife, Islas Canarias"))

        try:
            day, month, year = [int(x) for x in date_str.split("/")]
            hour, minute = [int(x) for x in time_str.split(":")]
            dt_start = datetime(year, month, day, hour, minute)
            dt_end = dt_start + timedelta(minutes=105) # 1h 45m
        except Exception as e:
            print(f"Error parsing date for match J{jornada}: {e}")
            continue

        dtstart_str = dt_start.strftime("%Y%m%dT%H%M%S")
        dtend_str = dt_end.strftime("%Y%m%dT%H%M%S")

        opponent = away if is_home else home
        home_away_badge = "🏠 Casa" if is_home else "✈️ Fuera"
        summary = f"⚽ UD Centinela vs {opponent} (J{jornada})" if is_home else f"⚽ {opponent} vs UD Centinela (J{jornada})"

        description_lines = [
            f"🏆 Segunda Regional Tenerife 2026/27 - Jornada {jornada}",
            f"⚔️ {home} vs {away}",
            f"📍 {home_away_badge} · {venue}",
            f"⏰ Hora: {time_str} (hora canaria)",
            "",
            "ℹ️ Sigue el partido, resultados y clasificación en directo:",
            "👉 https://udcentinela.github.io/calendario/",
            "",
            "¡Aupa Centinela! 🔴⚫"
        ]
        description = clean_ics_text("\n".join(description_lines))

        uid = f"match-j{jornada}-2026-2027@udcentinela.github.io"

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{now_stamp}",
            f"DTSTART;TZID=Atlantic/Canary:{dtstart_str}",
            f"DTEND;TZID=Atlantic/Canary:{dtend_str}",
            f"SUMMARY:{clean_ics_text(summary)}",
            f"LOCATION:{clean_ics_text(venue)}",
            f"DESCRIPTION:{description}",
            "STATUS:CONFIRMED",
            "TRANSP:OPAQUE",
            "SEQUENCE:0",
            "BEGIN:VALARM",
            "TRIGGER:-PT2H",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Recordatorio: {clean_ics_text(summary)} en 2 horas",
            "END:VALARM",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(lines) + "\r\n"

    with open(OUTPUT_ICS, "w", encoding="utf-8") as f:
        f.write(ics_content)
    with open(OUTPUT_ICS_ALIAS, "w", encoding="utf-8") as f:
        f.write(ics_content)

    print(f"Generado con éxito: {OUTPUT_ICS} ({len(centinela_matches)} partidos)")
    print(f"Generado con éxito: {OUTPUT_ICS_ALIAS}")

if __name__ == "__main__":
    generate_ics()
