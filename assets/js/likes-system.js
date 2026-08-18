/**
 * UD Centinela - Sistema Global de Likes / Me Gusta
 * - Identificador único por dispositivo/navegador (anti-voto duplicado).
 * - Sincronización en la nube mediante API Cloud + persistencia local.
 * - Micro-animación de pulso, corazón flotante y feedback visual inmediato.
 */
(function () {
  const STORAGE_KEY = "udc_liked_items";
  const LOCAL_COUNTS_KEY = "udc_local_like_counts";
  const CLOUD_API_BASE = "https://api.counterapi.dev/v1/udc_likes_";

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

  function getLocalCounts() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_COUNTS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveLocalCounts(counts) {
    try {
      localStorage.setItem(LOCAL_COUNTS_KEY, JSON.stringify(counts));
    } catch (e) {}
  }

  // Sanitize target ID to valid URL characters
  function sanitizeId(id) {
    return String(id).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  }

  // Fetch count from Cloud API with fallback
  async function fetchCloudCount(targetId) {
    const cleanId = sanitizeId(targetId);
    const localCounts = getLocalCounts();
    const fallbackCount = localCounts[cleanId] || 0;

    try {
      // First try local server if available
      const localServerRes = await fetch(`/api/likes/${cleanId}`, { cache: "no-store" }).catch(() => null);
      if (localServerRes && localServerRes.ok) {
        const data = await localServerRes.json();
        if (typeof data.count === "number") {
          localCounts[cleanId] = data.count;
          saveLocalCounts(localCounts);
          return data.count;
        }
      }

      // Cloud API fetch
      const res = await fetch(`${CLOUD_API_BASE}${cleanId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const count = typeof data.count === "number" ? data.count : fallbackCount;
        localCounts[cleanId] = Math.max(count, fallbackCount);
        saveLocalCounts(localCounts);
        return localCounts[cleanId];
      }
    } catch (err) {
      // Offline or network block fallback
    }

    return fallbackCount;
  }

  // Increment count in Cloud API
  async function incrementCloudCount(targetId) {
    const cleanId = sanitizeId(targetId);
    const localCounts = getLocalCounts();
    localCounts[cleanId] = (localCounts[cleanId] || 0) + 1;
    saveLocalCounts(localCounts);

    try {
      // Try local server
      fetch(`/api/likes/${cleanId}/up`, { method: "POST" }).catch(() => {});
      // Cloud API increment
      const res = await fetch(`${CLOUD_API_BASE}${cleanId}/up`, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.count === "number") {
          localCounts[cleanId] = data.count;
          saveLocalCounts(localCounts);
          return data.count;
        }
      }
    } catch (e) {}

    return localCounts[cleanId];
  }

  // Decrement count in Cloud API
  async function decrementCloudCount(targetId) {
    const cleanId = sanitizeId(targetId);
    const localCounts = getLocalCounts();
    localCounts[cleanId] = Math.max(0, (localCounts[cleanId] || 1) - 1);
    saveLocalCounts(localCounts);

    try {
      // Try local server
      fetch(`/api/likes/${cleanId}/down`, { method: "POST" }).catch(() => {});
      // Cloud API decrement
      const res = await fetch(`${CLOUD_API_BASE}${cleanId}/down`, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.count === "number") {
          localCounts[cleanId] = data.count;
          saveLocalCounts(localCounts);
          return data.count;
        }
      }
    } catch (e) {}

    return localCounts[cleanId];
  }

  // Micro-animation floating heart
  function spawnFloatingHeart(btn) {
    const heart = document.createElement("span");
    heart.className = "udc-like-floating-heart";
    heart.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-red-500"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    btn.appendChild(heart);
    setTimeout(() => heart.remove(), 900);
  }

  // Initialize a like button
  async function initLikeButton(btn) {
    const targetId = btn.getAttribute("data-like-id");
    if (!targetId) return;

    const countEl = btn.querySelector(".udc-like-count");
    const labelEl = btn.querySelector(".udc-like-label");
    const heartIcon = btn.querySelector(".udc-like-heart");

    const likedItems = getLikedItems();
    let isLiked = !!likedItems[targetId];

    // Update active UI state
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

    // Set initial UI
    updateUI(isLiked, null);

    // Fetch cloud count
    const initialCount = await fetchCloudCount(targetId);
    updateUI(isLiked, initialCount);

    // Click handler
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      btn.classList.add("udc-like-btn-animating");
      setTimeout(() => btn.classList.remove("udc-like-btn-animating"), 400);

      const currentLiked = getLikedItems();
      if (!currentLiked[targetId]) {
        // Give like
        currentLiked[targetId] = true;
        saveLikedItems(currentLiked);
        spawnFloatingHeart(btn);
        
        const currentCount = parseInt(countEl ? countEl.textContent : "0", 10) || 0;
        updateUI(true, currentCount + 1);
        
        const newCount = await incrementCloudCount(targetId);
        updateUI(true, newCount);
      } else {
        // Remove like
        delete currentLiked[targetId];
        saveLikedItems(currentLiked);
        
        const currentCount = parseInt(countEl ? countEl.textContent : "1", 10) || 1;
        updateUI(false, Math.max(0, currentCount - 1));
        
        const newCount = await decrementCloudCount(targetId);
        updateUI(false, newCount);
      }
    });
  }

  // Auto-init all buttons on DOM ready
  function initAll() {
    document.querySelectorAll("[data-like-id]").forEach(initLikeButton);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
