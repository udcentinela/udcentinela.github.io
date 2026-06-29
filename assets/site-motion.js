(function () {
  if (window.__centinelaMotionReady) return;
  window.__centinelaMotionReady = true;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== "undefined";
  const hasScrollTo = hasGsap && typeof window.ScrollToPlugin !== "undefined";
  const repeatVisit = window.sessionStorage.getItem("centinela_visited") === "1";
  let animationsStarted = false;

  const motionStyles = document.createElement("style");
  motionStyles.textContent = `
    #preloader {
      opacity: 1;
      visibility: visible;
      transform: translateZ(0);
      will-change: opacity, transform, filter;
    }
    #preloader h2 {
      letter-spacing: 0.32em;
      text-shadow: 0 0 30px rgba(0, 210, 255, 0.4);
      will-change: opacity, transform, filter;
    }
    #preloader .loader-line {
      width: min(180px, 46vw);
      transform: scaleX(0);
      transform-origin: left center;
      background: linear-gradient(90deg, #0052FF, #00d2ff, #a5f3fc);
      box-shadow: 0 0 18px rgba(0, 210, 255, 0.9);
      will-change: transform;
    }
    body > :not(#preloader) {
      will-change: opacity, transform, filter;
    }
  `;
  document.head.appendChild(motionStyles);

  if (hasScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
  if (hasScrollTo) window.gsap.registerPlugin(window.ScrollToPlugin);

  function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function prepareAnimations() {
    if (!hasGsap || reduceMotion) return;
    window.gsap.set(".hero-text", { y: 16, opacity: 0 });
    window.gsap.set(".hero-title", { y: 24, opacity: 0 });
    window.gsap.set(".hero-desc, .hero-btn", { y: 14, opacity: 0 });
    window.gsap.set(".hero-image-container", { scale: 0.97, opacity: 0 });
    window.gsap.set(".profile-card", { y: 18, opacity: 0 });
  }

  function revealOnScroll(selector, options) {
    if (!hasGsap) return;
    const elements = window.gsap.utils.toArray(selector);
    elements.forEach((element, index) => {
      const finalY = options.finalY ? options.finalY(element, index) : 0;
      window.gsap.fromTo(
        element,
        {
          x: options.x || 0,
          y: options.y || 18,
          scale: options.scale || 1,
          opacity: 0,
        },
        {
          x: 0,
          y: finalY,
          scale: 1,
          opacity: 1,
          duration: options.duration || 0.65,
          delay: options.delay ? options.delay(index) : 0,
          ease: options.ease || "power2.out",
          clearProps: options.clearProps || "opacity,transform",
          scrollTrigger: hasScrollTrigger
            ? {
                trigger: element,
                start: options.start || "top 88%",
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

    if (document.querySelector(".hero-title")) {
      const timeline = window.gsap.timeline({ defaults: { ease: "power2.out" } });
      timeline
        .to(".hero-text", { y: 0, opacity: 1, duration: 0.48 })
        .to(".hero-title", { y: 0, opacity: 1, duration: 0.62 }, "-=0.34")
        .to(".hero-desc", { y: 0, opacity: 1, duration: 0.48 }, "-=0.38")
        .to(".hero-btn", { y: 0, opacity: 1, duration: 0.42 }, "-=0.32")
        .to(".hero-image-container", { scale: 1, opacity: 1, duration: 0.72 }, "-=0.62");
    }

    window.gsap.to(".profile-card", {
      y: 0,
      opacity: 1,
      duration: 0.62,
      stagger: 0.07,
      ease: "power2.out",
      clearProps: "opacity,transform",
    });

    revealOnScroll(".section-header", { y: 18, duration: 0.58 });
    revealOnScroll(".history-title, .history-text, .history-box", {
      x: -18,
      y: 0,
      duration: 0.58,
      delay: (index) => index * 0.06,
    });
    revealOnScroll(".history-card", { y: 22, duration: 0.58 });
    revealOnScroll(".symbol-card", {
      y: 20,
      duration: 0.6,
      finalY: (element) => (element.classList.contains("md:translate-y-8") ? 32 : 0),
      clearProps: "opacity,transform",
    });
    revealOnScroll(".team-card", {
      y: 18,
      duration: 0.55,
      delay: (index) => (index % 4) * 0.045,
    });
    revealOnScroll(".quote-container", { y: 12, scale: 0.98, duration: 0.7 });
    revealOnScroll(".news-card-anim", {
      y: 20,
      duration: 0.58,
      delay: (index) => (index % 3) * 0.05,
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
      }
    });

    exitTimeline
      .to(preloader, {
        opacity: 0,
        scale: 1.08,
        filter: "blur(15px)",
        duration: 0.8,
        ease: "power2.inOut"
      })
      .to(
        document.querySelectorAll("body > :not(#preloader)"),
        {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.1,
          ease: "power3.out",
          clearProps: "all"
        },
        "-=0.55"
      );

    initAnimations();
  }

  async function startPage() {
    prepareAnimations();
    window.sessionStorage.setItem("centinela_visited", "1");
    
    const preloader = document.getElementById("preloader");
    const loaderLine = document.querySelector("#preloader .loader-line");
    const preloaderH2 = document.querySelector("#preloader h2");

    if (!preloader || !hasGsap || reduceMotion) {
      if (preloader) preloader.remove();
      initAnimations();
      return;
    }

    if (preloaderH2) {
      const text = preloaderH2.textContent.trim();
      preloaderH2.innerHTML = text
        .split("")
        .map(char => `<span class="preloader-char inline-block" style="opacity: 0; filter: blur(8px); transform: translate3d(0, 10px, 0);">${char}</span>`)
        .join("");
    }

    const mainContent = document.querySelectorAll("body > :not(#preloader)");
    window.gsap.set(mainContent, { opacity: 0, scale: 0.94, filter: "blur(12px)" });

    if (repeatVisit) {
      window.gsap.to(loaderLine, {
        scaleX: 1,
        duration: 0.25,
        ease: "power2.inOut",
        onComplete: closePreloader
      });
      return;
    }

    const startTimeline = window.gsap.timeline();
    startTimeline
      .to(".preloader-char", {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.7,
        stagger: 0.07,
        ease: "power3.out"
      })
      .to(
        loaderLine,
        {
          scaleX: 1,
          duration: 1.3,
          ease: "power2.inOut",
          onComplete: closePreloader
        },
        "-=0.55"
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

  function setupInternalNavigation() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      if (url.href === window.location.href) return;

      event.preventDefault();
      document.body.classList.add("page-leaving");
      window.setTimeout(() => {
        window.location.href = url.href;
      }, reduceMotion ? 0 : 110);
    });
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

  setupNavbar();
  setupInternalNavigation();
  setupSmoothAnchors();
  startPage();

  window.setTimeout(() => {
    const preloader = document.getElementById("preloader");
    if (preloader) closePreloader();
  }, 1600);
})();
