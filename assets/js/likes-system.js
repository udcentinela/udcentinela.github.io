/**
 * UD Centinela - Sistema Global de Likes / Me Gusta en Tiempo Real
 * 
 * - Sincronización Global en la Nube (Abacus High-Availability Serverless Counter).
 * - Identificador único de voto por dispositivo/navegador (localStorage anti-duplicados).
 * - Carga optimista ultra-rápida (0ms) con caché local para evitar parpadeos.
 * - Conteo acumulativo y compartido entre todos los aficionados en cualquier PC o móvil.
 * - Micro-animación de corazón flotante ❤️ y feedback háptico/visual.
 */
(function () {
  const NAMESPACE = "udcentinela_likes_v1";
  const CLOUD_API_BASE = "https://abacus.jasoncameron.dev";
  const STORAGE_KEY = "udc_liked_items_v2";
  const LOCAL_COUNTS_KEY = "udc_like_counts_cache";

  // In-memory cache for fast access
  const memoryCounts = {};
  const inFlightRequests = {};

  function getLikedItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveLikedItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
  }

  function getCachedCounts() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_COUNTS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveCachedCount(cleanId, count) {
    memoryCounts[cleanId] = count;
    try {
      const cached = getCachedCounts();
      cached[cleanId] = count;
      localStorage.setItem(LOCAL_COUNTS_KEY, JSON.stringify(cached));
    } catch (e) {}
  }

  function sanitizeId(id) {
    return String(id).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  }

  // Fetch count from cloud counter
  async function fetchCloudCount(cleanId) {
    if (inFlightRequests[cleanId]) return inFlightRequests[cleanId];

    inFlightRequests[cleanId] = (async () => {
      try {
        const url = `${CLOUD_API_BASE}/get/${NAMESPACE}/${cleanId}`;
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.value === "number") {
            saveCachedCount(cleanId, data.value);
            return data.value;
          }
        }
      } catch (err) {
        console.warn(`[UDC Likes] Conexión local / offline para ${cleanId}:`, err);
      } finally {
        delete inFlightRequests[cleanId];
      }

      // Return memory or cached count as fallback
      const cached = getCachedCounts();
      return cached[cleanId] !== undefined ? cached[cleanId] : 0;
    })();

    return inFlightRequests[cleanId];
  }

  // Increment global count on cloud
  async function hitCloudCount(cleanId) {
    try {
      // 1. Notify local server if running locally
      fetch(`/api/likes/${cleanId}/up`, { method: "POST" }).catch(() => {});

      // 2. Global Serverless Counter hit
      const url = `${CLOUD_API_BASE}/hit/${NAMESPACE}/${cleanId}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.value === "number") {
          saveCachedCount(cleanId, data.value);
          return data.value;
        }
      }
    } catch (err) {
      console.warn(`[UDC Likes] Error en hit a la nube para ${cleanId}:`, err);
    }
    return null;
  }

  // Floating heart micro-animation
  function spawnFloatingHeart(btn) {
    const heart = document.createElement("span");
    heart.className = "udc-like-floating-heart";
    heart.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-red-500"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    btn.appendChild(heart);
    setTimeout(() => heart.remove(), 900);
  }

  function initLikeButton(btn) {
    const rawId = btn.getAttribute("data-like-id");
    if (!rawId) return;

    const cleanId = sanitizeId(rawId);
    const countEl = btn.querySelector(".udc-like-count");
    const labelEl = btn.querySelector(".udc-like-label");

    let isProcessing = false;
    const likedItems = getLikedItems();
    const cachedCounts = getCachedCounts();
    let isLiked = !!likedItems[cleanId];

    function updateUI(liked, count) {
      if (liked) {
        btn.classList.add("udc-like-btn-active");
        btn.setAttribute("aria-pressed", "true");
        if (labelEl) labelEl.textContent = "Te gusta";
      } else {
        btn.classList.remove("udc-like-btn-active");
        btn.setAttribute("aria-pressed", "false");
        if (labelEl) labelEl.textContent = "Me gusta";
      }
      if (countEl && typeof count === "number") {
        countEl.textContent = count;
      }
    }

    // --- STEP 1: Optimistic 0ms Local Render ---
    const initialCount = cachedCounts[cleanId] !== undefined 
      ? cachedCounts[cleanId] 
      : (isLiked ? 1 : 0);
    updateUI(isLiked, initialCount);

    // --- STEP 2: Async Cloud Fetch on Mount ---
    fetchCloudCount(cleanId).then((globalCount) => {
      let finalCount = globalCount;
      if (isLiked && finalCount < 1) finalCount = 1;
      updateUI(isLiked, finalCount);
    });

    // --- STEP 3: Interactive Click Handler ---
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (isProcessing) return;
      isProcessing = true;

      btn.classList.add("udc-like-btn-animating");
      setTimeout(() => btn.classList.remove("udc-like-btn-animating"), 400);

      const currentLiked = getLikedItems();
      let currentDisplay = parseInt(countEl ? countEl.textContent : "0", 10) || 0;

      if (!currentLiked[cleanId]) {
        // === GIVE LIKE ===
        currentLiked[cleanId] = true;
        saveLikedItems(currentLiked);
        spawnFloatingHeart(btn);

        const newCount = currentDisplay + 1;
        saveCachedCount(cleanId, newCount);
        updateUI(true, newCount);

        // Sync globally with cloud
        const cloudCount = await hitCloudCount(cleanId);
        if (cloudCount !== null && cloudCount >= newCount) {
          updateUI(true, cloudCount);
        }
      } else {
        // === REMOVE LIKE ===
        delete currentLiked[cleanId];
        saveLikedItems(currentLiked);

        const newCount = Math.max(0, currentDisplay - 1);
        saveCachedCount(cleanId, newCount);
        updateUI(false, newCount);

        // Local server notify if applicable
        fetch(`/api/likes/${cleanId}/down`, { method: "POST" }).catch(() => {});
      }

      isProcessing = false;
    });
  }

  function initAll() {
    document.querySelectorAll("[data-like-id]").forEach(initLikeButton);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll, { once: true });
  } else {
    initAll();
  }
})();
