# UD Centinela (udcentinela.github.io) - Protocolo y Memoria de Operaciones

## 📌 Ubicaciones Clave del Sistema
- **Directorio Raíz del Proyecto:** C:\Users\Usuario\Desktop\udcentinela.github.io
- **Carpeta de Recursos / Descargas (Fotos, Logos, Archivos):** C:\Users\Usuario\Downloads\centinela
- **Repositorio Remoto Git:** https://github.com/udcentinela/udcentinela.github.io.git (Rama principal: main)
- **Autenticación Git:** Token ya configurado en el remote origin. Siempre ejecutar `git commit` y `git push origin main` al finalizar cambios.

---

## ⚡ Comandos Rápidos y Flujos de Trabajo Automáticos

Cuando el usuario pida cualquiera de las siguientes acciones en cualquier sesión, ejecuta todo el flujo de inicio a fin de forma autónoma sin pedir explicaciones ni contexto repetitivo:

### 1. ⚽ Anunciar Nuevo Jugador / Ficha
*Ejemplo del usuario:* `"anuncia a X jugador y su ficha"` o `"nuevo fichaje X"`
1. **Buscar imagen:** Localizar la foto del jugador en `C:\Users\Usuario\Downloads\centinela` (ej. `NOMBRE.jpg`).
2. **Optimizar imagen:** Copiar y generar versión en `assets/img/players/nombre.webp` (y `.png` si es necesario).
3. **Crear ficha del jugador:** Crear `regional/<slug-jugador>/index.html` siguiendo la plantilla exacta de fichas existentes (ej. `regional/colcho/index.html`, `regional/aday/index.html`).
4. **Actualizar plantilla general:** Añadir la tarjeta del jugador a la lista de la plantilla en `regional/index.html`.
5. **Crear Noticia:** Crear la página de noticia en `noticias/nuevo-fichaje-<slug-jugador>/index.html`.
6. **Actualizar lista de noticias:** Añadir el artículo a `noticias/index.html`.
7. **Actualizar portada:** Reflejar la noticia o el nuevo jugador en `index.html` (slider/ticker/últimas noticias).
8. **Publicar:** Ejecutar `git add .`, `git commit -m "feat: nuevo fichaje <Nombre>"` y `git push origin main`.

---

### 2. 🤝 Añadir Nuevo Patrocinador
*Ejemplo del usuario:* `"añade el patrocinador X"` o `"nuevo sponsor X"`
1. **Buscar logo:** Localizar el logo en `C:\Users\Usuario\Downloads\centinela` (ej. `pontucocinacom.jpg`).
2. **Optimizar logo:** Guardar en `assets/img/sponsors/<slug-sponsor>.webp` y `.png`.
3. **Portada:** Añadir el logo en la cinta/carrusel de patrocinadores (`.sponsors-ribbon`) en `index.html`.
4. **Página de Patrocinios:** Añadir el patrocinador en la categoría correspondiente dentro de `patrocinios/index.html`.
5. **Publicar:** Ejecutar `git add .`, `git commit -m "feat: nuevo patrocinador <Nombre>"` y `git push origin main`.

---

### 3. 🛠️ Corregir / Modificar Cualquier Elemento
*Ejemplo del usuario:* `"corrige esto en la página tal"`, `"cambia el texto X"`, `"arregla el diseño"`
1. Localizar el archivo HTML, CSS o JS correspondiente en `C:\Users\Usuario\Desktop\udcentinela.github.io`.
2. Aplicar la modificación respetando los estilos del club (paleta de colores, fuentes Montserrat/Inter, clases Tailwind/CSS custom).
3. Guardar, verificar y ejecutar `git add .`, `git commit -m "fix: <descripción del cambio>"` y `git push origin main`.

---

## 🎨 Identidad Visual y Estilos
- **Colores:** Azul oscuro (`var(--color-brand-dark)` / `#030712`), Azul Centinela (`var(--color-brand-blue)`), Neón / Rojo acento (`var(--color-brand-neon)`).
- **Tipografías:** Montserrat (titulares) e Inter (cuerpo de texto).
- **Google Analytics:** Tag `G-Q1DXP7Q8VQ` presente en todas las páginas.
