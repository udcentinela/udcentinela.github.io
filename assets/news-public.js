(function () {
  const fallbackImage = "/assets/img/logo-hero.webp";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function imageFor(news) {
    return news.image || fallbackImage;
  }

  function card(news, featured) {
    const cardClass = featured
      ? "news-card news-card-anim lg:col-span-2 min-h-[420px] bg-gradient-to-br from-brand-blue/20 via-white/5 to-transparent border border-brand-neon/30 rounded-3xl group hover:-translate-y-1 hover:shadow-neon transition-all duration-300 flex flex-col justify-end overflow-hidden relative"
      : "news-card news-card-anim min-h-[420px] bg-white/5 border border-white/10 rounded-3xl group hover:-translate-y-1 hover:border-brand-neon/40 transition-all duration-300 overflow-hidden relative";
    const titleClass = featured ? "text-4xl md:text-5xl" : "text-2xl";

    return `
      <a href="/noticias/${encodeURIComponent(news.slug)}/" class="${cardClass}">
        <img src="${escapeHtml(imageFor(news))}" alt="${escapeHtml(news.imageAlt || news.title)}" class="absolute inset-0 w-full h-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-105" loading="lazy">
        <div class="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/75 to-brand-dark/10"></div>
        <div class="absolute -right-20 -top-20 w-56 h-56 bg-brand-neon/10 rounded-full blur-[70px] group-hover:bg-brand-neon/20 transition-colors"></div>
        <div class="relative z-10 p-8 md:p-10">
          <div class="flex flex-wrap items-center gap-3 mb-6">
            <span class="bg-brand-neon text-brand-dark font-black px-3 py-1 rounded text-xs tracking-widest uppercase">${escapeHtml(news.category)}</span>
            <span class="text-gray-300 text-sm">${escapeHtml(news.date)}</span>
            <span class="text-gray-500 text-sm">/</span>
            <span class="text-gray-300 text-sm">${escapeHtml(news.reading || "1 min")} lectura</span>
          </div>
          <h3 class="news-title font-heading ${titleClass} font-black text-white leading-tight transition-colors mb-5">${escapeHtml(news.title)}</h3>
          <p class="text-gray-300 leading-relaxed max-w-2xl">${escapeHtml(news.excerpt)}</p>
          <div class="mt-8 inline-flex items-center text-brand-neon font-bold tracking-widest uppercase text-xs">
            Leer noticia
            <svg class="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7l7 7-7 7"></path></svg>
          </div>
        </div>
      </a>
    `;
  }

  async function fetchNews() {
    const response = await fetch("/api/news", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudieron cargar las noticias.");
    const data = await response.json();
    return data.items || [];
  }

  async function fetchArticle(slug) {
    const response = await fetch(`/api/news/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Noticia no encontrada.");
    return response.json();
  }

  function renderList(items) {
    const grid = document.getElementById("newsGrid");
    const empty = document.getElementById("newsEmpty");
    if (!grid) return;

    if (!items.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    grid.innerHTML = items.map((news, index) => card(news, index === 0)).join("");
    if (window.gsap) {
      gsap.fromTo(".news-card-anim", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, stagger: 0.08, ease: "power3.out" });
    }
  }

  function paragraphs(body) {
    const items = Array.isArray(body) ? body : String(body || "").split(/\n\s*\n/);
    return items.filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  }

  function renderArticle(news) {
    document.title = `UD Centinela | ${news.title}`;
    const category = document.getElementById("articleCategory");
    const date = document.getElementById("articleDate");
    const reading = document.getElementById("articleReading");
    const title = document.getElementById("articleTitle");
    const excerpt = document.getElementById("articleExcerpt");
    const image = document.getElementById("articleImage");
    const body = document.getElementById("articleBody");

    if (category) category.textContent = news.category || "Actualidad";
    if (date) date.textContent = news.date || "";
    if (reading) reading.textContent = `${news.reading || "1 min"} lectura`;
    if (title) title.textContent = news.title || "";
    if (excerpt) excerpt.textContent = news.excerpt || "";
    if (image) {
      image.src = imageFor(news);
      image.alt = news.imageAlt || news.title || "Noticia UD Centinela";
    }
    if (body) body.innerHTML = paragraphs(news.body);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (document.body.dataset.newsPage === "list") {
        renderList(await fetchNews());
      }

      if (document.body.dataset.newsPage === "article") {
        const slug = location.pathname.split("/").filter(Boolean).pop();
        renderArticle(await fetchArticle(slug));
      }
    } catch (error) {
      const target = document.getElementById("newsError") || document.getElementById("articleError");
      if (target) {
        target.textContent = error.message;
        target.hidden = false;
      }
    }
  });
})();
