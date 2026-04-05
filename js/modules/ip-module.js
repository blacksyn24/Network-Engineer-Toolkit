/**
 * @file ip-module.js
 * @description Module Calcul IP : VLSM, IPv6 /64, conversions (binaire, CIDR, masque).
 */
(function (global) {
  "use strict";
  const I = global.NetKit.ip;
  const U = global.NetKit.ui;

  function buildVlsmSteps(baseIp, hostsPerLan, result) {
    if (!result.ok) return `<p>${U.escapeHtml(result.error)}</p>`;
    const sorted = hostsPerLan
      .map((h, i) => ({ i: i + 1, h, needed: h + 2 }))
      .sort((a, b) => b.needed - a.needed);
    let html = "<ol>";
    html +=
      "<li><strong>Besoins :</strong> hôtes + 2 (réseau et broadcast) par LAN.</li>";
    html += "<li><strong>Tri VLSM :</strong> du plus grand bloc au plus petit.</li>";
    html += "<li><strong>Puissance de 2 :</strong> taille minimale de sous-réseau.</li>";
    html += `<li><strong>Départ :</strong> <code>${U.escapeHtml(baseIp.trim())}</code>.</li>`;
    html += "<li><strong>Alignement :</strong> chaque réseau sur une frontière de bloc.</li>";
    html += "<li><strong>Ordre :</strong> ";
    html += sorted.map((s) => `LAN ${s.i} (${s.h} h.)`).join(" → ");
    html += ".</li></ol>";
    return html;
  }

  /* ——— Sous-onglets IP ——— */
  document.querySelectorAll(".subtab-ip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.subpanel;
      document.querySelectorAll(".subtab-ip").forEach((b) => b.classList.toggle("is-active", b === btn));
      document.querySelectorAll("[data-subpanel-ip]").forEach((p) => {
        p.hidden = p.getAttribute("data-subpanel-ip") !== target;
      });
    });
  });

  /* VLSM */
  const hostsContainer = document.getElementById("hosts-container");
  const numLansInput = document.getElementById("num-lans");

  function renderHostInputs(n) {
    if (!hostsContainer) return;
    hostsContainer.innerHTML = "";
    const count = Math.min(64, Math.max(1, parseInt(n, 10) || 1));
    for (let i = 1; i <= count; i++) {
      const row = document.createElement("div");
      row.className = "host-row";
      const lab = document.createElement("label");
      lab.htmlFor = `hosts-lan-${i}`;
      lab.textContent = `LAN ${i}`;
      const inp = document.createElement("input");
      inp.type = "number";
      inp.id = `hosts-lan-${i}`;
      inp.min = "1";
      inp.max = "16777214";
      inp.value = i === 1 ? "100" : i === 2 ? "50" : "10";
      inp.required = true;
      row.appendChild(lab);
      row.appendChild(inp);
      hostsContainer.appendChild(row);
    }
  }

  const genLans = document.getElementById("btn-generate-lans");
  if (genLans && numLansInput) {
    genLans.addEventListener("click", () => renderHostInputs(numLansInput.value));
    renderHostInputs(numLansInput.value);
  }

  let lastVlsmText = "";
  const formVlsm = document.getElementById("form-vlsm");
  if (formVlsm) {
    formVlsm.addEventListener("submit", (e) => {
      e.preventDefault();
      const errEl = document.getElementById("vlsm-error");
      const wrap = document.getElementById("vlsm-results-wrap");
      const tbody = document.getElementById("vlsm-tbody");
      const steps = document.getElementById("vlsm-steps");
      errEl.hidden = true;
      const baseIp = document.getElementById("base-ip").value;
      const hosts = [];
      hostsContainer.querySelectorAll('input[type="number"]').forEach((inp) => hosts.push(parseInt(inp.value, 10)));
      if (!I.isValidIPv4(baseIp)) {
        errEl.textContent = "Adresse IPv4 de base invalide.";
        errEl.hidden = false;
        wrap.hidden = true;
        return;
      }
      if (hosts.length === 0) {
        errEl.textContent = "Générez les champs LAN.";
        errEl.hidden = false;
        wrap.hidden = true;
        return;
      }
      const result = I.computeVLSM(baseIp, hosts);
      if (steps) steps.innerHTML = buildVlsmSteps(baseIp, hosts, result);
      if (!result.ok) {
        errEl.textContent = result.error;
        errEl.hidden = false;
        wrap.hidden = true;
        return;
      }
      tbody.innerHTML = "";
      result.rows.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${U.escapeHtml(r.lanLabel)}</td>
          <td>${r.hostsRequested}</td>
          <td>${U.escapeHtml(r.network)}/${r.cidr}</td>
          <td>/${r.cidr}</td>
          <td>${U.escapeHtml(r.maskDotted)}</td>
          <td>${U.escapeHtml(r.broadcast)}</td>
          <td>${U.escapeHtml(r.firstUsable)}</td>
          <td>${U.escapeHtml(r.lastUsable)}</td>
          <td>${r.totalAddrs}</td>`;
        tbody.appendChild(tr);
      });
      wrap.hidden = false;
      const lines = ["Résultats VLSM", `Base: ${baseIp.trim()}`, ""];
      result.rows.forEach((r) => {
        lines.push(
          `${r.lanLabel}\t${r.hostsRequested}\t${r.network}/${r.cidr}\t${r.maskDotted}\t${r.broadcast}\t${r.firstUsable}\t${r.lastUsable}\t${r.totalAddrs}`
        );
      });
      lastVlsmText = lines.join("\n");
      U.pushHistory({ type: "v4", summary: `VLSM IPv4 — ${baseIp.trim()} (${result.rows.length} LAN)` });
    });
  }

  document.getElementById("btn-copy-vlsm")?.addEventListener("click", async () => {
    if (!lastVlsmText) return;
    const ok = await U.copyText(lastVlsmText);
    U.flashButtonLabel(document.getElementById("btn-copy-vlsm"), ok);
  });
  document.getElementById("btn-export-vlsm")?.addEventListener("click", () => {
    if (lastVlsmText) U.downloadText("vlsm-resultats.txt", lastVlsmText);
  });
  document.getElementById("btn-pdf-vlsm")?.addEventListener("click", () => {
    if (!lastVlsmText) return;
    const t = document.getElementById("vlsm-table");
    U.printContent("VLSM IPv4", t ? t.outerHTML : `<pre>${U.escapeHtml(lastVlsmText)}</pre>`);
  });

  /* IPv6 */
  let lastIpv6Text = "";
  document.getElementById("form-ipv6")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const errEl = document.getElementById("ipv6-error");
    const wrap = document.getElementById("ipv6-results-wrap");
    const tbody = document.getElementById("ipv6-tbody");
    errEl.hidden = true;
    const prefix = document.getElementById("ipv6-prefix").value;
    const count = parseInt(document.getElementById("ipv6-count").value, 10);
    const result = I.computeIPv6Subnets(prefix, count);
    if (!result.ok) {
      errEl.textContent = result.error;
      errEl.hidden = false;
      wrap.hidden = true;
      return;
    }
    tbody.innerHTML = "";
    result.subnets.forEach((s, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i + 1}</td><td>${U.escapeHtml(s)}</td>`;
      tbody.appendChild(tr);
    });
    wrap.hidden = false;
    lastIpv6Text = ["IPv6 /64", prefix.trim(), "", ...result.subnets].join("\n");
    U.pushHistory({ type: "v6", summary: `IPv6 — ${prefix.trim()} (${result.subnets.length} /64)` });
  });

  document.getElementById("btn-copy-ipv6")?.addEventListener("click", async () => {
    if (!lastIpv6Text) return;
    U.flashButtonLabel(document.getElementById("btn-copy-ipv6"), await U.copyText(lastIpv6Text));
  });
  document.getElementById("btn-export-ipv6")?.addEventListener("click", () => {
    if (lastIpv6Text) U.downloadText("ipv6-sous-reseaux.txt", lastIpv6Text);
  });
  document.getElementById("btn-pdf-ipv6")?.addEventListener("click", () => {
    if (!lastIpv6Text) return;
    const t = document.getElementById("ipv6-table");
    U.printContent("Sous-réseaux IPv6 /64", t ? t.outerHTML : `<pre>${U.escapeHtml(lastIpv6Text)}</pre>`);
  });

  /* Conversions */
  function runConversion() {
    const out = document.getElementById("convert-output");
    const err = document.getElementById("convert-error");
    if (!out || !err) return;
    err.hidden = true;
    const mode = document.getElementById("convert-mode").value;
    const val = document.getElementById("convert-input").value.trim();
    const lines = [];

    if (mode === "ip-binary") {
      const bin = I.ipv4ToBinary(val);
      if (!bin) {
        err.textContent = "IPv4 invalide.";
        err.hidden = false;
        return;
      }
      const intv = I.ipToInt(val);
      lines.push(`Adresse : ${val}`);
      lines.push(`Binaire : ${bin}`);
      lines.push(`Décimal (unsigned 32) : ${intv >>> 0}`);
    } else if (mode === "cidr-info") {
      const parts = val.split(/[\/\s]+/).filter(Boolean);
      const ip = parts[0];
      const cidr = parseInt(parts[1], 10);
      if (!I.isValidIPv4(ip) || !Number.isInteger(cidr) || cidr < 0 || cidr > 32) {
        err.textContent = 'Format : adresse/CIDR (ex. 192.168.1.50/24).';
        err.hidden = false;
        return;
      }
      const info = I.networkInfo(ip, cidr);
      const mask = I.cidrToMaskInt(cidr);
      lines.push(`Réseau : ${info.network}/${cidr}`);
      lines.push(`Masque : ${info.maskDotted} (CIDR /${cidr})`);
      lines.push(`Masque binaire : ${I.ipv4ToBinary(info.maskDotted)}`);
      lines.push(`Broadcast : ${info.broadcast}`);
      lines.push(`1ère utilisable : ${info.firstHost}`);
      lines.push(`Dernière utilisable : ${info.lastHost}`);
      lines.push(`Adresses totales : ${info.totalHosts} — utilisables (classique) : ${info.usableHosts}`);
    } else if (mode === "mask-cidr") {
      const c = I.maskToCidr(val);
      if (c === null) {
        err.textContent = "Masque invalide (doit être contigu).";
        err.hidden = false;
        return;
      }
      lines.push(`Masque : ${val}`);
      lines.push(`CIDR : /${c}`);
      lines.push(`Binaire : ${I.ipv4ToBinary(val)}`);
    }

    out.innerHTML = `<pre class="convert-pre">${U.escapeHtml(lines.join("\n"))}</pre>`;
  }

  document.getElementById("btn-convert-run")?.addEventListener("click", runConversion);
  document.getElementById("convert-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runConversion();
  });
})(window);
