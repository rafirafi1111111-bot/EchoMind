/**
 * Minimal RFC 6455 WebSocket accept + text frames.
 * No npm dependency. Binary frames and extensions are ignored.
 */

const crypto = require("crypto");
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function acceptKey(secKey) {
  return crypto.createHash("sha1").update(secKey + GUID).digest("base64");
}

function encodeText(str) {
  const payload = Buffer.from(str, "utf8");
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  return Buffer.concat([header, payload]);
}

function decodeFrames(buffer, onText, onClose) {
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const opcode = byte1 & 0x0f;
    const masked = Boolean(byte2 & 0x80);
    let len = byte2 & 0x7f;
    let cursor = offset + 2;
    if (len === 126) {
      if (cursor + 2 > buffer.length) break;
      len = buffer.readUInt16BE(cursor);
      cursor += 2;
    } else if (len === 127) {
      if (cursor + 8 > buffer.length) break;
      len = Number(buffer.readBigUInt64BE(cursor));
      cursor += 8;
    }
    const maskBytes = masked ? 4 : 0;
    if (cursor + maskBytes + len > buffer.length) break;
    let payload = buffer.subarray(cursor + maskBytes, cursor + maskBytes + len);
    if (masked) {
      const mask = buffer.subarray(cursor, cursor + 4);
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4];
    }
    if (opcode === 0x8) onClose();
    else if (opcode === 0x9) { /* ping — ignore */ }
    else if (opcode === 0x1) onText(payload.toString("utf8"));
    offset = cursor + maskBytes + len;
  }
  return buffer.subarray(offset);
}

function upgrade(req, socket) {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return null;
  }
  const headers = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey(key)}`,
    "\r\n",
  ].join("\r\n");
  socket.write(headers);

  let rest = Buffer.alloc(0);
  const client = {
    socket,
    send(obj) {
      try {
        socket.write(encodeText(JSON.stringify(obj)));
      } catch {
        /* closed */
      }
    },
    close() {
      try { socket.end(); } catch { /* already closed */ }
    },
  };

  socket.on("data", (chunk) => {
    rest = Buffer.concat([rest, chunk]);
    rest = decodeFrames(
      rest,
      (text) => {
        try {
          client.onMessage && client.onMessage(JSON.parse(text));
        } catch {
          /* bad json */
        }
      },
      () => client.onClose && client.onClose()
    );
  });
  socket.on("close", () => client.onClose && client.onClose());
  socket.on("error", () => client.onClose && client.onClose());
  return client;
}

module.exports = { upgrade };
