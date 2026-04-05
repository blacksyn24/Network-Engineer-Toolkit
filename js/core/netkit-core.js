/**
 * @file netkit-core.js
 * @description Shell : thème, navigation vues, historique projets, utilitaires UI.
 */
(function (global) {
  "use strict";

  const NetKit = global.NetKit || {};
  NetKit.ui = NetKit.ui || {};

  const THEME_KEY = "netkit-theme";
  const HISTORY_KEY = "netkit-project-history";
  const LEGACY_HISTORY = "subnetpro-history";
  const MAX_HISTORY = 40;

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function flashButtonLabel(btn, ok) {
    if (!btn) return;
    const prev = btn.textContent;
    btn.textContent = ok ? "Copié !" : "Copie impossible";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = prev;
      btn.disabled = false;
    }, 1600);
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function printContent(title, bodyHtml, subtitle) {
    const area = document.getElementById("print-area");
    if (!area) return;
    const sub = subtitle || "Network Engineer Toolkit — LANDJIDE Sedami Urbain";
    area.innerHTML = `<h1 style="font-size:14pt;margin:0 0 8px;">${escapeHtml(title)}</h1>
      <p style="font-size:9pt;color:#444;margin:0 0 12px;">${escapeHtml(sub)}</p>
      ${bodyHtml}`;
    global.print();
    area.innerHTML = "";
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = global.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
      const leg = localStorage.getItem(LEGACY_HISTORY);
      if (leg) {
        const old = JSON.parse(leg);
        if (Array.isArray(old)) {
          saveHistory(old.map((o) => ({ ...o, migrated: true })));
          return loadHistory();
        }
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  function saveHistory(items) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  }

  function pushHistory(entry) {
    const items = loadHistory();
    items.unshift({ ...entry, t: new Date().toISOString() });
    saveHistory(items);
  }

  function navigateTo(viewId) {
    document.querySelectorAll(".view-panel").forEach((p) => {
      p.hidden = p.dataset.view !== viewId;
    });
    document.querySelectorAll(".nav-item[data-view]").forEach((b) => {
      const active = b.dataset.view === viewId;
      b.classList.toggle("is-active", active);
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    const titles = {
      dashboard: "Tableau de bord",
      "ip-calc": "Calcul IP",
      planning: "Planification multi-sites",
      topology: "Topologie",
      config: "Configuration Cisco",
      simulation: "Simulation",
      history: "Historique & projets",
      learn: "Ressources pédagogiques",
    };
    const h = document.getElementById("view-heading");
    if (h) h.textContent = titles[viewId] || "Network Engineer Toolkit";

    if (viewId === "history" && typeof NetKit.renderHistoryPanel === "function") {
      NetKit.renderHistoryPanel();
    }

    if (global.history && global.history.replaceState) {
      global.history.replaceState(null, "", "#" + viewId);
    }
  }

  function initNavigation() {
    const openBtn = document.getElementById("btn-sidebar-open");
    const closeBtn = document.getElementById("btn-sidebar-close");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    function closeSidebar() {
      sidebar.classList.remove("is-open");
      overlay.hidden = true;
      document.body.classList.remove("sidebar-open");
    }

    function openSidebar() {
      sidebar.classList.add("is-open");
      overlay.hidden = false;
      document.body.classList.add("sidebar-open");
    }

    if (openBtn) openBtn.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);

    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.view;
        if (v) {
          navigateTo(v);
          closeSidebar();
        } else if (btn.id === "btn-sidebar-close") {
          closeSidebar();
        }
      });
    });

    document.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const v = el.getAttribute("data-goto");
        if (v) {
          e.preventDefault();
          navigateTo(v);
        }
      });
    });

    const hash = (global.location.hash || "").replace(/^#/, "");
    const valid = [
      "dashboard",
      "ip-calc",
      "planning",
      "topology",
      "config",
      "simulation",
      "history",
      "learn",
    ];
    navigateTo(valid.includes(hash) ? hash : "dashboard");

    const themeBtn = document.getElementById("btn-theme");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
    initTheme();
  }

  Object.assign(NetKit.ui, {
    escapeHtml,
    copyText,
    flashButtonLabel,
    downloadText,
    printContent,
    pushHistory,
    loadHistory,
    saveHistory,
    navigateTo,
    initNavigation,
    initTheme,
    toggleTheme,
  });

  NetKit.HISTORY_KEY = HISTORY_KEY;

  global.NetKit = NetKit;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavigation);
  } else {
    initNavigation();
  }
})(typeof window !== "undefined" ? window : globalThis);
