(function () {
  let editingSlug = null;
  let currentItems = [];
  let pendingImage = null;
  let csrfToken = "";
  const fallbackImage = "/assets/img/logo-hero.webp";
  const publicSiteUrl = "https://udcentinela.github.io";
  const maxImageBytes = 5 * 1024 * 1024;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function displayDateForInput(value) {
    if (!value) return today();
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[0];
    const spanish = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (spanish) {
      return `${spanish[3]}-${spanish[2].padStart(2, "0")}-${spanish[1].padStart(2, "0")}`;
    }
    return today();
  }

  function displayDate(value) {
    if (!value) return "";
    const parts = String(value).split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      location.href = "/noticias/login/";
      throw new Error(data.error || "Debes iniciar sesión.");
    }
    if (!response.ok) throw new Error(data.error || "No se pudo completar la acción.");
    return data;
  }

  function formData() {
    const body = document.getElementById("newsBody").value.trim();
    return {
      title: document.getElementById("newsTitle").value.trim(),
      category: document.getElementById("newsCategory").value.trim(),
      date: displayDate(document.getElementById("newsDate").value),
      excerpt: document.getElementById("newsExcerpt").value.trim(),
      body,
      image: document.getElementById("newsImageUrl").value.trim(),
      imageAlt: document.getElementById("newsImageAlt").value.trim(),
      imageData: pendingImage ? pendingImage.data : "",
      imageName: pendingImage ? pendingImage.name : "",
    };
  }

  function resetForm() {
    editingSlug = null;
    pendingImage = null;
    document.getElementById("newsForm").reset();
    document.getElementById("newsDate").value = today();
    document.getElementById("newsImagePreview").src = fallbackImage;
    document.getElementById("newsImagePreview").classList.add("opacity-60");
    document.getElementById("formMode").textContent = "Crear noticia";
    document.getElementById("cancelEdit").hidden = true;
  }

  function editItem(slug) {
    const item = currentItems.find((news) => news.slug === slug);
    if (!item) return;
    editingSlug = slug;
    pendingImage = null;
    document.getElementById("newsTitle").value = item.title || "";
    document.getElementById("newsCategory").value = item.category || "";
    document.getElementById("newsDate").value = displayDateForInput(item.date);
    document.getElementById("newsExcerpt").value = item.excerpt || "";
    document.getElementById("newsBody").value = Array.isArray(item.body) ? item.body.join("\n\n") : item.body || "";
    document.getElementById("newsImageUrl").value = item.image || "";
    document.getElementById("newsImageAlt").value = item.imageAlt || "";
    document.getElementById("newsImagePreview").src = item.image || fallbackImage;
    document.getElementById("newsImagePreview").classList.remove("opacity-60");
    document.getElementById("formMode").textContent = "Editar noticia";
    document.getElementById("cancelEdit").hidden = false;
    document.getElementById("newsTitle").focus();
  }

  async function deleteItem(slug) {
    const item = currentItems.find((news) => news.slug === slug);
    const title = item ? item.title : slug;
    if (!confirm(`¿Eliminar la noticia "${title}"?`)) return;
    await api(`/api/news/${encodeURIComponent(slug)}`, { method: "DELETE" });
    await loadItems();
    resetForm();
  }

  function renderItems() {
    const list = document.getElementById("adminNewsList");
    if (!currentItems.length) {
      list.innerHTML = '<p class="rounded-2xl border border-white/10 bg-white/5 p-5 text-gray-400">No hay noticias creadas todavía.</p>';
      return;
    }

    list.innerHTML = currentItems
      .map(
        (item) => `
          <article class="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group">
            <div class="grid grid-cols-[110px_1fr] sm:grid-cols-[150px_1fr] gap-0">
              <img src="${escapeHtml(item.image || fallbackImage)}" alt="${escapeHtml(item.imageAlt || item.title)}" class="w-full h-full min-h-[130px] object-cover bg-gray-900">
              <div class="p-5">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                  <span class="bg-brand-neon text-brand-dark font-black px-2 py-1 rounded text-[10px] tracking-widest uppercase">${escapeHtml(item.category || "Actualidad")}</span>
                  <span class="text-gray-500 text-xs">${escapeHtml(item.date || "")}</span>
                </div>
                <h3 class="font-heading text-xl text-white font-black mb-2">${escapeHtml(item.title)}</h3>
                <p class="text-sm text-gray-400 mb-4">${escapeHtml(item.excerpt || "")}</p>
                <div class="flex flex-wrap gap-3">
                  <a href="${publicSiteUrl}/noticias/${encodeURIComponent(item.slug)}/" target="_blank" rel="noopener" class="text-brand-neon text-xs font-bold tracking-widest uppercase hover:text-white">Ver</a>
                  <button type="button" data-edit="${escapeHtml(item.slug)}" class="text-gray-300 text-xs font-bold tracking-widest uppercase hover:text-brand-neon">Editar</button>
                  <button type="button" data-delete="${escapeHtml(item.slug)}" class="text-red-300 text-xs font-bold tracking-widest uppercase hover:text-red-100">Eliminar</button>
                </div>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  async function loadItems() {
    const data = await api("/api/news");
    currentItems = data.items || [];
    renderItems();
  }

  function renderAdmin() {
    const section = document.getElementById("noticias");
    if (!section) return;

    section.innerHTML = `
      <div class="absolute top-0 left-0 w-[700px] h-[700px] bg-brand-blue/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div class="absolute bottom-0 right-0 w-[520px] h-[520px] bg-brand-neon/5 rounded-full blur-[130px] pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 pt-10">
        <div class="mb-12 text-center section-header">
          <p class="text-brand-neon font-semibold tracking-widest uppercase text-sm mb-3">Panel de noticias</p>
          <h2 class="font-heading text-4xl md:text-6xl font-black mb-6 uppercase tracking-tight text-white">Crear y editar <span class="text-gradient">Noticias</span></h2>
          <p class="text-gray-400 text-lg max-w-3xl mx-auto leading-relaxed">Publica entradas con fecha, texto e imagen. Las fotos se adaptan al formato visual de tarjetas y artículos.</p>
          <div class="mt-8 flex flex-wrap gap-3 justify-center">
            <a href="/noticias/" class="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-brand-dark bg-brand-neon rounded-full hover:bg-white hover:shadow-neon transition-all duration-300">Volver a noticias</a>
            <button id="undoButton" type="button" title="Deshacer el último cambio" class="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white border border-white/10 rounded-full hover:border-brand-neon/50 hover:text-brand-neon transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-white">
              <span aria-hidden="true" class="text-lg leading-none">↶</span>
              <span>Deshacer</span>
            </button>
            <button id="redoButton" type="button" title="Rehacer el último cambio deshecho" class="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white border border-white/10 rounded-full hover:border-brand-neon/50 hover:text-brand-neon transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-white">
              <span aria-hidden="true" class="text-lg leading-none">↷</span>
              <span>Rehacer</span>
            </button>
            <button id="logoutButton" type="button" class="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white border border-white/10 rounded-full hover:border-brand-neon/50 hover:text-brand-neon transition-all duration-300">Cerrar sesión</button>
          </div>
          <div id="publishStatus" class="mt-5 inline-flex max-w-full items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-gray-300">
            <span class="h-2 w-2 flex-none rounded-full bg-gray-500"></span>
            <span>Consultando estado de publicación...</span>
          </div>
        </div>

        <div id="adminMessage" class="hidden mb-6 rounded-2xl border p-4 text-sm"></div>

        <div class="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-start">
          <form id="newsForm" class="bg-white/5 border border-brand-neon/20 rounded-3xl p-6 md:p-8 profile-card">
            <div class="flex items-center justify-between gap-4 mb-6">
              <h3 id="formMode" class="font-heading text-2xl font-black text-white">Crear noticia</h3>
              <button id="cancelEdit" type="button" class="text-xs text-gray-400 font-bold tracking-widest uppercase hover:text-brand-neon" hidden>Cancelar edición</button>
            </div>

            <label class="block mb-4">
              <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">Título</span>
              <input id="newsTitle" required class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-white outline-none focus:border-brand-neon" placeholder="Título de la noticia">
            </label>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block mb-4">
                <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">Categoría</span>
                <input id="newsCategory" class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-white outline-none focus:border-brand-neon" placeholder="Regional, Historia...">
              </label>
              <label class="block mb-4">
                <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">Fecha de publicación</span>
                <input id="newsDate" type="date" class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-white outline-none focus:border-brand-neon">
              </label>
            </div>

            <label class="block mb-4">
              <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">Resumen</span>
              <textarea id="newsExcerpt" rows="3" class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-white outline-none focus:border-brand-neon" placeholder="Texto breve para la tarjeta"></textarea>
            </label>

            <label class="block mb-4">
              <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">Cuerpo de la noticia</span>
              <textarea id="newsBody" required rows="8" class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-white outline-none focus:border-brand-neon" placeholder="Escribe la noticia. Separa párrafos con una línea en blanco."></textarea>
            </label>

            <div class="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 mb-5">
              <div class="rounded-2xl overflow-hidden border border-white/10 bg-gray-900 min-h-[180px]">
                <img id="newsImagePreview" src="${fallbackImage}" alt="" class="w-full h-full min-h-[180px] object-cover opacity-60">
              </div>
              <div>
                <label class="block mb-4">
                  <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">Subir foto</span>
                  <input id="newsImageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-gray-300">
                </label>
                <label class="block mb-4">
                  <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">O usar URL de imagen</span>
                  <input id="newsImageUrl" class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-white outline-none focus:border-brand-neon" placeholder="/uploads/news/foto.jpg">
                </label>
                <label class="block">
                  <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">Texto alternativo</span>
                  <input id="newsImageAlt" class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-white outline-none focus:border-brand-neon" placeholder="Descripción de la imagen">
                </label>
              </div>
            </div>

            <button type="submit" class="w-full inline-flex items-center justify-center px-6 py-4 text-sm font-black tracking-widest uppercase text-brand-dark bg-brand-neon rounded-full hover:bg-white hover:shadow-neon transition-all duration-300">Guardar noticia</button>
          </form>

          <div class="profile-card">
            <h3 class="font-heading text-2xl font-black text-white mb-6">Noticias publicadas</h3>
            <div id="adminNewsList" class="space-y-5"></div>
          </div>
        </div>
      </div>
    `;
  }

  function showMessage(text, type) {
    const message = document.getElementById("adminMessage");
    message.textContent = text;
    message.className = `mb-6 rounded-2xl border p-4 text-sm ${type === "error" ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-brand-neon/30 bg-brand-neon/10 text-brand-neon"}`;
    message.hidden = false;
    window.setTimeout(() => (message.hidden = true), 3500);
  }

  async function loadPublishStatus() {
    const element = document.getElementById("publishStatus");
    if (!element) return;
    try {
      const status = await api("/api/publish-status");
      const styles = {
        idle: ["bg-gray-500", "text-gray-300"],
        queued: ["bg-yellow-300", "text-yellow-100"],
        publishing: ["bg-brand-neon", "text-brand-neon"],
        published: ["bg-emerald-400", "text-emerald-200"],
        error: ["bg-red-400", "text-red-200"],
      };
      const [dotClass, textClass] = styles[status.state] || styles.idle;
      const commit = status.commit ? ` · commit ${status.commit}` : "";
      element.className = `mt-5 inline-flex max-w-full items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs ${textClass}`;
      element.innerHTML = `<span class="h-2 w-2 flex-none rounded-full ${dotClass}"></span><span>${escapeHtml(status.message || "Sin información")}${escapeHtml(commit)}</span>`;
    } catch (error) {
      element.className = "mt-5 inline-flex max-w-full items-center gap-3 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-200";
      element.innerHTML = `<span class="h-2 w-2 flex-none rounded-full bg-red-400"></span><span>${escapeHtml(error.message)}</span>`;
    }
  }

  function updateHistoryButtons(status) {
    const undoButton = document.getElementById("undoButton");
    const redoButton = document.getElementById("redoButton");
    if (undoButton) undoButton.disabled = !status.canUndo;
    if (redoButton) redoButton.disabled = !status.canRedo;
  }

  async function loadHistoryStatus() {
    const status = await api("/api/history-status");
    updateHistoryButtons(status);
    return status;
  }

  async function applyHistoryAction(action) {
    const undoButton = document.getElementById("undoButton");
    const redoButton = document.getElementById("redoButton");
    undoButton.disabled = true;
    redoButton.disabled = true;
    try {
      const result = await api(`/api/history/${action}`, { method: "POST", body: "{}" });
      currentItems = result.items || [];
      renderItems();
      resetForm();
      updateHistoryButtons(result.history || {});
      showMessage(
        action === "undo"
          ? "Cambio deshecho. Publicación automática en curso."
          : "Cambio rehecho. Publicación automática en curso.",
        "ok"
      );
      await loadPublishStatus();
    } catch (error) {
      showMessage(error.message, "error");
      await loadHistoryStatus();
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const session = await fetch("/api/session", { cache: "no-store" }).then((response) => response.json()).catch(() => ({}));
    if (!session.authenticated) {
      location.href = "/noticias/login/";
      return;
    }
    csrfToken = session.csrfToken || "";

    renderAdmin();
    resetForm();

    const imageFile = document.getElementById("newsImageFile");
    imageFile.addEventListener("change", () => {
      const file = imageFile.files && imageFile.files[0];
      if (!file) return;
      if (file.size > maxImageBytes) {
        showMessage("La imagen supera el tamaño máximo permitido de 5 MB.", "error");
        imageFile.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        pendingImage = { name: file.name, data: reader.result };
        const preview = document.getElementById("newsImagePreview");
        preview.src = reader.result;
        preview.classList.remove("opacity-60");
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("newsImageUrl").addEventListener("input", (event) => {
      const value = event.target.value.trim();
      if (!value || pendingImage) return;
      const preview = document.getElementById("newsImagePreview");
      preview.src = value;
      preview.classList.remove("opacity-60");
    });

    document.getElementById("cancelEdit").addEventListener("click", resetForm);
    document.getElementById("undoButton").addEventListener("click", () => applyHistoryAction("undo"));
    document.getElementById("redoButton").addEventListener("click", () => applyHistoryAction("redo"));

    document.getElementById("logoutButton").addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" });
      location.href = "/noticias/login/";
    });

    document.getElementById("adminNewsList").addEventListener("click", async (event) => {
      const edit = event.target.closest("[data-edit]");
      const remove = event.target.closest("[data-delete]");
      if (edit) editItem(edit.dataset.edit);
      if (remove) {
        try {
          await deleteItem(remove.dataset.delete);
          showMessage("Noticia eliminada. GitHub Pages se actualizará automáticamente.", "ok");
          await loadPublishStatus();
          await loadHistoryStatus();
        } catch (error) {
          showMessage(error.message, "error");
        }
      }
    });

    document.getElementById("newsForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = formData();
        if (editingSlug) {
          await api(`/api/news/${encodeURIComponent(editingSlug)}`, { method: "PUT", body: JSON.stringify(payload) });
          showMessage("Noticia actualizada. Publicación automática en curso.", "ok");
        } else {
          await api("/api/news", { method: "POST", body: JSON.stringify(payload) });
          showMessage("Noticia guardada. Publicación automática en curso.", "ok");
        }
        await loadItems();
        await loadPublishStatus();
        await loadHistoryStatus();
        resetForm();
      } catch (error) {
        showMessage(error.message, "error");
      }
    });

    try {
      await loadItems();
      await loadPublishStatus();
      await loadHistoryStatus();
      window.setInterval(loadPublishStatus, 5000);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
})();
