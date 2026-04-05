/**
 * @file simulation-module.js
 * @description Simulation simple : trame ICMP-like animée entre deux hôtes sur un segment logique.
 */
(function (global) {
  "use strict";
  const U = global.NetKit.ui;
  const I = global.NetKit.ip;

  const canvas = document.getElementById("sim-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  let animId = null;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function drawScene(hostA, hostB, packetX) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    ctx.fillStyle = cssVar("--bg-elevated", isDark ? "#181c27" : "#ffffff");
    ctx.fillRect(0, 0, w, h);

    const y = h / 2;
    const x1 = 60;
    const x2 = w - 60;

    ctx.strokeStyle = cssVar("--border", "#ccc");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1 + 40, y);
    ctx.lineTo(x2 - 40, y);
    ctx.stroke();

    function drawHost(x, label, ip) {
      ctx.fillStyle = cssVar("--accent", "#2563eb");
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x, y + 4);
      ctx.fillStyle = cssVar("--text-muted", "#64748b");
      ctx.font = "9px monospace";
      ctx.fillText(ip, x, y + 48);
    }

    drawHost(x1, "A", hostA);
    drawHost(x2, "B", hostB);

    if (packetX != null) {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(packetX, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1d26";
      ctx.font = "8px monospace";
      ctx.fillText("echo", packetX, y - 14);
    }
  }

  function sameSubnet(a, b, cidr) {
    const ia = I.ipToInt(a);
    const ib = I.ipToInt(b);
    if (ia == null || ib == null) return false;
    const m = I.cidrToMaskInt(cidr);
    return (ia & m) === (ib & m);
  }

  document.getElementById("btn-sim-ping")?.addEventListener("click", () => {
    const log = document.getElementById("sim-log");
    const ipA = document.getElementById("sim-ip-a").value.trim();
    const ipB = document.getElementById("sim-ip-b").value.trim();
    const cidr = parseInt(document.getElementById("sim-cidr").value, 10);

    if (!I.isValidIPv4(ipA) || !I.isValidIPv4(ipB) || !Number.isInteger(cidr) || cidr < 0 || cidr > 32) {
      log.textContent = "Vérifiez les IPv4 et le CIDR.";
      return;
    }
    if (!sameSubnet(ipA, ipB, cidr)) {
      log.textContent = "Les hôtes ne sont pas dans le même sous-réseau (simulation locale : aucune passerelle modélisée).";
      drawScene(ipA, ipB, null);
      return;
    }

    if (animId) cancelAnimationFrame(animId);
    const x1 = 60;
    const x2 = canvas.width - 60;
    let t0 = null;
    const duration = 1200;

    function frame(ts) {
      if (!t0) t0 = ts;
      const p = Math.min(1, (ts - t0) / duration);
      const px = x1 + (x2 - x1) * p;
      drawScene(ipA, ipB, px);
      if (p < 1) animId = requestAnimationFrame(frame);
      else {
        log.textContent = `Reply from ${ipB}: time=1ms (simulation)\nTTL=64\n--- Fin simulation ---`;
        U.pushHistory({ type: "sim", summary: `Simulation ping ${ipA} → ${ipB}` });
        animId = null;
      }
    }
    log.textContent = `PING ${ipB} depuis ${ipA} ...`;
    animId = requestAnimationFrame(frame);
  });

  drawScene("192.168.1.1", "192.168.1.2", null);
})(window);
