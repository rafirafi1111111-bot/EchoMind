/**
 * Phase 2 entry — four nodes exchange thought packets in realtime.
 *
 *   node src/index.js
 *   TICKS=20 TICK_MS=150 node src/index.js
 */

const { MeshSimulator } = require("./simulator");

async function main() {
  const sim = new MeshSimulator({
    maxTicks: Number(process.env.TICKS || 16),
    tickMs: Number(process.env.TICK_MS || 180),
  });

  console.log("EchoMind Phase 2 — realtime lattice mock\n");

  const snap = await sim.start();

  console.log("\n--- final lattice ---");
  console.log(JSON.stringify(snap, null, 2));
  console.log(`\nframes on bus: ${sim.bus.frames.length}`);
  console.log("halted cleanly.");
}

main().catch((err) => {
  console.error("simulation crashed:", err);
  process.exit(1);
});
