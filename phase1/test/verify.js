/**
 * Phase 1 verifier — connect, handshake, send, ack.
 * Run: node test/verify.js  (from phase1/) or node phase1/test/verify.js
 */

const assert = require("assert/strict");
const path = require("path");
const { ConsciousnessNetwork } = require(path.join(__dirname, "../src/network"));
const { ConsciousnessNode } = require(path.join(__dirname, "../src/node"));

function verify() {
  const mesh = new ConsciousnessNetwork("phase1-verify");
  const luna = new ConsciousnessNode("Luna");
  const orion = new ConsciousnessNode("Orion");

  luna.connect(mesh);
  orion.connect(mesh);
  mesh.handshake(luna.id, orion.id);

  assert.equal(mesh.nodes.size, 2);
  assert.ok(luna.trustRing.has(orion.id));
  assert.ok(orion.trustRing.has(luna.id));

  const { packet, acks } = luna.sendThought({
    toId: orion.id,
    tone: "focus",
    note: "verify hop",
  });

  assert.equal(packet.fromId, luna.id);
  assert.equal(acks.length, 1);
  assert.equal(acks[0].accepted, true);
  assert.equal(orion.inbox.length, 1);
  assert.equal(orion.inbox[0].id, packet.id);
  assert.equal(luna.outbox.length, 1);

  let failed = false;
  try {
    const muted = new ConsciousnessNode("Mute", { crestLive: false });
    muted.connect(mesh);
  } catch {
    failed = true;
  }
  assert.ok(failed, "join without a crest must fail-closed");

  console.log("Phase 1 verify: PASS");
  console.log(JSON.stringify({
    nodes: mesh.list().map((n) => n.name),
    packetId: packet.id,
    accepted: acks[0].accepted,
  }, null, 2));
}

try {
  verify();
} catch (err) {
  console.error("Phase 1 verify: FAIL");
  console.error(err);
  process.exit(1);
}
