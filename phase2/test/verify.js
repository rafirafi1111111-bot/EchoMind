/**
 * Phase 2 verifier — nodes must keep syncing without throwing.
 *
 * Checks:
 *   1. seed enrolls every named node
 *   2. N ticks complete without a crash
 *   3. every node has a last-known state
 *   4. at least one link strength moved above the 0.35 seed
 *   5. meanSync is a finite 0..1 number
 *   6. bus recorded tick + link.strength frames
 *
 * Run:  node test/verify.js
 */

const assert = require("assert/strict");
const { MeshSimulator } = require("../src/simulator");

async function verify() {
  const names = ["Luna", "Orion", "Sage", "Nyx"];
  const sim = new MeshSimulator({
    nodeNames: names,
    maxTicks: 8,
    tickMs: 20,
    quiet: true,
  });

  assert.equal(sim.crashed, null, "simulator must start uncrashed");

  const snap = await sim.start();

  assert.equal(sim.crashed, null, "simulator must not crash during ticks");
  assert.equal(sim.tick, 8, "expected exactly 8 ticks");
  assert.equal(sim.nodes.length, names.length, "all seed nodes must remain enrolled");
  assert.equal(sim.mesh.nodes.size, names.length, "mesh membership must match seed");

  for (const node of sim.nodes) {
    assert.ok(node.crestLive, `${node.name} lost its consent crest`);
    assert.ok(node.network, `${node.name} dropped off the mesh`);
    assert.ok(sim.metrics.lastState.has(node.id), `${node.name} never received a state`);
  }

  assert.ok(snap.links.length >= 3, "expected pairwise strength links");
  const moved = snap.links.some((l) => l.strength > 0.35);
  assert.ok(moved, "at least one link should strengthen after accepted acks");

  assert.equal(typeof snap.meanSync, "number");
  assert.ok(Number.isFinite(snap.meanSync), "meanSync must be finite");
  assert.ok(snap.meanSync >= 0 && snap.meanSync <= 1, "meanSync must stay in 0..1");

  assert.ok(sim.bus.count("tick") === 8, "bus must record one tick frame per step");
  assert.ok(sim.bus.count("link.strength") >= 8, "bus must record strength updates");
  assert.equal(sim.bus.count("mesh.crash"), 0, "bus must not record a crash");
  assert.equal(sim.bus.count("mesh.halt"), 1, "bus must record a clean halt");

  console.log("Phase 2 verify: PASS");
  console.log(
    JSON.stringify(
      {
        ticks: sim.tick,
        nodes: names,
        meanSync: snap.meanSync,
        links: snap.links.length,
        frames: sim.bus.frames.length,
      },
      null,
      2
    )
  );
}

verify().catch((err) => {
  console.error("Phase 2 verify: FAIL");
  console.error(err);
  process.exit(1);
});
