/**
 * @file ip-math.js
 * @description Fonctions pures IPv4/IPv6 — sans accès DOM.
 * Module : Network Engineer Toolkit
 */
(function (global) {
  "use strict";

  const NetKit = global.NetKit || {};
  NetKit.ip = NetKit.ip || {};

  /** IPv4 → entier 32 bits non signé */
  function ipToInt(ip) {
    const parts = String(ip)
      .trim()
      .split(".")
      .map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  function intToIp(n) {
    const x = n >>> 0;
    return [(x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join(".");
  }

  function isValidIPv4(ip) {
    return ipToInt(ip) !== null;
  }

  function nextPowerOf2(n) {
    if (n <= 1) return 1;
    let p = 1;
    while (p < n) p <<= 1;
    return p >>> 0;
  }

  function log2pow2(blockSize) {
    let c = 0;
    let b = blockSize >>> 0;
    while (b > 1) {
      b >>>= 1;
      c++;
    }
    return c;
  }

  function cidrToMaskInt(cidr) {
    if (cidr <= 0) return 0;
    if (cidr >= 32) return 0xffffffff >>> 0;
    return (0xffffffff << (32 - cidr)) >>> 0;
  }

  function maskIntToDotted(maskInt) {
    return intToIp(maskInt);
  }

  /** Octets de l’IPv4 en binaire (8 bits chacun), espacés */
  function ipv4ToBinary(ip) {
    const v = ipToInt(ip);
    if (v === null) return null;
    const x = v >>> 0;
    const octets = [(x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255];
    return octets.map((o) => o.toString(2).padStart(8, "0")).join(".");
  }

  /** Masque décimal pointé → CIDR */
  function maskToCidr(maskStr) {
    const m = ipToInt(maskStr);
    if (m === null) return null;
    let c = 0;
    let n = m >>> 0;
    while (n & 0x80000000) {
      c++;
      n = (n << 1) >>> 0;
    }
    if (n !== 0) return null;
    return c;
  }

  /** Infos réseau pour IP/CIDR */
  function networkInfo(ip, cidr) {
    const addr = ipToInt(ip);
    if (addr === null || !Number.isInteger(cidr) || cidr < 0 || cidr > 32) return null;
    const mask = cidrToMaskInt(cidr);
    const network = (addr & mask) >>> 0;
    const broadcast = (network | ~mask) >>> 0;
    const totalHosts = (broadcast - network + 1) >>> 0;
    const firstHost = cidr === 32 ? network : (network + 1) >>> 0;
    const lastHost = cidr === 32 ? network : (broadcast - 1) >>> 0;
    let usableHosts = 0;
    if (cidr === 32) usableHosts = 1;
    else if (cidr === 31) usableHosts = 2;
    else if (cidr === 30) usableHosts = 2;
    else usableHosts = totalHosts >= 2 ? totalHosts - 2 : 0;
    return {
      network: intToIp(network),
      broadcast: intToIp(broadcast),
      maskDotted: intToIp(mask),
      firstHost: intToIp(firstHost),
      lastHost: intToIp(lastHost),
      totalHosts,
      usableHosts,
    };
  }

  function computeVLSM(baseIp, hostsPerLan) {
    const start = ipToInt(baseIp);
    if (start === null) {
      return { ok: false, error: "Adresse IPv4 de base invalide (format attendu : x.x.x.x)." };
    }

    const lans = hostsPerLan.map((h, idx) => ({
      originalIndex: idx + 1,
      hostsRequested: h,
      neededAddrs: h + 2,
    }));

    for (const L of lans) {
      if (!Number.isInteger(L.hostsRequested) || L.hostsRequested < 1) {
        return { ok: false, error: `LAN ${L.originalIndex} : nombre d’hôtes invalide (entier ≥ 1 requis).` };
      }
      if (L.neededAddrs > 0xffffffff) return { ok: false, error: "Demande trop grande pour IPv4." };
    }

    const sorted = [...lans].sort((a, b) => b.neededAddrs - a.neededAddrs);
    let current = start >>> 0;
    const rows = [];

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const blockSize = nextPowerOf2(item.neededAddrs) >>> 0;
      const rem = current % blockSize;
      if (rem !== 0) current = (current + (blockSize - rem)) >>> 0;

      const network = current >>> 0;
      const broadcast = (network + blockSize - 1) >>> 0;
      const hostBits = log2pow2(blockSize);
      const cidr = 32 - hostBits;
      const maskInt = cidrToMaskInt(cidr);
      const firstUsable = blockSize <= 2 ? network : (network + 1) >>> 0;
      const lastUsable = blockSize <= 2 ? broadcast : (broadcast - 1) >>> 0;

      rows.push({
        lanLabel: `LAN ${item.originalIndex}`,
        originalIndex: item.originalIndex,
        hostsRequested: item.hostsRequested,
        network: intToIp(network),
        cidr,
        maskDotted: maskIntToDotted(maskInt),
        broadcast: intToIp(broadcast),
        firstUsable: intToIp(firstUsable),
        lastUsable: intToIp(lastUsable),
        totalAddrs: blockSize,
        blockSize,
        sortRank: i + 1,
      });

      current = (broadcast + 1) >>> 0;
      if (current < network) return { ok: false, error: "Dépassement de l’espace d’adressage IPv4 (overflow)." };
    }

    return { ok: true, rows, sortedOrder: sorted.map((s) => s.originalIndex) };
  }

  function expandIPv6Address(addr) {
    let a = addr.trim().toLowerCase();
    if (a.includes("::")) {
      const [left, right] = a.split("::", 2);
      const leftParts = left ? left.split(":").filter(Boolean) : [];
      const rightParts = right ? right.split(":").filter(Boolean) : [];
      const missing = 8 - leftParts.length - rightParts.length;
      if (missing < 0) return null;
      a = [...leftParts, ...Array(missing).fill("0"), ...rightParts].join(":");
    }
    const parts = a.split(":");
    if (parts.length !== 8) return null;
    const out = [];
    for (const p of parts) {
      if (!/^[0-9a-f]{1,4}$/i.test(p)) return null;
      out.push(parseInt(p, 16));
    }
    return out;
  }

  function ipv6GroupsToBigInt(groups) {
    let v = 0n;
    for (let i = 0; i < 8; i++) v = (v << 16n) | BigInt(groups[i]);
    return v;
  }

  function bigIntToIPv6(v) {
    const parts = [];
    for (let i = 7; i >= 0; i--) {
      const shift = BigInt(i * 16);
      const g = Number((v >> shift) & 0xffffn);
      parts.push(g.toString(16));
    }
    return parts.join(":");
  }

  function parseIPv6Prefix(input) {
    const s = input.trim();
    const slash = s.lastIndexOf("/");
    if (slash < 0) return null;
    const addrPart = s.slice(0, slash).trim();
    const plen = parseInt(s.slice(slash + 1), 10);
    if (!Number.isInteger(plen) || plen < 0 || plen > 128) return null;
    const groups = expandIPv6Address(addrPart);
    if (!groups) return null;
    let prefix = ipv6GroupsToBigInt(groups);
    const hostBits = 128 - plen;
    if (hostBits > 0) {
      const mask = (1n << BigInt(hostBits)) - 1n;
      prefix = prefix & ~mask;
    }
    return { prefix, plen };
  }

  function computeIPv6Subnets(prefixStr, count) {
    const parsed = parseIPv6Prefix(prefixStr);
    if (!parsed) return { ok: false, error: "Préfixe IPv6 invalide (ex. attendu : 2001:db8::/48)." };
    const { prefix, plen } = parsed;
    if (plen > 64) {
      return {
        ok: false,
        error: "Le préfixe doit être /64 ou plus large (longueur ≤ 64) pour découper en sous-réseaux /64.",
      };
    }
    if (!Number.isInteger(count) || count < 1) return { ok: false, error: "Nombre de sous-réseaux invalide (entier ≥ 1)." };

    const maxSubnets = 1n << BigInt(64 - plen);
    if (BigInt(count) > maxSubnets) {
      return {
        ok: false,
        error: `Avec un /${plen}, on ne peut créer que ${maxSubnets.toString()} sous-réseau(x) /64 au maximum.`,
      };
    }

    const step = 1n << 64n;
    const subnets = [];
    for (let i = 0; i < count; i++) {
      const net = prefix + BigInt(i) * step;
      subnets.push(`${bigIntToIPv6(net)}/64`);
    }
    return { ok: true, subnets, plen };
  }

  /** Adresse de départ pour le site index s (10.s.0.0 à partir de 10.0.0.0) */
  function siteBaseIp(baseIp, siteIndex) {
    const parts = String(baseIp)
      .trim()
      .split(".")
      .map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    const second = parts[1] + siteIndex;
    if (second > 255) return null;
    return `${parts[0]}.${second}.${parts[2]}.${parts[3]}`;
  }

  Object.assign(NetKit.ip, {
    ipToInt,
    intToIp,
    isValidIPv4,
    nextPowerOf2,
    log2pow2,
    cidrToMaskInt,
    maskIntToDotted,
    maskToCidr,
    ipv4ToBinary,
    networkInfo,
    computeVLSM,
    expandIPv6Address,
    parseIPv6Prefix,
    computeIPv6Subnets,
    siteBaseIp,
  });

  global.NetKit = NetKit;
})(typeof window !== "undefined" ? window : globalThis);
