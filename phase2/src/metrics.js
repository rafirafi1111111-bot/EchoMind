/**
 * Connection strength + lattice synchronization.
 *
 * Strength lives on an undirected pair and rises when an ack is accepted,
 * falls slightly on a miss. Sync is how close a node's latest band/valence
 * sits to the mesh average — a stand-in for flux/mesh/sync.nfx phase-lock.
 */

function pairKey(a, b) {
  return [a, b].sort().join("::");
}

function clamp(n, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, n));
}

class LatticeMetrics {
  constructor() {
    this.strength = new Map();
    this.lastState = new Map();
  }

  ensurePair(aId, bId) {
    const key = pairKey(aId, bId);
    if (!this.strength.has(key)) this.strength.set(key, 0.35);
    return key;
  }

  /** Record the latest affect a node radiated or absorbed. */
  remember(nodeId, packet) {
    this.lastState.set(nodeId, {
      tone: packet.tone,
      valence: packet.valence,
      arousal: packet.arousal,
      bandHz: packet.bandHz,
      at: packet.createdAt,
    });
  }

  onAck(fromId, toId, accepted) {
    const key = this.ensurePair(fromId, toId);
    const current = this.strength.get(key);
    const next = accepted
      ? current + 0.08
      : current - 0.12;
    this.strength.set(key, clamp(next));
    return this.strength.get(key);
  }

  strengthBetween(aId, bId) {
    return this.strength.get(pairKey(aId, bId)) ?? 0;
  }

  /** 0..1 — 1 means this node's last band matches the mesh mean. */
  syncLevel(nodeId) {
    const self = this.lastState.get(nodeId);
    if (!self || this.lastState.size < 2) return 0;

    let band = 0;
    let valence = 0;
    let n = 0;
    for (const state of this.lastState.values()) {
      band += state.bandHz;
      valence += state.valence;
      n += 1;
    }
    const meanBand = band / n;
    const meanValence = valence / n;
    const bandDelta = Math.abs(self.bandHz - meanBand) / 24;
    const valDelta = Math.abs(self.valence - meanValence) / 2;
    return clamp(1 - (bandDelta + valDelta) / 2);
  }

  snapshot(nodes) {
    const links = [];
    for (const [key, value] of this.strength.entries()) {
      const [a, b] = key.split("::");
      links.push({ a, b, strength: Number(value.toFixed(3)) });
    }
    const perNode = nodes.map((node) => ({
      id: node.id,
      name: node.name,
      sync: Number(this.syncLevel(node.id).toFixed(3)),
      last: this.lastState.get(node.id) || null,
    }));
    const meanSync =
      perNode.length === 0
        ? 0
        : perNode.reduce((s, n) => s + n.sync, 0) / perNode.length;
    return {
      meanSync: Number(meanSync.toFixed(3)),
      links,
      nodes: perNode,
    };
  }
}

module.exports = { LatticeMetrics, pairKey, clamp };
