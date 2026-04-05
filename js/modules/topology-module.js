/**
 * @file topology-module.js
 * @description Diagramme SVG dynamique : équipements et liaisons (schéma 3-tiers ou manuel).
 */
(function (global) {
  "use strict";
  const U = global.NetKit.ui;

  const svg = document.getElementById("topology-svg");
  const layerLinks = document.getElementById("topology-links");
  const layerNodes = document.getElementById("topology-nodes");
  if (!svg || !layerLinks || !layerNodes) return;

  const NS = "http://www.w3.org/2000/svg";
  let nodeId = 0;
  const nodes = [];

  function addNode(type, label, x, y) {
    const id = `n${++nodeId}`;
    const colors = {
      core: "#7c3aed",
      distribution: "#2563eb",
      access: "#059669",
      router: "#ea580c",
      switch: "#0891b2",
      firewall: "#dc2626",
      other: "#64748b",
    };
    const fill = colors[type] || colors.other;
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "topo-node");
    g.setAttribute("data-id", id);
    g.setAttribute("transform", `translate(${x},${y})`);

    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", -55);
    rect.setAttribute("y", -22);
    rect.setAttribute("width", 110);
    rect.setAttribute("height", 44);
    rect.setAttribute("rx", 8);
    rect.setAttribute("fill", fill);
    rect.setAttribute("opacity", "0.92");

    const text = document.createElementNS(NS, "text");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("y", 5);
    text.setAttribute("fill", "#fff");
    text.setAttribute("font-size", "11");
    text.setAttribute("font-family", "system-ui,sans-serif");
    text.textContent = label.slice(0, 14);

    g.appendChild(rect);
    g.appendChild(text);
    layerNodes.appendChild(g);
    nodes.push({ id, el: g, x, y, type, label });
    return id;
  }

  function linkNodes(idA, idB) {
    const a = nodes.find((n) => n.id === idA);
    const b = nodes.find((n) => n.id === idB);
    if (!a || !b) return;
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", String(a.x));
    line.setAttribute("y1", String(a.y));
    line.setAttribute("x2", String(b.x));
    line.setAttribute("y2", String(b.y));
    line.setAttribute("stroke", "#94a3b8");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("class", "topo-link");
    layerLinks.appendChild(line);
  }

  function clearTopology() {
    layerLinks.innerHTML = "";
    layerNodes.innerHTML = "";
    nodes.length = 0;
    nodeId = 0;
  }

  /** Génère un schéma vertical Core → Dist → Access (connexions en étoile logique) */
  function generateThreeTier() {
    clearTopology();
    const cx = 200;
    const c1 = addNode("core", "Core — Noyau", cx, 55);
    const d1 = addNode("distribution", "Distribution", cx, 150);
    const a1 = addNode("access", "Access SW1", cx - 100, 250);
    const a2 = addNode("access", "Access SW2", cx + 100, 250);
    linkNodes(c1, d1);
    linkNodes(d1, a1);
    linkNodes(d1, a2);
    U.pushHistory({ type: "topo", summary: "Topologie 3-tiers générée." });
  }

  document.getElementById("btn-topo-3tier")?.addEventListener("click", () => {
    generateThreeTier();
    svg.classList.remove("topo-anim");
    void svg.offsetWidth;
    svg.classList.add("topo-anim");
  });

  document.getElementById("btn-topo-clear")?.addEventListener("click", () => {
    clearTopology();
  });

  document.getElementById("btn-topo-add-custom")?.addEventListener("click", () => {
    const label = document.getElementById("topo-device-name").value.trim() || "Équipement";
    const type = document.getElementById("topo-device-type").value;
    const x = 80 + Math.random() * 240;
    const y = 60 + Math.random() * 200;
    addNode(type, label, x, y);
    if (nodes.length >= 2) {
      linkNodes(nodes[nodes.length - 2].id, nodes[nodes.length - 1].id);
    }
  });

  document.getElementById("btn-topo-auto-link")?.addEventListener("click", () => {
    if (nodes.length < 2) return;
    for (let i = 0; i < nodes.length - 1; i++) linkNodes(nodes[i].id, nodes[i + 1].id);
  });

})(window);
