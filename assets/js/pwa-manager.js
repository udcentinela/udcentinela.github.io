/**
 * UD Centinela - Gestor de Aplicación Web Progresiva (PWA) & Modo Estadio
 * Compatible con Android, Xiaomi (HyperOS/MIUI), iOS y Desktop
 */
(function () {
  let deferredPrompt = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[UDC PWA] Service Worker activo en alcance:', reg.scope);
          
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[UDC PWA] Nueva versión disponible en segundo plano.');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[UDC PWA] Error registrando Service Worker:', err);
        });
    });
  }

  // 2. Offline / Online Stadium Mode Status Banner
  function createNetworkStatusBanner() {
    if (document.getElementById('pwaNetworkBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwaNetworkBanner';
    banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 -translate-y-8';
    document.body.appendChild(banner);

    function showStatus(isOnline) {
      if (!isOnline) {
        banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto opacity-100 translate-y-0 bg-amber-500/95 text-brand-dark border border-amber-300 flex items-center gap-2';
        banner.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-brand-dark animate-pulse"></span>
          <span>📡 Modo Estadio sin cobertura · Consultando datos locales</span>
        `;
      } else {
        banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto opacity-100 translate-y-0 bg-green-500/95 text-white border border-green-300 flex items-center gap-2';
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

  // 3. Instruction Modal for Manual Add / Fallback
  function showInstallModal() {
    let modal = document.getElementById('pwaGuideModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwaGuideModal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300';
      modal.innerHTML = `
        <div class="relative w-full max-w-md p-6 rounded-3xl bg-brand-dark border border-brand-neon/30 shadow-neon text-white space-y-5">
          <button id="closePwaGuide" class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold p-1 cursor-pointer">&times;</button>
          
          <div class="flex items-center gap-3">
            <img src="/assets/img/icon-192.png" alt="Escudo UD Centinela" class="w-12 h-12 rounded-2xl object-contain bg-white/5 p-1 border border-white/10">
            <div>
              <h3 class="font-heading text-lg font-black uppercase text-white">Instalar App Oficial</h3>
              <p class="text-xs text-brand-neon font-semibold">UD Centinela · Modo Estadio</p>
            </div>
          </div>

          <div class="space-y-3 text-xs text-gray-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
            <p class="font-bold text-white uppercase tracking-wider text-[11px] text-brand-neon">📲 Cómo instalar en Android / Xiaomi:</p>
            <ol class="list-decimal list-inside space-y-1.5 pl-1">
              <li>Pulsa en el menú de opciones (los <strong>tres puntos ⋮</strong> arriba a la derecha en Chrome o en tu navegador).</li>
              <li>Toca en <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla de inicio"</strong>.</li>
              <li>Confirma y tendrás el icono oficial en tu pantalla con acceso offline.</li>
            </ol>
          </div>

          <div class="space-y-3 text-xs text-gray-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
            <p class="font-bold text-white uppercase tracking-wider text-[11px] text-brand-neon">🍏 Cómo instalar en iPhone / Safari:</p>
            <ol class="list-decimal list-inside space-y-1.5 pl-1">
              <li>Pulsa el botón <strong>Compartir</strong> (icono con la flecha hacia arriba).</li>
              <li>Desliza hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong>.</li>
            </ol>
          </div>

          <button id="pwaGuideOkBtn" class="w-full py-3 rounded-xl bg-brand-neon text-brand-dark font-heading font-black text-xs uppercase tracking-widest hover:bg-white transition-colors cursor-pointer">
            Entendido
          </button>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#closePwaGuide').addEventListener('click', () => modal.classList.add('hidden'));
      modal.querySelector('#pwaGuideOkBtn').addEventListener('click', () => modal.classList.add('hidden'));
    }
    modal.classList.remove('hidden');
  }

  // Trigger Install (Native Prompt or Modal Guide)
  async function triggerInstall() {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[UDC PWA] Selección del usuario:', outcome);
        deferredPrompt = null;
        const banner = document.getElementById('pwaInstallBar');
        if (banner) banner.remove();
        return;
      } catch (err) {
        console.warn('[UDC PWA] Error en prompt nativo, mostrando guía:', err);
      }
    }
    showInstallModal();
  }

  // 4. Inject Install Action in Mobile Menu
  function injectMobileMenuButton() {
    if (isStandalone) return;
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu || document.getElementById('menuPwaInstallBtn')) return;

    const container = mobileMenu.querySelector('.max-w-7xl') || mobileMenu;
    const installLink = document.createElement('button');
    installLink.id = 'menuPwaInstallBtn';
    installLink.type = 'button';
    installLink.className = 'w-full mobile-nav-link flex items-center justify-between rounded-xl border border-brand-neon/40 bg-brand-neon/10 px-4 py-3 text-base font-black tracking-widest text-brand-neon hover:bg-brand-neon hover:text-brand-dark transition-colors cursor-pointer mt-3 shadow-neon';
    installLink.innerHTML = `
      <span class="flex items-center gap-2">
        <span>📲</span>
        <span>INSTALAR APP OFICIAL</span>
      </span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    `;

    installLink.addEventListener('click', () => {
      triggerInstall();
    });

    container.appendChild(installLink);
  }

  // 5. Floating Bottom Banner on Mobile & Desktop
  function setupInstallBanner() {
    if (isStandalone) return;
    if (document.getElementById('pwaInstallBar')) return;

    // Capture native beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('[UDC PWA] Evento beforeinstallprompt capturado con éxito.');
    });

    // Show floating bar after 1.5s
    setTimeout(() => {
      if (isStandalone || document.getElementById('pwaInstallBar')) return;

      const installBar = document.createElement('div');
      installBar.id = 'pwaInstallBar';
      installBar.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 p-4 rounded-2xl bg-brand-dark/95 border border-brand-neon/50 backdrop-blur-xl shadow-neon flex items-center justify-between gap-3 text-white transition-all duration-500 animate-slide-up';
      installBar.innerHTML = `
        <div class="flex items-center gap-3 cursor-pointer" id="pwaBannerClickArea">
          <img src="/assets/img/icon-192.png" alt="App Icon" class="w-10 h-10 object-contain rounded-xl bg-white/5 p-1 border border-white/10">
          <div>
            <p class="font-heading font-black text-xs uppercase tracking-wide text-white flex items-center gap-1.5">
              <span>App UD Centinela</span>
              <span class="px-1.5 py-0.2 rounded bg-brand-neon/20 text-brand-neon text-[9px] font-black">Nativa</span>
            </p>
            <p class="text-[11px] text-gray-300">Modo offline para el estadio</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="pwaInstallBtn" class="px-3.5 py-2 rounded-xl bg-brand-neon text-brand-dark font-heading font-black text-xs uppercase tracking-wider hover:bg-white transition-colors cursor-pointer whitespace-nowrap shadow-md">
            Instalar
          </button>
          <button id="pwaCloseBtn" class="text-gray-400 hover:text-white p-1 text-base font-bold cursor-pointer" aria-label="Cerrar">&times;</button>
        </div>
      `;

      document.body.appendChild(installBar);

      const installBtn = document.getElementById('pwaInstallBtn');
      const clickArea = document.getElementById('pwaBannerClickArea');
      const closeBtn = document.getElementById('pwaCloseBtn');

      if (installBtn) installBtn.addEventListener('click', triggerInstall);
      if (clickArea) clickArea.addEventListener('click', triggerInstall);
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          installBar.remove();
        });
      }
    }, 1200);
  }

  // Init
  function init() {
    createNetworkStatusBanner();
    injectMobileMenuButton();
    setupInstallBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
