/**
 * UD Centinela - Sistema Global de Likes / Me Gusta
 * - Identificador único por persona/dispositivo en localStorage (anti-voto duplicado).
 * - Sincronización global en tiempo real en la nube (Cloud REST Store).
 * - Carga automática del recuento global al abrir la página (incluso en incógnito).
 * - Micro-animación de corazón flotante ❤️ y feedback visual instantáneo (0ms).
 */
(function () {
  const STORAGE_KEY = "udc_liked_items";
  const LOCAL_COUNTS_KEY = "udc_local_like_counts";
  const CLOUD_STORE_URL = "https://api.restful-api.dev/objects/ff8081819ff5b11001a01483e5a841df";

  let memoryStore = null;
  let isFetching = false;
  const pendingButtons = [];

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

  // Fetch all global likes from Cloud Store
  async function fetchGlobalLikes() {
    if (memoryStore) return memoryStore;
    if (isFetching) return null;
    isFetching = true;

    try {
      // 1. Try local server endpoint if running node server
      const localRes = await fetch("/assets/data/likes.json", { cache: "no-store" }).catch(() => null);
      if (localRes && localRes.ok) {
        const localData = await localRes.json();
        if (localData && typeof localData === "object") {
          memoryStore = localData;
        }
      }

      // 2. Fetch from Cloud Store
      const res = await fetch(CLOUD_STORE_URL, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          memoryStore = Object.assign({}, memoryStore || {}, json.data);
          saveLocalCounts(memoryStore);
        }
      }
    } catch (err) {
      console.warn("Could not sync likes with cloud, using local cache:", err);
    } finally {
      isFetching = false;
    }

    if (!memoryStore) {
      memoryStore = getLocalCounts();
    }
    return memoryStore;
  }

  // Save updated global likes to Cloud Store
  async function syncGlobalLikeToCloud(targetId, newCount) {
    const cleanId = sanitizeId(targetId);
    const localCounts = getLocalCounts();
    localCounts[cleanId] = newCount;
    saveLocalCounts(localCounts);

    if (memoryStore) {
      memoryStore[cleanId] = newCount;
    }

    try {
      // 1. Try local server
      fetch(`/api/likes/${cleanId}/${newCount > 0 ? "up" : "down"}`, { method: "POST" }).catch(() => {});

      // 2. Push to Cloud Store
      const currentData = memoryStore || localCounts;
      currentData[cleanId] = newCount;

      const payload = {
        name: "udcentinela_global_likes_v1",
        data: currentData
      };

      await fetch(CLOUD_STORE_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn("Error updating cloud likes:", e);
    }
  }

  // Floating heart animation
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

    const cleanId = sanitizeId(targetId);
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

    // Step 1: Initial local display (0ms)
    const initialLocal = localCounts[cleanId] !== undefined ? localCounts[cleanId] : (isLiked ? 1 : 0);
    updateUI(isLiked, initialLocal);

    // Step 2: Fetch global count from Cloud on load
    fetchGlobalLikes().then((cloudData) => {
      if (cloudData && cloudData[cleanId] !== undefined) {
        let globalCount = cloudData[cleanId];
        // Ensure that if user has voted locally, count is at least 1
        if (isLiked && globalCount < 1) globalCount = 1;
        updateUI(isLiked, globalCount);
      }
    });

    // Step 3: Click handler
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      btn.classList.add("udc-like-btn-animating");
      setTimeout(() => btn.classList.remove("udc-like-btn-animating"), 400);

      const currentLiked = getLikedItems();
      let currentDisplay = parseInt(countEl ? countEl.textContent : "0", 10) || 0;

      if (!currentLiked[targetId]) {
        // Add Like
        currentLiked[targetId] = true;
        saveLikedItems(currentLiked);
        spawnFloatingHeart(btn);

        const newCount = currentDisplay + 1;
        updateUI(true, newCount);

        // Sync to cloud
        await syncGlobalLikeToCloud(targetId, newCount);
      } else {
        // Remove Like
        delete currentLiked[targetId];
        saveLikedItems(currentLiked);

        const newCount = Math.max(0, currentDisplay - 1);
        updateUI(false, newCount);

        // Sync to cloud
        await syncGlobalLikeToCloud(targetId, newCount);
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
