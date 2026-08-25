/**
 * Phase 1 demo — three virtual consciousness nodes join a mesh,
 * handshake, exchange thought states, and print acknowledgements.
 *
 * Run:  node src/index.js   (from the phase1/ directory)
 */

const { ConsciousnessNetwork } = require("./network");
const { ConsciousnessNode } = require("./node");
const { logger } = require("./logger");

function main() {
  const mesh = new ConsciousnessNetwork("phase1-lattice");

  const luna = new ConsciousnessNode("Luna");
  const orion = new ConsciousnessNode("Orion");
  const sage = new ConsciousnessNode("Sage", { fatigue: 0.2 });

  luna.connect(mesh);
  orion.connect(mesh);
  sage.connect(mesh);

  mesh.handshake(luna.id, orion.id);
  mesh.handshake(orion.id, sage.id);
  mesh.handshake(sage.id, luna.id);

  const first = luna.sendThought({
    toId: orion.id,
    tone: "curiosity",
    note: "is the lattice quiet tonight?",
  });

  const second = orion.sendThought({
    toId: sage.id,
    tone: "calm",
    note: "phase-locked. sharing a low band.",
  });

  const broadcast = sage.sendThought({
    tone: "focus",
    note: "all nodes: hold the 18Hz band for one tick.",
  });

  logger.info("demo.summary", {
    nodes: mesh.list(),
    packets: [first.packet.id, second.packet.id, broadcast.packet.id],
    acks: [...first.acks, ...second.acks, ...broadcast.acks],
    meshEvents: mesh.log.length,
  });

  console.log("\n--- node snapshots ---");
  for (const snap of mesh.list()) {
    console.log(JSON.stringify(snap, null, 2));
  }
}

main();
