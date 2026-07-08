/* =============================================================
   TRAVEL WITH LOVE — Olena Kovalchuk
   Phase 1 — Base & Motion Canvas
   Vanilla JS · zero dependencies · GPU-friendly
   Controllers: AmbientSea · NavController · Reveal
   ============================================================= */
"use strict";

(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* -----------------------------------------------------------
     AmbientSea — lightweight "sea-inspired" particle drift.
     Soft light motes rise and sway like caustics on water.
     Rendered on a blended, low-opacity canvas behind the UI.
  ----------------------------------------------------------- */
  const AmbientSea = (() => {
    let canvas, ctx, w, h, dpr, particles, raf = null, running = false;

    const PALETTE = ["58,143,137", "39,107,102", "217,195,162"]; // sea, sea-deep, sand

    const config = {
      density: 0.00008,   // particles per pixel (auto-scaled, capped)
      min: 26,
      max: 90,
    };

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      const count = Math.max(config.min, Math.min(config.max, Math.round(w * h * config.density)));
      particles = Array.from({ length: count }, () => spawn(true));
    }

    function spawn(scatter) {
      return {
        x: Math.random() * w,
        y: scatter ? Math.random() * h : h + 20,
        r: 1 + Math.random() * 2.6,
        speed: 0.12 + Math.random() * 0.35,   // gentle upward flow
        sway: 0.4 + Math.random() * 1.1,      // horizontal drift amplitude
        phase: Math.random() * Math.PI * 2,
        freq: 0.002 + Math.random() * 0.004,
        alpha: 0.12 + Math.random() * 0.28,
        tint: PALETTE[(Math.random() * PALETTE.length) | 0],
      };
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y -= p.speed;
        p.phase += p.freq;
        const x = p.x + Math.sin(p.phase) * p.sway * 6;

        if (p.y < -10) Object.assign(p, spawn(false));

        const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(${p.tint}, ${p.alpha})`);
        g.addColorStop(1, `rgba(${p.tint}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    function start() {
      if (running || prefersReduced.matches) return;
      running = true;
      draw();
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    function renderStatic() {
      // Reduced-motion: paint a single calm frame, no loop.
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(${p.tint}, ${p.alpha})`);
        g.addColorStop(1, `rgba(${p.tint}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      canvas = document.getElementById("sea-canvas");
      if (!canvas) return;
      ctx = canvas.getContext("2d", { alpha: true });
      size();
      seed();

      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          size();
          seed();
          if (prefersReduced.matches) renderStatic();
        }, 180);
      }, { passive: true });

      // Pause when tab hidden — save cycles.
      document.addEventListener("visibilitychange", () => {
        document.hidden ? stop() : start();
      });

      // React live to reduced-motion changes.
      prefersReduced.addEventListener("change", (e) => {
        if (e.matches) { stop(); renderStatic(); }
        else start();
      });

      if (prefersReduced.matches) renderStatic();
      else start();
    }

    return { init };
  })();

  /* -----------------------------------------------------------
     NavController — scroll-spy for the bottom app-nav.
     Highlights the section currently in view.
  ----------------------------------------------------------- */
  const NavController = (() => {
    function init() {
      const items = Array.from(document.querySelectorAll(".tabbar__item"));
      if (!items.length) return;
      const map = new Map(items.map((el) => [el.dataset.nav, el]));
      const sections = items
        .map((el) => document.getElementById(el.dataset.nav))
        .filter(Boolean);

      const setActive = (id) => {
        items.forEach((el) => el.classList.toggle("is-active", el.dataset.nav === id));
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && map.has(entry.target.id)) {
              setActive(entry.target.id);
            }
          });
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      sections.forEach((s) => observer.observe(s));
    }
    return { init };
  })();

  /* -----------------------------------------------------------
     Reveal — cinematic staggered entrance via IntersectionObserver.
     Reads data-reveal-delay for 60ms index stagger.
  ----------------------------------------------------------- */
  const Reveal = (() => {
    function init() {
      const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
      if (!nodes.length) return;

      nodes.forEach((n) => {
        if (n.dataset.revealDelay) n.style.setProperty("--reveal-i", n.dataset.revealDelay);
      });

      if (prefersReduced.matches) {
        nodes.forEach((n) => n.classList.add("is-in"));
        return;
      }

      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              obs.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
      );
      nodes.forEach((n) => observer.observe(n));
    }
    return { init };
  })();

  /* -----------------------------------------------------------
     Toast — transient status messages (aria-live).
  ----------------------------------------------------------- */
  const Toast = (() => {
    let el, timer;
    function show(msg) {
      el = el || document.getElementById("toast");
      if (!el) return;
      el.textContent = msg;
      el.classList.add("is-visible");
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove("is-visible"), 3200);
    }
    return { show };
  })();

  /* -----------------------------------------------------------
     TourFilter — instant zero-latency category switch.
  ----------------------------------------------------------- */
  const TourFilter = (() => {
    function init() {
      const pills = Array.from(document.querySelectorAll(".filter__pill"));
      const cards = Array.from(document.querySelectorAll(".tour-card"));
      const empty = document.querySelector(".tour-grid__empty");
      if (!pills.length) return;

      pills.forEach((pill) => {
        pill.addEventListener("click", () => {
          const filter = pill.dataset.filter;
          pills.forEach((p) => {
            const on = p === pill;
            p.classList.toggle("is-active", on);
            p.setAttribute("aria-selected", on ? "true" : "false");
          });
          let visible = 0;
          cards.forEach((card) => {
            const cats = (card.dataset.categories || "").split(" ");
            const match = filter === "all" || cats.includes(filter);
            card.classList.toggle("is-hidden", !match);
            if (match) visible++;
          });
          if (empty) empty.hidden = visible !== 0;
        });
      });
    }
    return { init };
  })();

  /* -----------------------------------------------------------
     TourDrawer — expandable detail sheet with feature tokens.
  ----------------------------------------------------------- */
  const TourDrawer = (() => {
    const TOURS = {
      antalya: {
        tag: "Туреччина · Анталія", title: "Відпочинок у раю",
        meta: "7 ночей • Все включено • 2 дорослих", price: "від $650",
        img: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80",
      },
      sharm: {
        tag: "Єгипет · Шарм-ель-Шейх", title: "Сонце та море",
        meta: "7 ночей • Все включено • 2 дорослих", price: "від $590",
        img: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1200&q=80",
      },
      crete: {
        tag: "Греція · о. Крит", title: "Грецька казка",
        meta: "7 ночей • Сніданки • 2 дорослих", price: "від $720",
        img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
      },
    };
    const FEATURES = [
      { label: "Готель 5★", svg: '<path d="m12 4 2.3 4.7 5.2.8-3.7 3.6.9 5.1L12 15.8 7.3 18.2l.9-5.1L4.5 9.5l5.2-.8L12 4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' },
      { label: "Перша лінія / пляж", svg: '<path d="M4 18h16M6 18c0-4 2.7-7 6-7s6 3 6 7M12 4v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
      { label: "Харчування", svg: '<path d="M6 3v8a2 2 0 0 0 4 0V3M8 3v18M18 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' },
      { label: "Трансфер", svg: '<path d="M4 12h16v5H4zM6 12l2-5h8l2 5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="17" r="1.4" fill="currentColor"/><circle cx="16" cy="17" r="1.4" fill="currentColor"/>' },
    ];

    let drawer, panel, lastFocus;

    function open(id) {
      const t = TOURS[id];
      if (!t || !drawer) return;
      lastFocus = document.activeElement;
      document.getElementById("drawer-img").src = t.img;
      document.getElementById("drawer-img").alt = t.title;
      document.getElementById("drawer-tag").textContent = t.tag;
      document.getElementById("drawer-title").textContent = t.title;
      document.getElementById("drawer-meta").textContent = t.meta;
      document.getElementById("drawer-price").textContent = t.price;
      document.getElementById("drawer-features").innerHTML = FEATURES.map((f) =>
        `<li class="feature"><span class="feature__icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${f.svg}</svg></span>${f.label}</li>`
      ).join("");

      drawer.hidden = false;
      requestAnimationFrame(() => drawer.classList.add("is-open"));
      document.body.style.overflow = "hidden";
      drawer.querySelector(".drawer__close").focus();
    }

    function close() {
      if (!drawer) return;
      drawer.classList.remove("is-open");
      document.body.style.overflow = "";
      const done = () => { drawer.hidden = true; panel.removeEventListener("transitionend", done); };
      panel.addEventListener("transitionend", done);
      if (lastFocus) lastFocus.focus();
    }

    function init() {
      drawer = document.getElementById("tour-drawer");
      if (!drawer) return;
      panel = drawer.querySelector(".drawer__panel");

      document.querySelectorAll("[data-tour]").forEach((btn) =>
        btn.addEventListener("click", () => open(btn.dataset.tour))
      );
      drawer.querySelectorAll("[data-close]").forEach((el) =>
        el.addEventListener("click", close)
      );
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !drawer.hidden) close();
      });
    }
    return { init };
  })();

  /* -----------------------------------------------------------
     SaveContact — native vCard (.vcf) Blob download.
  ----------------------------------------------------------- */
  const SaveContact = (() => {
    const VCARD = [
      "BEGIN:VCARD", "VERSION:3.0",
      "N:Ковальчук;Олена;;;", "FN:Олена Ковальчук",
      "ORG:Travel with Love", "TITLE:Персональний тревел-агент",
      "TEL;TYPE=CELL:+380971234567",
      "EMAIL;TYPE=INTERNET:olena.travel@gmail.com",
      "ADR;TYPE=WORK:;;вул. Хрещатик, 2 (офіс 5);Київ;;;Україна",
      "URL:https://wa.me/380971234567",
      "NOTE:Персональний тревел-агент та куратор преміальних подорожей",
      "END:VCARD",
    ].join("\r\n");

    function save() {
      try {
        const blob = new Blob([VCARD], { type: "text/vcard;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Olena_Kovalchuk.vcf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        Toast.show("Контакт збережено ✓");
      } catch (err) {
        Toast.show("Не вдалося зберегти контакт");
      }
    }

    function init() {
      document.querySelectorAll('[data-action="save-contact"]').forEach((btn) =>
        btn.addEventListener("click", save)
      );
    }
    return { init };
  })();

  /* -----------------------------------------------------------
     ShareCard — navigator.share() with clipboard fallback.
  ----------------------------------------------------------- */
  const ShareCard = (() => {
    async function share() {
      const data = {
        title: "Олена Ковальчук — Travel with Love",
        text: "Персональний тревел-агент. Створюю незабутні подорожі для вас.",
        url: window.location.href,
      };
      if (navigator.share) {
        try { await navigator.share(data); } catch (_) { /* user cancelled */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(data.url);
        Toast.show("Посилання скопійовано ✓");
      } catch (_) {
        Toast.show("Скопіюйте посилання з рядка адреси");
      }
    }
    function init() {
      document.querySelectorAll('[data-action="share"]').forEach((btn) =>
        btn.addEventListener("click", share)
      );
    }
    return { init };
  })();

  /* -----------------------------------------------------------
     SaveToggle — heart save state on tour cards.
  ----------------------------------------------------------- */
  const SaveToggle = (() => {
    function init() {
      document.querySelectorAll(".tour-card__save").forEach((btn) => {
        btn.addEventListener("click", () => {
          const on = btn.getAttribute("aria-pressed") === "true";
          btn.setAttribute("aria-pressed", on ? "false" : "true");
          Toast.show(on ? "Прибрано зі збережених" : "Додано у збережені ♥");
        });
      });
    }
    return { init };
  })();

  /* ----------------------------- BOOT ----------------------------- */
  function boot() {
    AmbientSea.init();
    NavController.init();
    Reveal.init();
    TourFilter.init();
    TourDrawer.init();
    SaveContact.init();
    ShareCard.init();
    SaveToggle.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
