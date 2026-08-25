/**
 * ConsciousnessNode — Phase 1 stand-in for flux/mesh/consciousness_network.nfx Node.
 *
 * A node can join a network, hold a consent crest, emit a thought state,
 * and record inbound signals plus acknowledgements.
 */

const crypto = require("crypto");
const { logger } = require("./logger");
const {
  createThoughtState,
  validateThoughtState,
  ackFor,
} = require("./signal");

class ConsciousnessNode {
  constructor(name, options = {}) {
    this.id = options.id || crypto.randomBytes(6).toString("hex");
    this.name = name;
    this.fatigue = options.fatigue ?? 0.1;
    this.crestLive = options.crestLive !== false;
    this.crest = this.crestLive ? `crest-${this.id}` : null;
    this.trustRing = new Set(options.trustRing || []);
    this.network = null;
    this.inbox = [];
    this.outbox = [];
    this.acks = [];
  }

  /** Enroll on a ConsciousnessNetwork. */
  connect(network) {
    if (!this.crestLive) {
      throw new Error(`${this.name}: cannot join without a live consent crest`);
    }
    if (this.fatigue >= 0.8) {
      throw new Error(`${this.name}: fatigue too high to join`);
    }
    network.enroll(this);
    this.network = network;
    logger.info("node.joined", { id: this.id, name: this.name });
    return this;
  }

  disconnect() {
    if (this.network) {
      this.network.forget(this.id);
      logger.info("node.left", { id: this.id, name: this.name });
    }
    this.crestLive = false;
    this.crest = null;
    this.network = null;
  }

  trust(otherId) {
    this.trustRing.add(otherId);
    return this;
  }

  /**
   * Send a thought state to one peer (or broadcast when toId is omitted).
   * Returns acknowledgements collected from receivers.
   */
  sendThought({ toId = null, tone = "curiosity", note = "" } = {}) {
    if (!this.network) {
      throw new Error(`${this.name}: not connected to a network`);
    }
    if (!this.crestLive) {
      throw new Error(`${this.name}: consent revoked — fail-closed`);
    }

    const packet = createThoughtState({
      fromId: this.id,
      toId,
      tone,
      note,
      consentCrest: this.crest,
    });

    this.outbox.push(packet);
    logger.signal("thought.sent", {
      from: this.name,
      to: toId || "*",
      tone,
      packetId: packet.id,
    });

    const acks = this.network.route(packet);
    this.acks.push(...acks);
    return { packet, acks };
  }

  /** Called by the network when a packet is delivered here. */
  receive(packet) {
    const check = validateThoughtState(packet);
    if (!check.ok) {
      const ack = ackFor(packet, this.id, false, check.reason);
      logger.warn("thought.rejected", { node: this.name, reason: check.reason });
      return ack;
    }
    if (!this.crestLive) {
      const ack = ackFor(packet, this.id, false, "receiver crest revoked");
      logger.warn("thought.rejected", { node: this.name, reason: ack.reason });
      return ack;
    }

    this.inbox.push(packet);
    logger.signal("thought.received", {
      node: this.name,
      from: packet.fromId,
      tone: packet.tone,
      note: packet.note,
      packetId: packet.id,
    });

    return ackFor(packet, this.id, true, "phase-locked");
  }

  snapshot() {
    return {
      id: this.id,
      name: this.name,
      crestLive: this.crestLive,
      fatigue: this.fatigue,
      inbox: this.inbox.length,
      outbox: this.outbox.length,
      acks: this.acks.length,
      peersTrusted: [...this.trustRing],
    };
  }
}

module.exports = { ConsciousnessNode };
