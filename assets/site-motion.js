(function () {
  if (window.__centinelaMotionReady) return;
  window.__centinelaMotionReady = true;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== "undefined";
  const hasScrollTo = hasGsap && typeof window.ScrollToPlugin !== "undefined";
  const repeatVisit = window.sessionStorage.getItem("centinela_visited") === "1";
  let animationsStarted = false;

  // If repeat visit (internal navigation), suppress preloader instantly to eliminate double-loading and screen flashes
  if (repeatVisit) {
    const fastStyle = document.createElement("style");
    fastStyle.textContent = `
      #preloader { display: none !important; }
      body > :not(#preloader) { opacity: 1 !important; transform: none !important; }
    `;
    document.head.appendChild(fastStyle);
  } else {
    const motionStyles = document.createElement("style");
    motionStyles.textContent = `
      #preloader {
        opacity: 1;
        visibility: visible;
        transform: translateZ(0);
        will-change: transform;
      }
      #preloader h2 {
        letter-spacing: 0.28em;
        text-shadow: 0 0 20px rgb(var(--color-brand-neon-rgb) / 0.3);
        will-change: opacity, transform;
      }
      #preloader .loader-line {
        width: min(160px, 42vw);
        transform: scaleX(0);
        transform-origin: left center;
        background: linear-gradient(90deg, var(--color-brand-blue), var(--color-brand-neon));
        box-shadow: 0 0 12px var(--color-brand-neon-glow);
        will-change: transform;
      }
    `;
    document.head.appendChild(motionStyles);
  }

  if (hasScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
  if (hasScrollTo) window.gsap.registerPlugin(window.ScrollToPlugin);

  function prepareAnimations() {
    if (!hasGsap || reduceMotion) return;
    if (document.querySelector(".hero-title")) {
      window.gsap.set(".hero-text", { y: 14, opacity: 0 });
      window.gsap.set(".hero-title", { y: 18, opacity: 0 });
      window.gsap.set(".hero-desc, .hero-btn", { y: 12, opacity: 0 });
      window.gsap.set(".hero-image-container", { scale: 0.98, opacity: 0 });
    }
  }

  function revealOnScroll(selector, options) {
    if (!hasGsap || reduceMotion) return;
    const elements = window.gsap.utils.toArray(selector);
    elements.forEach((element, index) => {
      const finalY = options.finalY ? options.finalY(element, index) : 0;
      window.gsap.fromTo(
        element,
        {
          x: options.x || 0,
          y: options.y || 16,
          scale: options.scale || 1,
          opacity: 0,
        },
        {
          x: 0,
          y: finalY,
          scale: 1,
          opacity: 1,
          duration: options.duration || 0.5,
          delay: options.delay ? options.delay(index) : 0,
          ease: options.ease || "power2.out",
          clearProps: options.clearProps || "opacity,transform",
          scrollTrigger: hasScrollTrigger
            ? {
                trigger: element,
                start: options.start || "top 92%",
                once: true,
              }
            : undefined,
        }
      );
    });
  }

  function initAnimations() {
    if (animationsStarted) return;
    animationsStarted = true;
    document.documentElement.classList.add("site-ready");

    if (!hasGsap || reduceMotion) {
      document.querySelectorAll("[style*='opacity']").forEach((element) => {
        element.style.opacity = "";
        element.style.transform = "";
      });
      return;
    }

    // Hero timeline (single clean pass, no double animation)
    if (document.querySelector(".hero-title")) {
      const timeline = window.gsap.timeline({ defaults: { ease: "power2.out" } });
      timeline
        .to(".hero-text", { y: 0, opacity: 1, duration: 0.45 })
        .to(".hero-title", { y: 0, opacity: 1, duration: 0.55 }, "-=0.3")
        .to(".hero-desc", { y: 0, opacity: 1, duration: 0.42 }, "-=0.35")
        .to(".hero-btn", { y: 0, opacity: 1, duration: 0.38 }, "-=0.3")
        .to(".hero-image-container", { scale: 1, opacity: 1, duration: 0.6 }, "-=0.45");
    }

    // Profile cards (fade in smoothly)
    if (document.querySelector(".profile-card")) {
      window.gsap.fromTo(
        ".profile-card",
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: "power2.out",
          clearProps: "opacity,transform",
        }
      );
    }

    // Subtle scroll reveals
    revealOnScroll(".section-header", { y: 16, duration: 0.5 });
    revealOnScroll(".history-title, .history-text, .history-box", {
      x: -14,
      y: 0,
      duration: 0.5,
      delay: (index) => index * 0.05,
    });
    revealOnScroll(".history-card", { y: 18, duration: 0.5 });
    revealOnScroll(".symbol-card", {
      y: 18,
      duration: 0.55,
      finalY: (element) => (element.classList.contains("md:translate-y-8") ? 32 : 0),
      clearProps: "opacity,transform",
    });
    revealOnScroll(".team-card", {
      y: 16,
      duration: 0.48,
      delay: (index) => (index % 4) * 0.04,
    });
    revealOnScroll(".quote-container", { y: 10, scale: 0.98, duration: 0.6 });
    revealOnScroll(".news-card-anim", {
      y: 16,
      duration: 0.5,
      delay: (index) => (index % 3) * 0.04,
    });

    const heroSection = document.getElementById("inicio");
    const shield = document.querySelector(".shield-image");
    if (heroSection && shield && window.matchMedia("(pointer: fine)").matches) {
      heroSection.addEventListener("mousemove", (event) => {
        window.gsap.to(shield, {
          x: (window.innerWidth / 2 - event.clientX) / 60,
          y: (window.innerHeight / 2 - event.clientY) / 60,
          duration: 0.65,
          overwrite: "auto",
          ease: "power1.out",
        });
      });
    }

    if (hasScrollTrigger) {
      window.requestAnimationFrame(() => window.ScrollTrigger.refresh());
    }
  }

  function closePreloader() {
    const preloader = document.getElementById("preloader");
    if (!preloader) {
      initAnimations();
      return;
    }

    if (!hasGsap || reduceMotion) {
      preloader.remove();
      initAnimations();
      return;
    }

    const exitTimeline = window.gsap.timeline({
      onComplete: () => {
        preloader.remove();
        if (hasScrollTrigger) window.ScrollTrigger.refresh();
      }
    });

    const preloaderContent = preloader.querySelectorAll("h2, .loader-line, img");

    exitTimeline
      .to(preloaderContent, {
        opacity: 0,
        y: -10,
        duration: 0.22,
        ease: "power2.in"
      })
      .to(preloader, {
        yPercent: -100,
        duration: 0.6,
        ease: "power3.inOut"
      }, "-=0.04");

    initAnimations();
  }

  async function startPage() {
    const preloader = document.getElementById("preloader");

    // If repeat visit, remove preloader immediately and start page directly without flash
    if (repeatVisit) {
      if (preloader) preloader.remove();
      initAnimations();
      return;
    }

    // First visit to site
    window.sessionStorage.setItem("centinela_visited", "1");
    prepareAnimations();

    const loaderLine = document.querySelector("#preloader .loader-line");
    const preloaderH2 = document.querySelector("#preloader h2");

    if (!preloader || !hasGsap || reduceMotion) {
      if (preloader) preloader.remove();
      initAnimations();
      return;
    }

    const startTimeline = window.gsap.timeline();
    window.gsap.set(preloaderH2, { scale: 0.96, opacity: 0, y: 6 });
    
    startTimeline
      .to(preloaderH2, {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out"
      })
      .to(
        loaderLine,
        {
          scaleX: 1,
          duration: 0.85,
          ease: "power1.inOut",
          onComplete: closePreloader
        },
        "-=0.15"
      );
  }

  function setupNavbar() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    let scheduled = false;
    const update = () => {
      navbar.classList.toggle("shadow-lg", window.scrollY > 40);
      scheduled = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  function setupSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        const target = document.querySelector(anchor.getAttribute("href"));
        if (!target) return;
        event.preventDefault();
        if (hasScrollTo && !reduceMotion) {
          window.gsap.to(window, {
            duration: 0.65,
            scrollTo: { y: target, offsetY: 80 },
            ease: "power2.inOut",
          });
        } else {
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        }
      });
    });
  }

  function setupTheme() {
    const activeTheme = window.localStorage.getItem("centinela_theme") || "home";
    if (activeTheme === "away") {
      document.documentElement.classList.add("theme-away");
    } else {
      document.documentElement.classList.remove("theme-away");
    }

    document.addEventListener("click", (event) => {
      const btn = event.target.closest("#themeToggleBtn, #themeToggleBtnNavbar, #themeToggleBtnMobile, [data-theme-toggle]");
      if (!btn) return;
      event.preventDefault();
      const isAway = document.documentElement.classList.toggle("theme-away");
      window.localStorage.setItem("centinela_theme", isAway ? "away" : "home");
    });
  }

  setupNavbar();
  setupSmoothAnchors();
  setupTheme();
  startPage();

  window.setTimeout(() => {
    const preloader = document.getElementById("preloader");
    if (preloader) closePreloader();
    if (hasScrollTrigger) window.ScrollTrigger.refresh();
  }, 1200);

  window.addEventListener("load", () => {
    if (hasScrollTrigger) window.ScrollTrigger.refresh();
  });
})();
