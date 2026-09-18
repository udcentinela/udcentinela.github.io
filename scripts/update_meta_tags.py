#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Estandarizador de etiquetas Open Graph, Twitter Cards y SEO para WhatsApp, Telegram y redes sociales.
Coloca los tags limpios, completos y al inicio del <head> para garantizar que el scraper de WhatsApp
los indexe siempre correctamente.
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYERS_JSON = os.path.join(BASE_DIR, "assets", "data", "players.json")

with open(PLAYERS_JSON, "r", encoding="utf-8") as f:
    players_data = json.load(f).get("players", [])

players_by_slug = {}
for p in players_data:
    slug = p.get("slug", p.get("id"))
    players_by_slug[slug] = p
    # Also index by id
    players_by_slug[p.get("id")] = p

# Alias mappings
players_by_slug["salva"] = players_by_slug.get("salvador")
players_by_slug["joseangel"] = players_by_slug.get("jose-angel")

def generate_player_meta(slug, player):
    name = player.get("fullName") or player.get("name") or slug.capitalize()
    dorsal = player.get("dorsal")
    role = player.get("position") or player.get("role") or "Jugador"
    is_staff = any(x in role.lower() for x in ["entrenador", "técnico", "fisico", "físico", "staff", "preparador"])

    if dorsal is not None and str(dorsal).strip():
        title = f"{name} #{dorsal} · {role} | UD Centinela"
        dorsal_text = f"Dorsal #{dorsal} · "
    elif is_staff:
        title = f"{name} · {role} | UD Centinela"
        dorsal_text = ""
    else:
        title = f"{name} · {role} | UD Centinela"
        dorsal_text = ""

    if is_staff:
        description = f"Ficha oficial de {name} ({role}) en el cuerpo técnico de la UD Centinela para la temporada 2026/27 en Segunda Regional de Tenerife."
        og_type = "profile"
    else:
        description = f"Ficha oficial de {name} en la UD Centinela (Temporada 2026/27). {dorsal_text}{role}. Estadísticas, trayectoria y perfil del jugador."
        og_type = "profile"

    url = f"https://udcentinela.github.io/regional/{slug}/"
    img_url = f"https://udcentinela.github.io/assets/img/og/players/{slug}.jpg"
    alt_text = f"Ficha oficial de {name} - UD Centinela"

    return title, description, url, img_url, og_type, alt_text

SECTION_META = {
    "index.html": {
        "title": "UD Centinela | Web Oficial · El Gigante de Icod de los Vinos",
        "description": "Web oficial de la Unión Deportiva Centinela (fundada en 1955). Noticias, plantilla de Segunda Regional, calendario de partidos, resultados y clasificación oficial.",
        "url": "https://udcentinela.github.io/",
        "image": "https://udcentinela.github.io/assets/img/og/home.jpg",
        "type": "website",
        "alt": "Unión Deportiva Centinela - Web Oficial"
    },
    "calendario/index.html": {
        "title": "UD Centinela | Calendario Oficial 2026/2027",
        "description": "Calendario oficial completo de la UD Centinela en Segunda Regional: fechas, horarios, estadios y resultados. Sincroniza todos los partidos con tu móvil (iPhone y Android).",
        "url": "https://udcentinela.github.io/calendario/",
        "image": "https://udcentinela.github.io/assets/img/og/calendario.jpg",
        "type": "website",
        "alt": "Calendario oficial UD Centinela 2026/2027"
    },
    "clasificacion/index.html": {
        "title": "UD Centinela | Clasificación Oficial 2026/2027",
        "description": "Clasificación oficial en directo del Grupo 1 de Segunda Regional de Tenerife. Puntos, partidos jugados, victorias, goles a favor y en contra.",
        "url": "https://udcentinela.github.io/clasificacion/",
        "image": "https://udcentinela.github.io/assets/img/og/clasificacion.jpg",
        "type": "website",
        "alt": "Clasificación oficial Segunda Regional Grupo 1"
    },
    "regional/index.html": {
        "title": "UD Centinela | Plantilla Oficial 2026/2027",
        "description": "Plantilla oficial de la UD Centinela en su regreso a la competición: jugadores, dorsales, posiciones, cuerpo técnico, estadísticas y perfiles individuales.",
        "url": "https://udcentinela.github.io/regional/",
        "image": "https://udcentinela.github.io/assets/img/og/plantilla.jpg",
        "type": "website",
        "alt": "Plantilla oficial UD Centinela 2026/2027"
    },
    "regional/cuerpo-tecnico/index.html": {
        "title": "UD Centinela | Cuerpo Técnico Oficial 2026/2027",
        "description": "Cuerpo técnico oficial de la UD Centinela: Juan Manuel (1er Entrenador), Toño (2º Entrenador) y Joel (Staff / Preparación Física). Liderando el regreso rojinegro.",
        "url": "https://udcentinela.github.io/regional/cuerpo-tecnico/",
        "image": "https://udcentinela.github.io/assets/img/og/cuerpo-tecnico.jpg",
        "type": "profile",
        "alt": "Cuerpo técnico UD Centinela 2026/2027"
    },
    "noticias/index.html": {
        "title": "UD Centinela | Noticias y Actualidad",
        "description": "Últimas noticias, crónicas de partidos, anuncios de fichajes, comunicados oficiales e historia viva de la Unión Deportiva Centinela.",
        "url": "https://udcentinela.github.io/noticias/",
        "image": "https://udcentinela.github.io/assets/img/og/noticias.jpg",
        "type": "website",
        "alt": "Noticias UD Centinela"
    },
    "patrocinios/index.html": {
        "title": "UD Centinela | Patrocinadores y Empresas Colaboradoras",
        "description": "Empresas, patrocinadores y comercios locales que apoyan el proyecto del Centinela en la temporada 2026/2027. ¡Gracias por creer en nuestro fútbol!",
        "url": "https://udcentinela.github.io/patrocinios/",
        "image": "https://udcentinela.github.io/assets/img/og/patrocinios.jpg",
        "type": "website",
        "alt": "Patrocinadores UD Centinela"
    },
    "historia/index.html": {
        "title": "UD Centinela | Historia y Legado desde 1955",
        "description": "Conoce la historia del primer gigante de Icod de los Vinos, fundado en 1955. La pasión, los ascensos y la memoria que revive hoy con más fuerza que nunca.",
        "url": "https://udcentinela.github.io/historia/",
        "image": "https://udcentinela.github.io/assets/img/og/historia.jpg",
        "type": "website",
        "alt": "Historia y legado de la UD Centinela"
    },
    "identidad/index.html": {
        "title": "UD Centinela | Identidad, Escudo y Símbolos",
        "description": "El escudo, los colores rojinegros y el espíritu de lucha que definen a la Unión Deportiva Centinela. Los valores del fútbol icodense.",
        "url": "https://udcentinela.github.io/identidad/",
        "image": "https://udcentinela.github.io/assets/img/og/identidad.jpg",
        "type": "website",
        "alt": "Identidad y símbolos de la UD Centinela"
    }
}

def build_meta_block(title, description, url, image, og_type, alt_text):
    return (
        f'    <title>{title}</title>\n'
        f'    <meta name="description" content="{description}">\n'
        f'    <meta name="robots" content="index, follow">\n'
        f'    <link rel="canonical" href="{url}">\n'
        f'    \n'
        f'    <!-- Open Graph / WhatsApp / Facebook -->\n'
        f'    <meta property="og:site_name" content="UD Centinela">\n'
        f'    <meta property="og:locale" content="es_ES">\n'
        f'    <meta property="og:type" content="{og_type}">\n'
        f'    <meta property="og:title" content="{title}">\n'
        f'    <meta property="og:description" content="{description}">\n'
        f'    <meta property="og:url" content="{url}">\n'
        f'    <meta property="og:image" content="{image}">\n'
        f'    <meta property="og:image:secure_url" content="{image}">\n'
        f'    <meta property="og:image:type" content="image/jpeg">\n'
        f'    <meta property="og:image:width" content="1200">\n'
        f'    <meta property="og:image:height" content="630">\n'
        f'    <meta property="og:image:alt" content="{alt_text}">\n'
        f'    \n'
        f'    <!-- Twitter Cards -->\n'
        f'    <meta name="twitter:card" content="summary_large_image">\n'
        f'    <meta name="twitter:title" content="{title}">\n'
        f'    <meta name="twitter:description" content="{description}">\n'
        f'    <meta name="twitter:image" content="{image}">\n'
    )

def clean_and_inject_meta(filepath, meta_block):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Remove existing title, canonical, and og/twitter/description meta tags
    # Remove title
    content = re.sub(r'<title>[^<]*</title>\s*', '', content, flags=re.IGNORECASE)
    # Remove existing canonical
    content = re.sub(r'<link\s+rel=[\'"]canonical[\'"][^>]*>\s*', '', content, flags=re.IGNORECASE)
    # Remove existing description, robots
    content = re.sub(r'<meta\s+name=[\'"]description[\'"][^>]*>\s*', '', content, flags=re.IGNORECASE)
    content = re.sub(r'<meta\s+name=[\'"]robots[\'"][^>]*>\s*', '', content, flags=re.IGNORECASE)
    # Remove all og: and twitter: tags
    content = re.sub(r'<meta\s+property=[\'"]og:[^\'"]*[\'"][^>]*>\s*', '', content, flags=re.IGNORECASE)
    content = re.sub(r'<meta\s+name=[\'"]twitter:[^\'"]*[\'"][^>]*>\s*', '', content, flags=re.IGNORECASE)

    # 2. Inject meta_block right after viewport (or after charset)
    viewport_match = re.search(r'(<meta\s+name=[\'"]viewport[\'"][^>]*>\s*)', content, flags=re.IGNORECASE)
    if viewport_match:
        insert_pos = viewport_match.end()
        new_content = content[:insert_pos] + meta_block + content[insert_pos:]
    else:
        # fallback: right after <head>
        head_match = re.search(r'(<head[^>]*>\s*)', content, flags=re.IGNORECASE)
        if head_match:
            insert_pos = head_match.end()
            new_content = content[:insert_pos] + meta_block + content[insert_pos:]
        else:
            print(f"Error: No <head> in {filepath}")
            return False

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
    return True

def process_all():
    print("=== Actualizando etiquetas meta en HTMLs ===")

    # 1. Main sections
    for rel_path, meta in SECTION_META.items():
        fpath = os.path.join(BASE_DIR, rel_path.replace("/", os.sep))
        if os.path.exists(fpath):
            block = build_meta_block(meta["title"], meta["description"], meta["url"], meta["image"], meta["type"], meta["alt"])
            clean_and_inject_meta(fpath, block)
            print(f"  [Sección OK] {rel_path}")

    # 2. Players & Staff in regional/*/index.html
    regional_dir = os.path.join(BASE_DIR, "regional")
    for entry in os.listdir(regional_dir):
        sub_dir = os.path.join(regional_dir, entry)
        if not os.path.isdir(sub_dir):
            continue
        index_file = os.path.join(sub_dir, "index.html")
        if not os.path.exists(index_file):
            continue

        slug = entry
        if slug in SECTION_META:
            continue
        if slug == "cuerpo-tecnico":
            # Handled in sections or specifically
            continue

        player = players_by_slug.get(slug)
        if not player:
            # Fallback player structure
            player = {"name": slug.replace("-", " ").title(), "slug": slug}

        title, desc, url, img_url, og_type, alt = generate_player_meta(slug, player)
        block = build_meta_block(title, desc, url, img_url, og_type, alt)
        clean_and_inject_meta(index_file, block)
        print(f"  [Perfil OK]  regional/{slug}/index.html -> {title[:35]}...")

    # 3. News articles in noticias/*/index.html
    noticias_dir = os.path.join(BASE_DIR, "noticias")
    for entry in os.listdir(noticias_dir):
        sub_dir = os.path.join(noticias_dir, entry)
        if not os.path.isdir(sub_dir):
            continue
        index_file = os.path.join(sub_dir, "index.html")
        if not os.path.exists(index_file):
            continue
        if entry in ["admin", "login"]:
            continue

        url = f"https://udcentinela.github.io/noticias/{entry}/"

        if entry.startswith("nuevo-fichaje-"):
            raw_slug = entry.replace("nuevo-fichaje-", "")
            if raw_slug == "cristian-colcho":
                p_slug = "colcho"
            elif raw_slug == "sergio-champi":
                p_slug = "champi"
            elif raw_slug == "yeray-melon":
                p_slug = "yeray"
            else:
                p_slug = raw_slug

            p = players_by_slug.get(p_slug, {})
            name = p.get("fullName") or p.get("name") or p_slug.capitalize()
            role = p.get("position") or p.get("role") or "Jugador"
            dorsal = p.get("dorsal")
            dorsal_str = f" (#{dorsal})" if dorsal else ""

            title = f"UD Centinela | Nuevo Fichaje: {name}{dorsal_str}"
            desc = f"La Unión Deportiva Centinela incorpora a {name} ({role}) para la temporada 2026/27 en Segunda Regional de Tenerife."
            img = f"https://udcentinela.github.io/assets/img/og/players/{p_slug}.jpg"
            alt = f"Nuevo Fichaje UD Centinela - {name}"
        elif entry == "centinela-vuelve-regional":
            title = "UD Centinela | El Centinela vuelve a mirar a los ojos al fútbol regional"
            desc = "El histórico club icodense regresa a la competición tras más de seis décadas, ilusionando a toda la afición del norte de Tenerife."
            img = "https://udcentinela.github.io/assets/img/og/noticias.jpg"
            alt = "El regreso del Centinela a regional"
        elif entry == "memoria-viva-icod":
            title = "UD Centinela | La memoria viva del fútbol en Icod de los Vinos"
            desc = "Un repaso emotivo a las raíces, los pioneros y el legado histórico que forjaron la leyenda del Centinela desde 1955."
            img = "https://udcentinela.github.io/assets/img/og/historia.jpg"
            alt = "Memoria viva del fútbol icodense"
        elif entry == "plantilla-en-construccion":
            title = "UD Centinela | La plantilla entra en su fase definitiva de preparación"
            desc = "Conoce cómo avanza la confección del equipo para el inicio del campeonato en Segunda Regional."
            img = "https://udcentinela.github.io/assets/img/og/plantilla.jpg"
            alt = "Plantilla UD Centinela en preparación"
        else:
            title = f"UD Centinela | {entry.replace('-', ' ').title()}"
            desc = "Actualidad, noticias y comunicados oficiales de la Unión Deportiva Centinela."
            img = "https://udcentinela.github.io/assets/img/og/noticias.jpg"
            alt = "Noticia UD Centinela"

        block = build_meta_block(title, desc, url, img, "article", alt)
        clean_and_inject_meta(index_file, block)
        print(f"  [Noticia OK] noticias/{entry}/index.html")

if __name__ == "__main__":
    process_all()
