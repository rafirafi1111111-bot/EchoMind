/**
 * Event-driven mock transport for Phase 2.
 *
 * Real WebSockets come later. ResonanceBus is an in-process pub/sub with the
 * same mental model: subscribe to a topic, emit a frame, every listener hears it
 * on the next tick of the event loop.
 */

const { EventEmitter } = require("events");

class ResonanceBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.frames = [];
  }

  /** Publish a typed frame. Returns the stored frame. */
  publish(type, payload = {}) {
    const frame = {
      type,
      payload,
      at: new Date().toISOString(),
      seq: this.frames.length + 1,
    };
    this.frames.push(frame);
    this.emit(type, frame);
    this.emit("frame", frame);
    return frame;
  }

  /** Number of frames of a given type (or all frames). */
  count(type) {
    if (!type) return this.frames.length;
    return this.frames.filter((f) => f.type === type).length;
  }
}

module.exports = { ResonanceBus };
