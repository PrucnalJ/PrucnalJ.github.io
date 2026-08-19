/* ============================================================
   Jacek Prucnal — progressive enhancement.
   The page is fully readable and navigable without this file.
   Everything here is an upgrade, never a requirement.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ---------- theme ---------- */
  var toggle = document.querySelector(".theme-toggle");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (toggle) {
      var next = theme === "dark" ? "light" : "dark";
      toggle.setAttribute("aria-label", "Switch to " + next + " theme");
      toggle.setAttribute("aria-pressed", String(theme === "light"));
    }
  }

  function setTheme(theme) {
    try { localStorage.setItem("theme", theme); } catch (e) { /* private mode */ }
    // View Transitions make the swap a cross-fade instead of a hard cut.
    if (document.startViewTransition && !reduced.matches) {
      document.startViewTransition(function () { applyTheme(theme); });
    } else {
      applyTheme(theme);
    }
  }

  applyTheme(root.getAttribute("data-theme") || "dark");

  if (toggle) {
    toggle.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  /* ---------- sticky nav state ---------- */
  var nav = document.querySelector(".nav");
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (nav) nav.classList.toggle("is-stuck", window.scrollY > 24);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");

  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
    if (open) {
      menu.hidden = false;
      // let the browser paint the un-hidden element before animating
      requestAnimationFrame(function () { menu.classList.add("is-open"); });
      var first = menu.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    } else {
      menu.classList.remove("is-open");
      menu.hidden = true;
    }
  }

  if (burger && menu) {
    burger.addEventListener("click", function () {
      setMenu(burger.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        burger.focus();
      }
    });
    // a resize past the breakpoint should never leave the overlay stuck open
    window.matchMedia("(min-width: 641px)").addEventListener("change", function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- scroll-spy ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav__links a"));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- stat counters ---------- */
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimals || "0", 10);
    var suffix = el.dataset.suffix || "";
    var duration = 1500;
    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      // easeOutExpo — fast start, gentle landing
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      var value = target * eased;
      el.textContent = (decimals
        ? value.toFixed(decimals)
        : Math.round(value).toLocaleString("en-US")) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- cursor spotlight (fine pointers only) ---------- */
  if (finePointer.matches && !reduced.matches) {
    document.querySelectorAll(".spotlight").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    });
  }

  /* ---------- scroll reveals + counters ----------
     Deliberately geometry-based rather than IntersectionObserver. IO callbacks
     are tied to frame production, which makes them unreliable in headless and
     prerender contexts — and a reveal that never fires leaves the section
     permanently invisible, so this is not a failure worth risking. A rAF-
     throttled rect check over a list that shrinks to empty costs nothing.

     The stylesheet only hides `.reveal` while `html.js` is set, and the inline
     head script strips that class if we never reach this line, so both the
     no-JS and script-failed paths fall back to plain visible content. */
  var pending = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var counters = Array.prototype.slice.call(document.querySelectorAll(".stat__num[data-count]"));

  function reveal(el, i) {
    el.style.setProperty("--d", Math.min(i, 5) * 70 + "ms");
    el.classList.add("is-visible");
  }

  if (reduced.matches) {
    pending.forEach(function (el) { el.classList.add("is-visible"); });
    pending = [];
    counters = [];
  }

  var pass = false;
  function scan() {
    pass = false;
    var h = window.innerHeight || document.documentElement.clientHeight;

    pending = pending.filter(function (el, i) {
      var r = el.getBoundingClientRect();
      // visible once its top edge has risen above 92% of the viewport height
      if (r.top < h * 0.92 && r.bottom > 0) { reveal(el, i); return false; }
      return true;
    });

    counters = counters.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < h * 0.85 && r.bottom > 0) { countUp(el); return false; }
      return true;
    });

    if (!pending.length && !counters.length) {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    }
  }

  function queue() {
    if (pass) return;
    pass = true;
    requestAnimationFrame(scan);
  }

  if (pending.length || counters.length) {
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    queue();
    // late webfont/image layout shifts can move things into view after paint
    addEventListener("load", queue);

    /* Hard backstop. Content that stays hidden is the single worst outcome
       here, and it is worth more than the animation. If anything above has
       not revealed an element within a few seconds — a bug in the scan, an
       environment that never fires scroll, a prerender — show everything.
       Normal browsing always beats this timer, so it is invisible in practice. */
    setTimeout(function () {
      pending.forEach(function (el) { el.classList.add("is-visible"); });
      pending = [];
      counters.forEach(countUp);
      counters = [];
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    }, 4000);
  }

  window.__revealReady = true;

  /* ---------- footer year ---------- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
