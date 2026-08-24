/**
 * UD Centinela - Gestor de Aplicación Web Progresiva (PWA) & Modo Estadio
 * Instalación automática instantánea con 1 toque en Android / Chrome / Edge
 * y guía visual optimizada para iPhone / Safari.
 */
(function () {
  'use strict';

  let deferredPrompt = null;
  window.__udcDeferredPrompt = null;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://');

  // ==========================================
  // 1. CAPTURA INMEDIATA DEL EVENTO NATIVO
  // ==========================================
  window.addEventListener('beforeinstallprompt', (e) => {
    // Previene el banner por defecto del navegador para usar el nuestro
    e.preventDefault();
    deferredPrompt = e;
    window.__udcDeferredPrompt = e;
    console.log('[UDC PWA] ⚡ Evento beforeinstallprompt capturado inmediatamente.');

    // Mostrar u optimizar el botón de instalación
    const installBar = document.getElementById('pwaInstallBar');
    if (installBar) {
      installBar.classList.remove('opacity-0', 'pointer-events-none');
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[UDC PWA] 🎉 ¡App UD Centinela instalada con éxito!');
    deferredPrompt = null;
    window.__udcDeferredPrompt = null;

    const banner = document.getElementById('pwaInstallBar');
    if (banner) banner.remove();

    const menuBtn = document.getElementById('menuPwaInstallBtn');
    if (menuBtn) menuBtn.remove();
  });

  // ==========================================
  // 2. REGISTRO DEL SERVICE WORKER
  // ==========================================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[UDC PWA] Service Worker activo en:', reg.scope);

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

  // ==========================================
  // 3. ESTADO DE RED & MODO ESTADIO SIN COBERTURA
  // ==========================================
  function createNetworkStatusBanner() {
    if (document.getElementById('pwaNetworkBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwaNetworkBanner';
    banner.className =
      'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 -translate-y-8';
    document.body.appendChild(banner);

    function showStatus(isOnline) {
      if (!isOnline) {
        banner.className =
          'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto opacity-100 translate-y-0 bg-amber-500/95 text-brand-dark border border-amber-300 flex items-center gap-2';
        banner.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-brand-dark animate-pulse"></span>
          <span>📡 Modo Estadio sin cobertura · Consultando datos locales</span>
        `;
      } else {
        banner.className =
          'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto opacity-100 translate-y-0 bg-green-500/95 text-white border border-green-300 flex items-center gap-2';
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

  // ==========================================
  // 4. MODALES DE AYUDA (iOS / FALLBACK)
  // ==========================================
  function showIOSModal() {
    let modal = document.getElementById('pwaIOSModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwaIOSModal';
      modal.className =
        'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300';
      modal.innerHTML = `
        <div class="relative w-full max-w-md p-6 rounded-3xl bg-brand-dark border border-brand-neon/40 shadow-neon text-white space-y-5 animate-slide-up">
          <button id="closePwaIOS" class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold p-1 cursor-pointer">&times;</button>
          
          <div class="flex items-center gap-3">
            <img src="/assets/img/icon-192.png" alt="Escudo UD Centinela" class="w-12 h-12 rounded-2xl object-contain bg-white/5 p-1 border border-white/10">
            <div>
              <h3 class="font-heading text-lg font-black uppercase text-white">Instalar en iPhone / iPad</h3>
              <p class="text-xs text-brand-neon font-semibold">UD Centinela · App Oficial</p>
            </div>
          </div>

          <div class="space-y-3.5 text-xs text-gray-200 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
            <p class="font-bold text-white uppercase tracking-wider text-[11px] text-brand-neon flex items-center gap-1.5">
              <span>🍏</span> Sigue estos 2 pasos rápidos en Safari:
            </p>
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-neon/20 border border-brand-neon/40 text-brand-neon font-bold flex items-center justify-center text-xs">1</span>
              <p>Toca el botón <strong>Compartir</strong> <svg class="inline-block w-4 h-4 text-brand-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> (icono del cuadrado con flecha en la barra inferior de Safari).</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-neon/20 border border-brand-neon/40 text-brand-neon font-bold flex items-center justify-center text-xs">2</span>
              <p>Baja en el menú y pulsa <strong>"Añadir a la pantalla de inicio"</strong> <span class="font-bold text-white">➕</span>.</p>
            </div>
          </div>

          <button id="pwaIOSOkBtn" class="w-full py-3 rounded-xl bg-brand-neon text-brand-dark font-heading font-black text-xs uppercase tracking-widest hover:bg-white transition-colors cursor-pointer">
            Entendido
          </button>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#closePwaIOS').addEventListener('click', () => modal.classList.add('hidden'));
      modal.querySelector('#pwaIOSOkBtn').addEventListener('click', () => modal.classList.add('hidden'));
    }
    modal.classList.remove('hidden');
  }

  function showAndroidFallbackModal() {
    let modal = document.getElementById('pwaAndroidModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwaAndroidModal';
      modal.className =
        'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300';
      modal.innerHTML = `
        <div class="relative w-full max-w-md p-6 rounded-3xl bg-brand-dark border border-brand-neon/40 shadow-neon text-white space-y-5 animate-slide-up">
          <button id="closePwaAndroid" class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold p-1 cursor-pointer">&times;</button>
          
          <div class="flex items-center gap-3">
            <img src="/assets/img/icon-192.png" alt="Escudo UD Centinela" class="w-12 h-12 rounded-2xl object-contain bg-white/5 p-1 border border-white/10">
            <div>
              <h3 class="font-heading text-lg font-black uppercase text-white">Instalar App Oficial</h3>
              <p class="text-xs text-brand-neon font-semibold">UD Centinela · Modo Estadio</p>
            </div>
          </div>

          <div class="space-y-3.5 text-xs text-gray-200 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
            <p class="font-bold text-white uppercase tracking-wider text-[11px] text-brand-neon">
              📲 Añadir a la pantalla de inicio:
            </p>
            <ol class="list-decimal list-inside space-y-2 pl-1">
              <li>Toca en los <strong>tres puntos ⋮</strong> (arriba a la derecha en Chrome o en tu navegador).</li>
              <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</li>
              <li>Confirma y ya tendrás acceso directo con modo offline.</li>
            </ol>
          </div>

          <button id="pwaAndroidOkBtn" class="w-full py-3 rounded-xl bg-brand-neon text-brand-dark font-heading font-black text-xs uppercase tracking-widest hover:bg-white transition-colors cursor-pointer">
            Entendido
          </button>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#closePwaAndroid').addEventListener('click', () => modal.classList.add('hidden'));
      modal.querySelector('#pwaAndroidOkBtn').addEventListener('click', () => modal.classList.add('hidden'));
    }
    modal.classList.remove('hidden');
  }

  // ==========================================
  // 5. EJECUTOR DE INSTALACIÓN AUTOMÁTICA
  // ==========================================
  async function triggerInstall(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const promptEvent = deferredPrompt || window.__udcDeferredPrompt;

    // 1. SI TENEMOS EL PROMPT NATIVO CAPTURADO -> INSTALACIÓN 100% AUTOMÁTICA
    if (promptEvent) {
      try {
        console.log('[UDC PWA] Invocando prompt nativo de instalación...');
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        console.log('[UDC PWA] Respuesta del usuario:', choice.outcome);

        if (choice.outcome === 'accepted') {
          deferredPrompt = null;
          window.__udcDeferredPrompt = null;
          const banner = document.getElementById('pwaInstallBar');
          if (banner) banner.remove();
        }
        return;
      } catch (err) {
        console.warn('[UDC PWA] Error al disparar prompt nativo:', err);
      }
    }

    // 2. DETECCIÓN DE PLATAFORMA SI NO ESTÁ EL EVENTO (iOS vs Android)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      showIOSModal();
      return;
    }

    // 3. ANDROID / OTROS BROWSERS SIN PROMPT ACTIVO
    showAndroidFallbackModal();
  }

  // ==========================================
  // 6. BOTÓN EN EL MENÚ MÓVIL
  // ==========================================
  function injectMobileMenuButton() {
    if (isStandalone) return;
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu || document.getElementById('menuPwaInstallBtn')) return;

    const container = mobileMenu.querySelector('.max-w-7xl') || mobileMenu;
    const installLink = document.createElement('button');
    installLink.id = 'menuPwaInstallBtn';
    installLink.type = 'button';
    installLink.className =
      'w-full mobile-nav-link flex items-center justify-between rounded-xl border border-brand-neon/40 bg-brand-neon/10 px-4 py-3 text-base font-black tracking-widest text-brand-neon hover:bg-brand-neon hover:text-brand-dark transition-colors cursor-pointer mt-3 shadow-neon';
    installLink.innerHTML = `
      <span class="flex items-center gap-2">
        <span>📲</span>
        <span>INSTALAR APP OFICIAL</span>
      </span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    `;

    installLink.addEventListener('click', triggerInstall);
    container.appendChild(installLink);
  }

  // ==========================================
  // 7. BANNER FLOTANTE INFERIOR
  // ==========================================
  function setupInstallBanner() {
    if (isStandalone) return;
    if (document.getElementById('pwaInstallBar')) return;

    // Crear banner flotante con animación suave
    const installBar = document.createElement('div');
    installBar.id = 'pwaInstallBar';
    installBar.className =
      'fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 p-4 rounded-2xl bg-brand-dark/95 border border-brand-neon/50 backdrop-blur-xl shadow-neon flex items-center justify-between gap-3 text-white transition-all duration-500 animate-slide-up';
    installBar.innerHTML = `
      <div class="flex items-center gap-3 cursor-pointer" id="pwaBannerClickArea">
        <img src="/assets/img/icon-192.png" alt="App Icon" class="w-10 h-10 object-contain rounded-xl bg-white/5 p-1 border border-white/10">
        <div>
          <p class="font-heading font-black text-xs uppercase tracking-wide text-white flex items-center gap-1.5">
            <span>App UD Centinela</span>
            <span class="px-1.5 py-0.2 rounded bg-brand-neon/20 text-brand-neon text-[9px] font-black">Oficial</span>
          </p>
          <p class="text-[11px] text-gray-300">Instalar en tu móvil con 1 toque</p>
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
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        installBar.remove();
      });
    }
  }

  // ==========================================
  // 8. INICIALIZACIÓN
  // ==========================================
  function init() {
    createNetworkStatusBanner();
    injectMobileMenuButton();
    setTimeout(setupInstallBanner, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
