/**
 * @file config-module.js
 * @description Générateur de configurations Cisco IOS (VLAN, ACL, DHCP, route statique).
 */
(function (global) {
  "use strict";
  const U = global.NetKit.ui;

  function outConfig(text) {
    const pre = document.getElementById("config-output");
    if (pre) {
      pre.textContent = text;
      pre.removeAttribute("hidden");
    }
    window._netkitLastConfig = text;
  }

  /* VLAN */
  document.getElementById("form-config-vlan")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("cfg-vlan-id").value.trim();
    const name = document.getElementById("cfg-vlan-name").value.trim() || `VLAN_${id}`;
    const ifs = document.getElementById("cfg-vlan-ifs").value.trim();
    const lines = [
      `vlan ${id}`,
      ` name ${name}`,
      "!",
      "interface " + (ifs || "GigabitEthernet0/1"),
      ` switchport mode access`,
      ` switchport access vlan ${id}`,
      "!",
    ];
    const t = lines.join("\n");
    outConfig(t);
    U.pushHistory({ type: "cfg", summary: `Config Cisco — VLAN ${id}` });
  });

  /* ACL */
  document.getElementById("form-config-acl")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const num = document.getElementById("cfg-acl-num").value.trim() || "100";
    const action = document.getElementById("cfg-acl-action").value;
    const proto = document.getElementById("cfg-acl-proto").value;
    const src = document.getElementById("cfg-acl-src").value.trim() || "any";
    const dst = document.getElementById("cfg-acl-dst").value.trim() || "any";
    const lines = [
      `! ACL étendue numérotée (ex. ${num})`,
      `access-list ${num} ${action} ${proto} ${src} ${dst}`,
      "!",
      "! Application sur interface :",
      "! interface GigabitEthernet0/0",
      `! ip access-group ${num} in`,
    ];
    outConfig(lines.join("\n"));
    U.pushHistory({ type: "cfg", summary: `Config Cisco — ACL extended ${num}` });
  });

  /* DHCP */
  document.getElementById("form-config-dhcp")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const pool = document.getElementById("cfg-dhcp-pool").value.trim() || "LAN_POOL";
    const net = document.getElementById("cfg-dhcp-network").value.trim();
    const mask = document.getElementById("cfg-dhcp-mask").value.trim();
    const gw = document.getElementById("cfg-dhcp-gw").value.trim();
    const dns = document.getElementById("cfg-dhcp-dns").value.trim();
    const excl = document.getElementById("cfg-dhcp-excl").value.trim();
    const lines = ["ip dhcp excluded-address " + (excl || "192.168.1.1 192.168.1.10"), "!", `ip dhcp pool ${pool}`, ` network ${net} ${mask}`];
    if (gw) lines.push(` default-router ${gw}`);
    if (dns) lines.push(` dns-server ${dns}`);
    lines.push("!");
    outConfig(lines.join("\n"));
    U.pushHistory({ type: "cfg", summary: `Config Cisco — DHCP pool ${pool}` });
  });

  /* Route statique */
  document.getElementById("form-config-route")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const dest = document.getElementById("cfg-route-dest").value.trim();
    const mask = document.getElementById("cfg-route-mask").value.trim();
    const next = document.getElementById("cfg-route-next").value.trim();
    const ad = document.getElementById("cfg-route-ad").value.trim() || "1";
    const lines = [`ip route ${dest} ${mask} ${next} ${ad}`, "!"];
    outConfig(lines.join("\n"));
    U.pushHistory({ type: "cfg", summary: `Config Cisco — route vers ${dest}` });
  });

  document.getElementById("btn-copy-config")?.addEventListener("click", async () => {
    const t = window._netkitLastConfig || document.getElementById("config-output")?.textContent || "";
    if (!t) return;
    U.flashButtonLabel(document.getElementById("btn-copy-config"), await U.copyText(t));
  });
  document.getElementById("btn-export-config")?.addEventListener("click", () => {
    const t = window._netkitLastConfig || "";
    if (t) U.downloadText("cisco-config.txt", t);
  });
  document.getElementById("btn-pdf-config")?.addEventListener("click", () => {
    const t = window._netkitLastConfig || "";
    U.printContent("Configuration Cisco IOS", `<pre style="font-size:9pt;white-space:pre-wrap;">${U.escapeHtml(t)}</pre>`);
  });
})(window);
