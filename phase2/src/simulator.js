/**
 * Realtime mock: N consciousness nodes tick, emit a thought, update strengths.
 *
 * Builds on Phase 1 ConsciousnessNode / ConsciousnessNetwork. The simulator
 * only adds a clock, an event bus, and lattice metrics.
 */

const path = require("path");
const { ConsciousnessNetwork } = require(path.join(__dirname, "../../phase1/src/network"));
const { ConsciousnessNode } = require(path.join(__dirname, "../../phase1/src/node"));
const { TONES } = require(path.join(__dirname, "../../phase1/src/signal"));
const { ResonanceBus } = require("./bus");
const { LatticeMetrics } = require("./metrics");

const TONE_NAMES = Object.keys(TONES);

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

class MeshSimulator {
  constructor(options = {}) {
    this.tickMs = options.tickMs ?? 200;
    this.maxTicks = options.maxTicks ?? 12;
    this.nodeNames = options.nodeNames || ["Luna", "Orion", "Sage", "Nyx"];
    this.quiet = Boolean(options.quiet);

    this.mesh = new ConsciousnessNetwork("phase2-lattice");
    this.bus = new ResonanceBus();
    this.metrics = new LatticeMetrics();
    this.nodes = [];
    this.tick = 0;
    this.timer = null;
    this.crashed = null;
  }

  seed() {
    this.nodes = this.nodeNames.map((name) => {
      const node = new ConsciousnessNode(name);
      node.connect(this.mesh);
      return node;
    });
    for (let i = 0; i < this.nodes.length; i += 1) {
      for (let j = i + 1; j < this.nodes.length; j += 1) {
        this.mesh.handshake(this.nodes[i].id, this.nodes[j].id);
        this.metrics.ensurePair(this.nodes[i].id, this.nodes[j].id);
      }
    }
    this.bus.publish("mesh.ready", {
      nodes: this.nodes.map((n) => ({ id: n.id, name: n.name })),
    });
    return this;
  }

  step() {
    this.tick += 1;
    const sender = pick(this.nodes);
    const others = this.nodes.filter((n) => n.id !== sender.id);
    const target = Math.random() < 0.65 ? pick(others) : null;
    const tone = pick(TONE_NAMES);

    const { packet, acks } = sender.sendThought({
      toId: target ? target.id : null,
      tone,
      note: `tick-${this.tick}`,
    });

    this.metrics.remember(sender.id, packet);
    for (const ack of acks) {
      const dest = this.mesh.get(ack.fromId);
      if (dest) this.metrics.remember(dest.id, packet);
      const strength = this.metrics.onAck(sender.id, ack.fromId, ack.accepted);
      this.bus.publish("link.strength", {
        a: sender.name,
        b: dest ? dest.name : ack.fromId,
        strength: Number(strength.toFixed(3)),
        accepted: ack.accepted,
      });
    }

    const snap = this.metrics.snapshot(this.nodes);
    this.bus.publish("tick", {
      tick: this.tick,
      from: sender.name,
      to: target ? target.name : "*",
      tone,
      packetId: packet.id,
      acks: acks.length,
      meanSync: snap.meanSync,
    });
    return snap;
  }

  /**
   * Run until maxTicks. Resolves with a final metrics snapshot.
   * Rejects only if a step throws — that is the crash the verifier watches for.
   */
  start() {
    this.seed();
    return new Promise((resolve, reject) => {
      const beat = () => {
        try {
          const snap = this.step();
          if (!this.quiet) {
            const links = snap.links
              .map((l) => l.strength.toFixed(2))
              .join(",");
            process.stdout.write(
              `tick ${String(this.tick).padStart(3)}  sync=${snap.meanSync.toFixed(3)}  strengths=[${links}]\n`
            );
          }
          if (this.tick >= this.maxTicks) {
            this.stop();
            this.bus.publish("mesh.halt", { ticks: this.tick, snapshot: snap });
            resolve(snap);
          }
        } catch (err) {
          this.crashed = err;
          this.stop();
          this.bus.publish("mesh.crash", { message: err.message });
          reject(err);
        }
      };
      this.timer = setInterval(beat, this.tickMs);
    });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = { MeshSimulator };
