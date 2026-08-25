/**
 * Thought / affect packet — Phase 1 stand-in for flux/schemas/affect_packet.nfx
 *
 * A ThoughtState is a small JSON object a node can emit onto the mesh.
 * Consent is required: a packet without a live crest is rejected.
 */

const crypto = require("crypto");

/** Named valence labels used by the demo. Later phases can replace this map. */
const TONES = {
  calm: { valence: 0.2, arousal: 0.15, bandHz: 10 },
  focus: { valence: 0.35, arousal: 0.55, bandHz: 18 },
  joy: { valence: 0.85, arousal: 0.7, bandHz: 24 },
  curiosity: { valence: 0.55, arousal: 0.45, bandHz: 16 },
  fatigue: { valence: -0.1, arousal: 0.2, bandHz: 8 },
};

function createThoughtState({
  fromId,
  toId = null,
  tone = "curiosity",
  note = "",
  consentCrest,
} = {}) {
  const preset = TONES[tone] || TONES.curiosity;
  return {
    id: crypto.randomBytes(8).toString("hex"),
    kind: "ThoughtState",
    fromId,
    toId,
    tone,
    valence: preset.valence,
    arousal: preset.arousal,
    bandHz: preset.bandHz,
    note: String(note || "").slice(0, 280),
    consentCrest: consentCrest || null,
    createdAt: new Date().toISOString(),
  };
}

function validateThoughtState(packet) {
  if (!packet || packet.kind !== "ThoughtState") {
    return { ok: false, reason: "not a ThoughtState" };
  }
  if (!packet.fromId) {
    return { ok: false, reason: "missing origin node" };
  }
  if (!packet.consentCrest) {
    return { ok: false, reason: "crest missing — fail-closed" };
  }
  if (typeof packet.valence !== "number" || typeof packet.arousal !== "number") {
    return { ok: false, reason: "affect fields invalid" };
  }
  return { ok: true };
}

function ackFor(packet, receiverId, accepted, reason) {
  return {
    kind: "ThoughtAck",
    packetId: packet.id,
    fromId: receiverId,
    toId: packet.fromId,
    accepted,
    reason: reason || (accepted ? "phase-locked" : "rejected"),
    echoedTone: packet.tone,
    at: new Date().toISOString(),
  };
}

module.exports = {
  TONES,
  createThoughtState,
  validateThoughtState,
  ackFor,
};
