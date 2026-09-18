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

def is_canary_dst(dt):
    # In Canary Islands: DST starts last Sunday of March, ends last Sunday of October
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

def generate_single_match_ics(m, now_stamp):
    jornada = m.get("roundNumber", 1)
    date_str = m.get("date", "")
    time_str = m.get("time", "21:00")
    home = m.get("home", "")
    away = m.get("away", "")
    raw_venue = m.get("venue", "").strip()

    is_home = (m.get("homeId") == "ud-centinela") or ("centinela" in home.lower())
    venue = VENUE_MAP.get(raw_venue, raw_venue if raw_venue else ("Estadio Municipal El Molino, Icod de los Vinos" if is_home else "Tenerife, Islas Canarias"))

    try:
        day, month, year = [int(x) for x in date_str.split("/")]
        hour, minute = [int(x) for x in time_str.split(":")]
        dt_local_start = datetime(year, month, day, hour, minute)
        dt_local_end = dt_local_start + timedelta(minutes=105)
    except Exception as e:
        print(f"Error parsing date for single match J{jornada}: {e}")
        return None

    dt_utc_start = canary_to_utc(dt_local_start)
    dt_utc_end = canary_to_utc(dt_local_end)

    dtstart_str = dt_utc_start.strftime("%Y%m%dT%H%M%SZ")
    dtend_str = dt_utc_end.strftime("%Y%m%dT%H%M%SZ")

    opponent = away if is_home else home
    home_away_badge = "🏠 Casa" if is_home else "✈️ Fuera"
    summary = f"⚽ UD Centinela vs {opponent} (J{jornada})" if is_home else f"⚽ {opponent} vs UD Centinela (J{jornada})"

    description_lines = [
        f"🏆 Segunda Regional Tenerife - Jornada {jornada}",
        f"⚔️ {home} vs {away}",
        f"📍 {home_away_badge} · {venue}",
        f"⏰ Hora: {time_str} (hora canaria)",
        "",
        "ℹ️ Web oficial UD Centinela:",
        "https://udcentinela.github.io/calendario/",
        "",
        "¡Aupa Centinela! 🔴⚫"
    ]
    description = clean_ics_text("\n".join(description_lines))
    uid = f"match-j{jornada}-2026-2027@udcentinela.github.io"

    # Ultra-clean single-event format: NO METHOD:PUBLISH, NO VTIMEZONE, pure UTC
    # Compatible with Xiaomi Mi Calendar (MIUI/HyperOS), Google Calendar, Samsung, iOS
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//UD Centinela//ES",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{now_stamp}",
        f"DTSTART:{dtstart_str}",
        f"DTEND:{dtend_str}",
        f"SUMMARY:{clean_ics_text(summary)}",
        f"LOCATION:{clean_ics_text(venue)}",
        f"DESCRIPTION:{description}",
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "BEGIN:VALARM",
        "TRIGGER:-PT2H",
        "ACTION:DISPLAY",
        f"DESCRIPTION:Recordatorio: {clean_ics_text(summary)}",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR"
    ]
    return "\r\n".join(lines) + "\r\n"

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

    centinela_matches.sort(key=lambda x: x.get("roundNumber", 0))

    now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    # 1. Full Season ICS
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
        "X-PUBLISHED-TTL:P1D"
    ]

    for m in centinela_matches:
        jornada = m.get("roundNumber", 1)
        date_str = m.get("date", "")
        time_str = m.get("time", "21:00")
        home = m.get("home", "")
        away = m.get("away", "")
        raw_venue = m.get("venue", "").strip()

        is_home = (m.get("homeId") == "ud-centinela") or ("centinela" in home.lower())
        venue = VENUE_MAP.get(raw_venue, raw_venue if raw_venue else ("Estadio Municipal El Molino, Icod de los Vinos" if is_home else "Tenerife, Islas Canarias"))

        try:
            day, month, year = [int(x) for x in date_str.split("/")]
            hour, minute = [int(x) for x in time_str.split(":")]
            dt_local_start = datetime(year, month, day, hour, minute)
            dt_local_end = dt_local_start + timedelta(minutes=105)
        except Exception as e:
            print(f"Error parsing date for match J{jornada}: {e}")
            continue

        dt_utc_start = canary_to_utc(dt_local_start)
        dt_utc_end = canary_to_utc(dt_local_end)

        dtstart_str = dt_utc_start.strftime("%Y%m%dT%H%M%SZ")
        dtend_str = dt_utc_end.strftime("%Y%m%dT%H%M%SZ")

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
            f"DTSTART:{dtstart_str}",
            f"DTEND:{dtend_str}",
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

    # 2. Generate Individual Match ICS files in assets/ics/
    ics_dir = os.path.join(BASE_DIR, "assets", "ics")
    os.makedirs(ics_dir, exist_ok=True)

    next_upcoming = None
    for m in centinela_matches:
        jornada = m.get("roundNumber", 1)
        single_ics = generate_single_match_ics(m, now_stamp)
        if single_ics:
            match_file = os.path.join(ics_dir, f"jornada-{jornada}.ics")
            with open(match_file, "w", encoding="utf-8") as f:
                f.write(single_ics)
            # Also keep short alias j{n}.ics
            with open(os.path.join(ics_dir, f"j{jornada}.ics"), "w", encoding="utf-8") as f:
                f.write(single_ics)

        if next_upcoming is None and (m.get("status") == "upcoming" or m.get("homeScore") is None):
            next_upcoming = m

    # 3. Generate Next Match ICS file (ideal for Xiaomi 1-click add)
    if next_upcoming is None and centinela_matches:
        next_upcoming = centinela_matches[0]

    if next_upcoming:
        next_ics = generate_single_match_ics(next_upcoming, now_stamp)
        if next_ics:
            next_file = os.path.join(BASE_DIR, "assets", "ud-centinela-proximo-partido.ics")
            with open(next_file, "w", encoding="utf-8") as f:
                f.write(next_ics)
            print(f"Generado con éxito: {next_file} (Jornada {next_upcoming.get('roundNumber', 1)})")

if __name__ == "__main__":
    generate_ics()
