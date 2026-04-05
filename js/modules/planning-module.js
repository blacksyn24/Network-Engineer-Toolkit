/**
 * @file planning-module.js
 * @description Planification multi-sites : hiérarchie core / distribution / accès + VLSM auto par site.
 */
(function (global) {
  "use strict";
  const I = global.NetKit.ip;
  const U = global.NetKit.ui;

  const form = document.getElementById("form-planning");
  if (!form) return;

  let lastPlanningText = "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = document.getElementById("planning-error");
    const wrap = document.getElementById("planning-results-wrap");
    const tbody = document.getElementById("planning-tbody");
    err.hidden = true;

    const siteCount = parseInt(document.getElementById("plan-sites").value, 10);
    const baseIp = document.getElementById("plan-base").value.trim();
    const hCore = parseInt(document.getElementById("plan-hosts-core").value, 10);
    const hDist = parseInt(document.getElementById("plan-hosts-dist").value, 10);
    const hAcc = parseInt(document.getElementById("plan-hosts-access").value, 10);
    const accVlanCount = parseInt(document.getElementById("plan-access-vlans").value, 10);

    if (!I.isValidIPv4(baseIp)) {
      err.textContent = "Adresse de base IPv4 invalide (ex. 10.0.0.0).";
      err.hidden = false;
      wrap.hidden = true;
      return;
    }
    if (![siteCount, hCore, hDist, hAcc, accVlanCount].every((n) => Number.isInteger(n) && n >= 1)) {
      err.textContent = "Tous les nombres doivent être des entiers ≥ 1.";
      err.hidden = false;
      wrap.hidden = true;
      return;
    }
    if (siteCount > 255) {
      err.textContent = "Maximum 255 sites (incrément sur le 2e octet).";
      err.hidden = false;
      wrap.hidden = true;
      return;
    }

    const rows = [];
    const summaryLines = ["Plan multi-sites", `Base : ${baseIp}`, `Sites : ${siteCount}`, ""];

    for (let s = 0; s < siteCount; s++) {
      const siteIp = I.siteBaseIp(baseIp, s);
      if (!siteIp) {
        err.textContent = `Impossible de dériver le site ${s + 1} (dépassement d’octet).`;
        err.hidden = false;
        wrap.hidden = true;
        return;
      }
      const siteName = `Site ${s + 1}`;
      const hosts = [hCore, hDist];
      for (let v = 0; v < accVlanCount; v++) hosts.push(hAcc);
      const labels = ["Core", "Distribution"];
      for (let v = 0; v < accVlanCount; v++) labels.push(`Access VLAN ${v + 1}`);

      const res = I.computeVLSM(siteIp, hosts);
      if (!res.ok) {
        err.textContent = `${siteName} : ${res.error}`;
        err.hidden = false;
        wrap.hidden = true;
        return;
      }

      res.rows.forEach((r, idx) => {
        rows.push({
          site: siteName,
          layer: labels[idx] || `LAN ${idx + 1}`,
          hosts: hosts[idx],
          network: `${r.network}/${r.cidr}`,
          mask: r.maskDotted,
          first: r.firstUsable,
          last: r.lastUsable,
        });
      });

      summaryLines.push(`--- ${siteName} (départ ${siteIp}) ---`);
      res.rows.forEach((r, idx) => {
        summaryLines.push(`${labels[idx]}\t${r.network}/${r.cidr}\t${r.firstUsable}-${r.lastUsable}`);
      });
    }

    tbody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${U.escapeHtml(row.site)}</td>
        <td>${U.escapeHtml(row.layer)}</td>
        <td>${row.hosts}</td>
        <td>${U.escapeHtml(row.network)}</td>
        <td>${U.escapeHtml(row.mask)}</td>
        <td>${U.escapeHtml(row.first)}</td>
        <td>${U.escapeHtml(row.last)}</td>`;
      tbody.appendChild(tr);
    });
    wrap.hidden = false;

    lastPlanningText = summaryLines.join("\n");
    U.pushHistory({ type: "plan", summary: `Planification — ${siteCount} site(s), ${rows.length} sous-réseaux.` });
  });

  document.getElementById("btn-copy-planning")?.addEventListener("click", async () => {
    if (!lastPlanningText) return;
    U.flashButtonLabel(document.getElementById("btn-copy-planning"), await U.copyText(lastPlanningText));
  });
  document.getElementById("btn-export-planning")?.addEventListener("click", () => {
    if (lastPlanningText) U.downloadText("plan-reseau.txt", lastPlanningText);
  });
  document.getElementById("btn-pdf-planning")?.addEventListener("click", () => {
    const t = document.getElementById("planning-table");
    U.printContent(
      "Plan réseau multi-sites",
      t ? t.outerHTML : `<pre>${U.escapeHtml(lastPlanningText)}</pre>`
    );
  });
})(window);
