(() => {
  "use strict";
  const doc = document;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  $("#year").textContent = new Date().getFullYear();
  $("#printBtn").addEventListener("click", () => window.print());

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
  const onScroll = () => toTop.classList.toggle("show", window.scrollY > 640);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
})();
