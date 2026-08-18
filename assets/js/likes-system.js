/**
 * UD Centinela - Sistema Global de Likes / Me Gusta
 * - Identificador único por persona/dispositivo (anti-voto duplicado en localStorage).
 * - Sincronización global en la nube (Cloud Counter API con fallback automático).
 * - Feedback visual instantáneo (0ms) con animación de corazón flotante ❤️.
 */
(function () {
  const STORAGE_KEY = "udc_liked_items";
  const LOCAL_COUNTS_KEY = "udc_local_like_counts";
  const CLOUD_BADGE_BASE = "https://api.visitorbadge.io/api/visitors?path=udc_v1_like_";

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

  function sanitizeId(id) {
    return String(id).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  }

  // Parse count from SVG or JSON response
  function parseCountFromResponse(text) {
    if (!text) return null;
    try {
      const json = JSON.parse(text);
      if (typeof json.count === "number") return json.count;
    } catch (e) {}

    const match = text.match(/aria-label="VISITORS:\s*(\d+)"/) || text.match(/>(\d+)<\/text>/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  // Increment count in Cloud API
  async function incrementCloudCount(targetId) {
    const cleanId = sanitizeId(targetId);
    const localCounts = getLocalCounts();
    const current = localCounts[cleanId] || 0;
    localCounts[cleanId] = current + 1;
    saveLocalCounts(localCounts);

    try {
      // 1. Try local server endpoint if running node server
      fetch(`/api/likes/${cleanId}/up`, { method: "POST" }).catch(() => {});

      // 2. Increment in cloud badge API
      const res = await fetch(`${CLOUD_BADGE_BASE}${cleanId}`, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        const count = parseCountFromResponse(text);
        if (typeof count === "number") {
          localCounts[cleanId] = count;
          saveLocalCounts(localCounts);
          return count;
        }
      }
    } catch (err) {}

    return localCounts[cleanId];
  }

  // Decrement count locally
  async function decrementCloudCount(targetId) {
    const cleanId = sanitizeId(targetId);
    const localCounts = getLocalCounts();
    localCounts[cleanId] = Math.max(0, (localCounts[cleanId] || 1) - 1);
    saveLocalCounts(localCounts);

    try {
      fetch(`/api/likes/${cleanId}/down`, { method: "POST" }).catch(() => {});
    } catch (e) {}

    return localCounts[cleanId];
  }

  // Spawn floating heart animation
  function spawnFloatingHeart(btn) {
    const heart = document.createElement("span");
    heart.className = "udc-like-floating-heart";
    heart.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-red-500"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    btn.appendChild(heart);
    setTimeout(() => heart.remove(), 900);
  }

  function initLikeButton(btn) {
    const targetId = btn.getAttribute("data-like-id");
    if (!targetId) return;

    const countEl = btn.querySelector(".udc-like-count");
    const labelEl = btn.querySelector(".udc-like-label");

    const likedItems = getLikedItems();
    const localCounts = getLocalCounts();
    let isLiked = !!likedItems[targetId];

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

    // Set initial display
    const initialCount = localCounts[sanitizeId(targetId)] || (isLiked ? 1 : 0);
    updateUI(isLiked, initialCount);

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      btn.classList.add("udc-like-btn-animating");
      setTimeout(() => btn.classList.remove("udc-like-btn-animating"), 400);

      const currentLiked = getLikedItems();
      if (!currentLiked[targetId]) {
        // Vote +1
        currentLiked[targetId] = true;
        saveLikedItems(currentLiked);
        spawnFloatingHeart(btn);

        const currentCount = parseInt(countEl ? countEl.textContent : "0", 10) || 0;
        updateUI(true, currentCount + 1);

        const cloudCount = await incrementCloudCount(targetId);
        updateUI(true, Math.max(currentCount + 1, cloudCount));
      } else {
        // Vote -1
        delete currentLiked[targetId];
        saveLikedItems(currentLiked);

        const currentCount = parseInt(countEl ? countEl.textContent : "1", 10) || 1;
        const newCount = Math.max(0, currentCount - 1);
        updateUI(false, newCount);

        await decrementCloudCount(targetId);
      }
    });
  }

  function initAll() {
    document.querySelectorAll("[data-like-id]").forEach(initLikeButton);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
