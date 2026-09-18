#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador automático de tarjetas de previsualización social (Open Graph / WhatsApp / Twitter)
para la UD Centinela en formato 1200x630 JPEG optimizado (<150KB).
Crea tarjetas para:
1. Todos los jugadores y cuerpo técnico de la plantilla
2. Secciones principales: Inicio, Calendario, Clasificación, Plantilla, Cuerpo Técnico, Noticias, Patrocinios, Historia, Identidad
"""

import json
import os
import unicodedata
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYERS_JSON = os.path.join(BASE_DIR, "assets", "data", "players.json")
OG_DIR = os.path.join(BASE_DIR, "assets", "img", "og")
OG_PLAYERS_DIR = os.path.join(OG_DIR, "players")

os.makedirs(OG_PLAYERS_DIR, exist_ok=True)

SHIELD_PATH = os.path.join(BASE_DIR, "assets", "img", "escudo-centinela.webp")
HERO_SHIELD_PATH = os.path.join(BASE_DIR, "assets", "img", "logo-hero.webp")

def normalize_ascii(text):
    if not text:
        return ""
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')

def create_base_canvas(width=1200, height=630, glow_theme="blue_red"):
    bg = Image.new('RGB', (width, height), (3, 7, 18))  # #030712
    glow_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)

    if glow_theme == "blue_red":
        glow_draw.ellipse([700, 80, 1150, 530], fill=(0, 240, 255, 55))
        glow_draw.ellipse([480, 40, 950, 510], fill=(30, 58, 138, 85))
        glow_draw.ellipse([-100, 320, 400, 720], fill=(185, 28, 28, 45))
    elif glow_theme == "gold_blue":
        glow_draw.ellipse([700, 80, 1150, 530], fill=(234, 179, 8, 50))
        glow_draw.ellipse([450, 40, 950, 510], fill=(30, 58, 138, 85))
        glow_draw.ellipse([-100, 320, 400, 720], fill=(217, 119, 6, 40))
    elif glow_theme == "cyan_only":
        glow_draw.ellipse([650, 80, 1150, 530], fill=(0, 240, 255, 65))
        glow_draw.ellipse([350, 40, 850, 510], fill=(14, 116, 144, 80))

    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(80))
    bg.paste(glow_layer, (0, 0), glow_layer)

    card = bg.convert('RGBA')

    # Border framing lines
    accent_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent_layer)
    accent_draw.line([(0, 60), (width, 60)], fill=(255, 255, 255, 15), width=1)
    accent_draw.line([(0, height - 70), (width, height - 70)], fill=(255, 255, 255, 15), width=1)
    card.alpha_composite(accent_layer)

    # Watermark shield in background
    if os.path.exists(SHIELD_PATH):
        shield = Image.open(SHIELD_PATH).convert('RGBA')
        wm = shield.resize((420, 420), Image.Resampling.LANCZOS)
        wm_alpha = wm.split()[3].point(lambda p: int(p * 0.08))
        wm.putalpha(wm_alpha)
        card.alpha_composite(wm, (50, 110))

        # Top left official crest badge
        badge = shield.resize((70, 70), Image.Resampling.LANCZOS)
        card.alpha_composite(badge, (60, 25))

    return card

def render_player_card(player):
    card = create_base_canvas(glow_theme="blue_red")
    width, height = card.size

    # Load and composite player cutout photo
    raw_img = player.get("image", "").lstrip("/")
    img_path = os.path.join(BASE_DIR, raw_img)
    if not os.path.exists(img_path):
        # Check alternative locations
        slug = player.get("slug", player.get("id"))
        cand1 = os.path.join(BASE_DIR, "assets", "img", f"{slug}.webp")
        cand2 = os.path.join(BASE_DIR, "assets", "img", "players", f"{slug}.webp")
        if os.path.exists(cand1):
            img_path = cand1
        elif os.path.exists(cand2):
            img_path = cand2

    if os.path.exists(img_path):
        try:
            pimg = Image.open(img_path).convert('RGBA')
            target_h = 580
            aspect = pimg.width / pimg.height
            target_w = int(target_h * aspect)
            # Avoid too wide
            if target_w > 560:
                target_w = 560
                target_h = int(target_w / aspect)
            pimg_resized = pimg.resize((target_w, target_h), Image.Resampling.LANCZOS)

            pos_x = width - target_w - 40
            pos_y = height - target_h

            shadow = Image.new('RGBA', pimg_resized.size, (0, 0, 0, 180))
            shadow.putalpha(pimg_resized.split()[3])
            shadow = shadow.filter(ImageFilter.GaussianBlur(25))
            card.alpha_composite(shadow, (pos_x + 15, pos_y + 15))
            card.alpha_composite(pimg_resized, (pos_x, pos_y))

            # Bottom gradient fade
            bottom_fade = Image.new('RGBA', (width, 80), (0, 0, 0, 0))
            bf_draw = ImageDraw.Draw(bottom_fade)
            for y in range(80):
                alpha = int(255 * (y / 80.0) ** 1.5)
                bf_draw.line([(0, y), (width, y)], fill=(3, 7, 18, alpha))
            card.alpha_composite(bottom_fade, (0, height - 80))
        except Exception as e:
            print(f"Error loading image {img_path}: {e}")

    draw = ImageDraw.Draw(card)

    font_brand = ImageFont.truetype('arialbd.ttf', 24)
    font_season = ImageFont.truetype('arialbd.ttf', 16)
    font_name = ImageFont.truetype('arialbd.ttf', 60 if len(player.get("name", "")) <= 10 else 46)
    font_dorsal = ImageFont.truetype('arialbd.ttf', 36)
    font_position = ImageFont.truetype('arialbd.ttf', 20)
    font_desc = ImageFont.truetype('arial.ttf', 22)
    font_meta = ImageFont.truetype('arialbd.ttf', 17)
    font_url = ImageFont.truetype('arialbd.ttf', 17)

    # Top Brand
    draw.text((145, 33), "UD CENTINELA", font=font_brand, fill=(255, 255, 255, 255))
    draw.text((145, 62), "ICOD DE LOS VINOS · REGIONAL TENERIFE", font=font_season, fill=(0, 240, 255, 220))

    # Season pill
    draw.rounded_rectangle([60, 130, 290, 168], radius=8, fill=(15, 23, 42, 220), outline=(59, 130, 246, 120), width=1)
    draw.text((75, 140), "TEMPORADA 2026 / 2027", font=font_season, fill=(148, 163, 184, 255))

    # Dorsal / Role pill
    dorsal = player.get("dorsal")
    role_text = player.get("position") or player.get("role") or "Jugador"
    pos_x = 60

    if dorsal is not None and str(dorsal).strip():
        dorsal_str = f"#{dorsal}"
        draw.rounded_rectangle([pos_x, 195, pos_x + 85, 255], radius=10, fill=(225, 29, 72, 255))
        draw.text((pos_x + 16, 204), dorsal_str, font=font_dorsal, fill=(255, 255, 255, 255))
        pos_x += 98
    else:
        is_staff = any(x in role_text.lower() for x in ["entrenador", "técnico", "fisico", "físico", "staff", "preparador"])
        badge_tag = "STAFF" if is_staff else "UDC"
        fill_color = (15, 23, 42, 255) if is_staff else (225, 29, 72, 255)
        draw.rounded_rectangle([pos_x, 195, pos_x + 95, 255], radius=10, fill=fill_color, outline=(0, 240, 255, 140), width=1)
        draw.text((pos_x + 14, 207), badge_tag, font=ImageFont.truetype('arialbd.ttf', 24), fill=(255, 255, 255, 255))
        pos_x += 108

    # Role / Position pill
    role_w = min(420, max(220, len(role_text) * 14 + 40))
    draw.rounded_rectangle([pos_x, 195, pos_x + role_w, 255], radius=10, fill=(15, 23, 42, 230), outline=(0, 240, 255, 140), width=1)
    draw.text((pos_x + 18, 214), role_text.upper(), font=font_position, fill=(0, 240, 255, 255))

    # Player Name
    name_str = player.get("fullName") or player.get("name") or "Jugador"
    draw.text((60, 280), name_str.upper(), font=font_name, fill=(255, 255, 255, 255))

    # Accent line
    draw.line([(60, 360), (280, 360)], fill=(0, 240, 255, 255), width=4)

    # Details
    draw.text((60, 390), "Ficha oficial en Segunda Regional de Tenerife", font=font_desc, fill=(226, 232, 240, 255))
    draw.text((60, 430), "Unión Deportiva Centinela · El Gigante de Icod", font=font_meta, fill=(148, 163, 184, 255))
    draw.text((60, 460), "Estadio Municipal El Molino", font=font_meta, fill=(96, 165, 250, 255))

    # Bottom URL footer
    slug = player.get("slug", player.get("id"))
    draw.text((60, 580), f"udcentinela.github.io/regional/{slug}/", font=font_url, fill=(0, 240, 255, 240))
    draw.text((460, 580), "|  PERFIL OFICIAL DEL CLUB", font=font_url, fill=(148, 163, 184, 200))

    # Save progressive JPEG
    out_file = os.path.join(OG_PLAYERS_DIR, f"{slug}.jpg")
    card.convert('RGB').save(out_file, 'JPEG', quality=92, progressive=True)
    return out_file

def render_section_card(filename, title, subtitle, badge1, badge2, detail1, detail2, glow_theme="blue_red"):
    card = create_base_canvas(glow_theme=glow_theme)
    width, height = card.size

    # Prominent Centinela Shield on Right Side
    if os.path.exists(HERO_SHIELD_PATH):
        hshield = Image.open(HERO_SHIELD_PATH).convert('RGBA')
    elif os.path.exists(SHIELD_PATH):
        hshield = Image.open(SHIELD_PATH).convert('RGBA')
    else:
        hshield = None

    if hshield:
        target_h = 440
        aspect = hshield.width / hshield.height
        target_w = int(target_h * aspect)
        hshield_res = hshield.resize((target_w, target_h), Image.Resampling.LANCZOS)
        pos_x = width - target_w - 90
        pos_y = (height - target_h) // 2 + 10

        shadow = Image.new('RGBA', hshield_res.size, (0, 0, 0, 160))
        shadow.putalpha(hshield_res.split()[3])
        shadow = shadow.filter(ImageFilter.GaussianBlur(30))
        card.alpha_composite(shadow, (pos_x + 10, pos_y + 10))
        card.alpha_composite(hshield_res, (pos_x, pos_y))

    draw = ImageDraw.Draw(card)

    font_brand = ImageFont.truetype('arialbd.ttf', 24)
    font_season = ImageFont.truetype('arialbd.ttf', 16)
    font_title = ImageFont.truetype('arialbd.ttf', 54)
    font_subtitle = ImageFont.truetype('arialbd.ttf', 26)
    font_badge = ImageFont.truetype('arialbd.ttf', 20)
    font_desc = ImageFont.truetype('arial.ttf', 22)
    font_meta = ImageFont.truetype('arialbd.ttf', 18)
    font_url = ImageFont.truetype('arialbd.ttf', 18)

    # Top Brand
    draw.text((145, 33), "UD CENTINELA", font=font_brand, fill=(255, 255, 255, 255))
    draw.text((145, 62), "ICOD DE LOS VINOS · REGIONAL TENERIFE", font=font_season, fill=(0, 240, 255, 220))

    # Badges
    pos_x = 60
    draw.rounded_rectangle([pos_x, 140, pos_x + 230, 185], radius=8, fill=(225, 29, 72, 240))
    draw.text((pos_x + 18, 150), badge1.upper(), font=font_badge, fill=(255, 255, 255, 255))

    pos_x += 245
    draw.rounded_rectangle([pos_x, 140, pos_x + 260, 185], radius=8, fill=(15, 23, 42, 230), outline=(0, 240, 255, 140), width=1)
    draw.text((pos_x + 18, 150), badge2.upper(), font=font_badge, fill=(0, 240, 255, 255))

    # Main Title
    draw.text((60, 220), title.upper(), font=font_title, fill=(255, 255, 255, 255))

    # Accent divider
    draw.line([(60, 295), (320, 295)], fill=(0, 240, 255, 255), width=4)

    # Subtitle
    draw.text((60, 325), subtitle, font=font_subtitle, fill=(226, 232, 240, 255))

    # Details / Highlights
    draw.text((60, 395), detail1, font=font_desc, fill=(203, 213, 225, 255))
    draw.text((60, 435), detail2, font=font_meta, fill=(96, 165, 250, 255))

    # Footer
    draw.text((60, 580), "udcentinela.github.io", font=font_url, fill=(0, 240, 255, 240))
    draw.text((280, 580), "|  WEB OFICIAL DE LA UNIÓN DEPORTIVA CENTINELA", font=font_url, fill=(148, 163, 184, 200))

    out_file = os.path.join(OG_DIR, filename)
    card.convert('RGB').save(out_file, 'JPEG', quality=92, progressive=True)
    return out_file

def main():
    print("=== Generando tarjetas Open Graph (1200x630 JPEG) ===")

    # 1. Secciones Principales
    sections = [
        ("home.jpg", "UD Centinela", "El renacer del primer gigante de Icod de los Vinos", "Oficial", "Temporada 26/27", "Sitio web oficial del club fundado en 1955", "Estadio Municipal El Molino · Icod de los Vinos", "blue_red"),
        ("calendario.jpg", "Calendario 2026/27", "Partidos, horarios y resultados oficiales", "Temporada 26/27", "Móvil iOS & Android", "Sincroniza todos los partidos con tu calendario en 1 clic", "Segunda Regional Grupo 1 Tenerife", "blue_red"),
        ("clasificacion.jpg", "Clasificación", "Segunda Regional Tenerife · Grupo 1", "Temporada 26/27", "Tabla en directo", "Puntos, goles, victorias y posiciones actualizadas", "Seguimiento oficial de la competición", "gold_blue"),
        ("plantilla.jpg", "Plantilla Regional", "Jugadores oficiales de la temporada 2026/2027", "Primer Equipo", "Segunda Regional", "Conoce a todos los integrantes del regreso del Centinela", "Icod de los Vinos · Tenerife", "blue_red"),
        ("cuerpo-tecnico.jpg", "Cuerpo Técnico", "Dirección y preparación deportiva 2026/2027", "Dirección Técnica", "Primer Equipo", "Juan Manuel, Toño y Joel liderando el banquillo rojinegro", "Estadio Municipal El Molino", "blue_red"),
        ("noticias.jpg", "Noticias y Novedades", "Toda la actualidad del primer gigante de Icod", "Actualidad", "Comunidad", "Fichajes, crónicas, eventos y comunicados oficiales", "Sigue el día a día de la UD Centinela", "blue_red"),
        ("patrocinios.jpg", "Patrocinadores", "Empresas y comercios que impulsan nuestro club", "Patrocinadores", "Comercio Local", "Agradecimiento a nuestros patrocinadores y colaboradores", "Juntos hacemos más grande al Centinela", "gold_blue"),
        ("historia.jpg", "Nuestra Historia", "El legado del primer gigante de Icod desde 1955", "Fundado en 1955", "Memoria Viva", "Más de medio siglo de fútbol, pasión y orgullo icodense", "El resurgir de una leyenda del norte de Tenerife", "blue_red"),
        ("identidad.jpg", "Identidad y Símbolos", "Escudo, colores y los valores del Centinela", "Rojinegro & Blanco", "Identidad Icodense", "El Centinela: historia, pasión, respeto y deportividad", "Icod de los Vinos, Tenerife", "blue_red"),
    ]

    for fname, title, sub, b1, b2, d1, d2, theme in sections:
        fpath = render_section_card(fname, title, sub, b1, b2, d1, d2, theme)
        print(f"  [Sección] {fname:18} -> {os.path.getsize(fpath)} bytes")

    # 2. Jugadores y Staff
    with open(PLAYERS_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    players = data.get("players", [])
    print(f"\nGenerando tarjetas para {len(players)} jugadores y cuerpo técnico...")
    for p in players:
        fpath = render_player_card(p)
        slug = p.get("slug", p.get("id"))
        print(f"  [Perfil] {slug:20} -> {os.path.getsize(fpath)} bytes")

    print("\n¡Todas las tarjetas generadas exitosamente!")

if __name__ == "__main__":
    main()
