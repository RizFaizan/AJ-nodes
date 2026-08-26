(() => {
  "use strict";
  const doc = document;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof IntersectionObserver === "undefined") {
    doc.documentElement.classList.remove("js");
  }

  $("#year").textContent = new Date().getFullYear();
  $("#printBtn").addEventListener("click", () => window.print());

  const root = doc.documentElement;
  const themeToggle = $("#themeToggle");
  const themeMeta = doc.querySelector('meta[name="theme-color"]');
  const syncThemeChrome = () => {
    const dark = root.dataset.theme === "dark";
    themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    if (themeMeta) themeMeta.setAttribute("content", dark ? "#0a0e16" : "#f6f4ee");
  };
  const setTheme = (next) => {
    root.dataset.theme = next;
    try { localStorage.setItem("ajn-theme", next); } catch (e) {}
    syncThemeChrome();
  };
  themeToggle.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    if (doc.startViewTransition && !reduceMotion) {
      doc.startViewTransition(() => setTheme(next));
    } else {
      setTheme(next);
    }
  });
  syncThemeChrome();

  const foldables = $$("details");
  let wasFolded = [];
  window.addEventListener("beforeprint", () => {
    wasFolded = foldables.filter((d) => !d.open);
    wasFolded.forEach((d) => { d.open = true; });
  });
  window.addEventListener("afterprint", () => {
    wasFolded.forEach((d) => { d.open = false; });
    wasFolded = [];
  });

  const pad2 = (n) => String(n).padStart(2, "0");
  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion || typeof window.requestAnimationFrame !== "function") {
      el.textContent = el.dataset.pad ? pad2(target) : String(target);
      return;
    }
    const start = performance.now();
    const duration = 1100;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(target * eased);
      el.textContent = el.dataset.pad ? pad2(value) : String(value);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counterIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        runCounter(entry.target);
        counterIO.unobserve(entry.target);
      }
    }
  }, { threshold: 0.5 });
  $$("[data-count]").forEach((el) => counterIO.observe(el));

  const revealIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        revealIO.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => revealIO.observe(el));

  const navLinks = $$(".nav a");
  const linksById = new Map(navLinks.map((a) => [a.hash.slice(1), a]));
  const spyIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const link = linksById.get(entry.target.id);
      if (link && entry.isIntersecting) {
        navLinks.forEach((a) => a.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "true");
      }
    }
  }, { rootMargin: "-40% 0px -55% 0px" });
  linksById.forEach((_link, id) => {
    const section = doc.getElementById(id);
    if (section) spyIO.observe(section);
  });

  const items = $$(".page-item");
  const groups = $$(".page-group");
  const tabs = $$(".tab");
  const searchInput = $("#siteSearch");
  const countOutput = $("#resultCount");
  let activeCat = "all";
  const searchable = items.map((item) =>
    Array.from(item.querySelectorAll("h4, p")).map((el) => ({ el, plain: el.textContent }))
  );
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const applyFilters = () => {
    const query = searchInput.value.trim().toLowerCase();
    let shown = 0;
    items.forEach((item) => {
      const catOk = activeCat === "all" || item.dataset.cat === activeCat;
      const queryOk = !query || item.textContent.toLowerCase().includes(query);
      const visible = catOk && queryOk;
      item.hidden = !visible;
      if (visible) shown += 1;
    });
    groups.forEach((group) => {
      group.hidden = !$$(".page-item:not([hidden])", group).length;
    });
    searchable.forEach((pair) => {
      pair.forEach(({ el, plain }) => {
        if (query) {
          const rx = new RegExp("(" + query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
          el.innerHTML = plain
            .split(rx)
            .map((part, i) => (i % 2 ? "<mark>" + esc(part) + "</mark>" : esc(part)))
            .join("");
        } else {
          el.textContent = plain;
        }
      });
    });
    countOutput.textContent = `Showing ${shown} of ${items.length} pages`;
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.setAttribute("aria-pressed", String(t === tab)));
      activeCat = tab.dataset.cat;
      applyFilters();
    });
  });
  searchInput.addEventListener("input", applyFilters);
  applyFilters();

  const toTop = $("#toTop");
  const bar = $("#progressBar");
  let ticking = false;
  const updateChrome = () => {
    ticking = false;
    toTop.classList.toggle("show", window.scrollY > 640);
    if (bar) {
      const max = doc.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.transform = `scaleX(${ratio})`;
    }
  };
  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateChrome);
    }
  };
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  updateChrome();
  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  const navToggle = $("#navToggle");
  const mobileNav = $("#mobileNav");
  const setMenu = (open) => {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) {
      mobileNav.hidden = false;
      requestAnimationFrame(() => mobileNav.classList.add("open"));
      const first = mobileNav.querySelector("a");
      if (first) first.focus();
    } else {
      mobileNav.classList.remove("open");
      mobileNav.hidden = true;
    }
  };
  navToggle.addEventListener("click", () => setMenu(navToggle.getAttribute("aria-expanded") !== "true"));
  mobileNav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  matchMedia("(min-width: 881px)").addEventListener("change", (m) => {
    if (m.matches && navToggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      navToggle.focus();
    }
  });

  doc.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      navToggle.focus();
      return;
    }
    if (e.key !== "/" || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    e.preventDefault();
    searchInput.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    searchInput.focus({ preventScroll: true });
  });

  const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
  $$("[data-sig-date]").forEach((el) => {
    el.textContent = dateFmt.format(new Date());
  });
})();
