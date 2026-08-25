/**
 * Tiny structured logger for Phase 1.
 * Writes ISO timestamps so later phases can replay a session.
 */
function stamp() {
  return new Date().toISOString();
}

function format(level, event, detail) {
  const payload = detail === undefined ? "" : " " + JSON.stringify(detail);
  return `[${stamp()}] [${level}] ${event}${payload}`;
}

const logger = {
  info(event, detail) {
    console.log(format("INFO", event, detail));
  },
  signal(event, detail) {
    console.log(format("SIGNAL", event, detail));
  },
  warn(event, detail) {
    console.warn(format("WARN", event, detail));
  },
  error(event, detail) {
    console.error(format("ERROR", event, detail));
  },
};

module.exports = { logger };
