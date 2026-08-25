/**
 * ConsciousnessNetwork — in-process mesh for Phase 1.
 *
 * Mirrors flux/mesh/consciousness_network.nfx at a smaller scale:
 * enroll, handshake (mutual trust), route a ThoughtState, collect acks.
 * No external broker. Later phases can swap this for real sockets.
 */

const { logger } = require("./logger");
const { validateThoughtState } = require("./signal");

class ConsciousnessNetwork {
  constructor(name = "echo-mesh") {
    this.name = name;
    this.nodes = new Map();
    this.log = [];
  }

  enroll(node) {
    if (this.nodes.has(node.id)) {
      throw new Error(`node ${node.id} already enrolled`);
    }
    this.nodes.set(node.id, node);
    this._trace("enroll", { id: node.id, name: node.name });
  }

  forget(nodeId) {
    this.nodes.delete(nodeId);
    this._trace("forget", { id: nodeId });
  }

  get(nodeId) {
    return this.nodes.get(nodeId) || null;
  }

  list() {
    return [...this.nodes.values()].map((n) => n.snapshot());
  }

  /**
   * Mutual trust handshake between two enrolled nodes.
   * Both must have a live crest (see flux/mesh/handshake.nfx).
   */
  handshake(aId, bId) {
    const a = this.nodes.get(aId);
    const b = this.nodes.get(bId);
    if (!a || !b) {
      throw new Error("handshake requires two enrolled nodes");
    }
    if (!a.crestLive || !b.crestLive) {
      throw new Error("handshake aborted — missing live crest");
    }
    a.trust(b.id);
    b.trust(a.id);
    this._trace("handshake", { a: a.name, b: b.name });
    logger.info("handshake.ok", { a: a.name, b: b.name });
    return true;
  }

  /**
   * Deliver a packet to one node or every other enrolled node.
   * Returns the list of ThoughtAck objects.
   */
  route(packet) {
    const check = validateThoughtState(packet);
    if (!check.ok) {
      this._trace("route.drop", { reason: check.reason, packetId: packet.id });
      return [];
    }

    const origin = this.nodes.get(packet.fromId);
    if (!origin) {
      this._trace("route.drop", { reason: "origin not on mesh", packetId: packet.id });
      return [];
    }

    const targets = [];
    if (packet.toId) {
      const dest = this.nodes.get(packet.toId);
      if (dest && dest.id !== origin.id) targets.push(dest);
    } else {
      for (const node of this.nodes.values()) {
        if (node.id !== origin.id) targets.push(node);
      }
    }

    const acks = [];
    for (const dest of targets) {
      const ack = dest.receive(packet);
      acks.push(ack);
      this._trace("route.hop", {
        packetId: packet.id,
        from: origin.name,
        to: dest.name,
        accepted: ack.accepted,
      });
    }
    return acks;
  }

  _trace(event, detail) {
    this.log.push({
      at: new Date().toISOString(),
      event,
      ...detail,
    });
  }
}

module.exports = { ConsciousnessNetwork };
