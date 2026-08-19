/**
 * UD Centinela - Gestor de Aplicación Web Progresiva (PWA) & Modo Estadio
 */
(function () {
  let deferredPrompt = null;

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[UDC PWA] Service Worker registrado con éxito:', reg.scope);
          
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[UDC PWA] Nueva versión disponible. Actualizando en segundo plano.');
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[UDC PWA] Error al registrar Service Worker:', err);
        });
    });
  }

  // 2. Offline / Online Stadium Mode Status Banner
  function createNetworkStatusBanner() {
    const banner = document.createElement('div');
    banner.id = 'pwaNetworkBanner';
    banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 -translate-y-8';
    document.body.appendChild(banner);

    function showStatus(isOnline) {
      if (!isOnline) {
        banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto opacity-100 translate-y-0 bg-amber-500/90 text-brand-dark border border-amber-300 flex items-center gap-2';
        banner.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-brand-dark animate-pulse"></span>
          <span>📡 Modo Estadio sin cobertura · Consultando datos locales</span>
        `;
      } else {
        banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto opacity-100 translate-y-0 bg-green-500/90 text-white border border-green-300 flex items-center gap-2';
        banner.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-white"></span>
          <span>⚡ Conexión recuperada · Sincronizado</span>
        `;
        setTimeout(() => {
          banner.classList.add('opacity-0', '-translate-y-8');
        }, 3500);
      }
    }

    window.addEventListener('offline', () => showStatus(false));
    window.addEventListener('online', () => showStatus(true));

    if (!navigator.onLine) {
      showStatus(false);
    }
  }

  // 3. PWA Install Prompt Banner
  function setupInstallPrompt() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return; // Already installed as native PWA

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show subtle floating install button if dismissed not recently
      if (sessionStorage.getItem('udc_pwa_prompt_dismissed')) return;

      const installBar = document.createElement('div');
      installBar.id = 'pwaInstallBar';
      installBar.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 p-4 rounded-2xl bg-brand-dark/95 border border-brand-neon/40 backdrop-blur-xl shadow-neon flex items-center justify-between gap-3 text-white transition-all duration-500 animate-slide-up';
      installBar.innerHTML = `
        <div class="flex items-center gap-3">
          <img src="/assets/img/logo-nav.webp" alt="App Icon" class="w-10 h-10 object-contain rounded-xl bg-white/5 p-1">
          <div>
            <p class="font-heading font-black text-xs uppercase tracking-wide text-white">App UD Centinela</p>
            <p class="text-[11px] text-gray-300">Instala la app para modo offline en el estadio</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="pwaInstallBtn" class="px-3 py-1.5 rounded-xl bg-brand-neon text-brand-dark font-heading font-black text-xs uppercase tracking-wider hover:bg-white transition-colors cursor-pointer whitespace-nowrap">
            Instalar
          </button>
          <button id="pwaCloseBtn" class="text-gray-400 hover:text-white p-1 text-sm font-bold cursor-pointer" aria-label="Cerrar">&times;</button>
        </div>
      `;

      document.body.appendChild(installBar);

      const installBtn = document.getElementById('pwaInstallBtn');
      const closeBtn = document.getElementById('pwaCloseBtn');

      if (installBtn) {
        installBtn.addEventListener('click', async () => {
          if (!deferredPrompt) return;
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('[UDC PWA] Opción seleccionada por usuario:', outcome);
          deferredPrompt = null;
          installBar.remove();
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          sessionStorage.setItem('udc_pwa_prompt_dismissed', 'true');
          installBar.remove();
        });
      }
    });
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createNetworkStatusBanner();
      setupInstallPrompt();
    });
  } else {
    createNetworkStatusBanner();
    setupInstallPrompt();
  }
})();
