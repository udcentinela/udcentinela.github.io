/* ============================================================
   UD Centinela — Navegación mobile
   Script compartido. Antes estaba copiado en cada HTML (~65 líneas).
   Threshold corregido a 1024px para coincidir con lg:hidden de Tailwind.
   ============================================================ */
(function () {
    function initMobileNavigation() {
        if (window.__centinelaMobileNavReady) return;

        var toggle = document.getElementById('mobileMenuToggle');
        var menu = document.getElementById('mobileMenu');
        if (!toggle || !menu) return;

        window.__centinelaMobileNavReady = true;

        var openIcon = toggle.querySelector('.mobile-menu-open');
        var closeIcon = toggle.querySelector('.mobile-menu-close');

        function setOpen(isOpen) {
            toggle.setAttribute('aria-expanded', String(isOpen));
            toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
            menu.hidden = !isOpen;
            document.body.classList.toggle('overflow-hidden', isOpen);
            if (openIcon) openIcon.classList.toggle('hidden', isOpen);
            if (closeIcon) closeIcon.classList.toggle('hidden', !isOpen);
        }

        toggle.addEventListener('click', function () {
            setOpen(toggle.getAttribute('aria-expanded') !== 'true');
        });

        menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () { setOpen(false); });
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        });

        document.addEventListener('click', function (event) {
            if (toggle.getAttribute('aria-expanded') !== 'true') return;
            if (menu.contains(event.target) || toggle.contains(event.target)) return;
            setOpen(false);
        });

        /* Threshold: 1024px = lg breakpoint de Tailwind (coincide con lg:hidden del navbar) */
        window.addEventListener('resize', function () {
            if (window.innerWidth >= 1024) {
                setOpen(false);
            }
        });

        setOpen(false);
    }

    /* Fallback del preloader: si GSAP no lo cierra en 3.5s, lo oculta igualmente */
    function preloaderFallback() {
        var preloader = document.getElementById('preloader');
        if (!preloader || getComputedStyle(preloader).display === 'none') return;
        preloader.style.opacity = '0';
        preloader.style.visibility = 'hidden';
        preloader.style.pointerEvents = 'none';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNavigation, { once: true });
    } else {
        initMobileNavigation();
    }

    window.setTimeout(preloaderFallback, 3500);
})();
