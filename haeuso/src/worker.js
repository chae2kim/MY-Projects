// 해우소 — 정적 페이지는 public/ 에서, 같이 있기(실시간 접속)는 /ws 웹소켓 → Durable Object 하나(로비)로.
import { DurableObject } from "cloudflare:workers";

const MAX_MSG = 4096;       // 한 번에 보내는 상태 크기 제한
const MAX_PEERS = 300;      // 로비 정원

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") return new Response("websocket only", { status: 426 });
      const stub = env.ROOM.get(env.ROOM.idFromName("lobby"));
      return stub.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
};

export class Room extends DurableObject {
  async fetch(request) {
    if (this.ctx.getWebSockets().length >= MAX_PEERS) return new Response("full", { status: 503 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const id = crypto.randomUUID().slice(0, 12);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id, p: {} });
    const peers = this.ctx.getWebSockets()
      .filter((w) => w !== server)
      .map((w) => w.deserializeAttachment())
      .filter(Boolean);
    server.send(JSON.stringify({ t: "hello", id, peers }));
    this.broadcast({ t: "j", id, p: {} }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, raw) {
    if (typeof raw !== "string" || raw.length > MAX_MSG) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.t !== "p" || !m.p || typeof m.p !== "object" || Array.isArray(m.p)) return;
    const a = ws.deserializeAttachment() || { id: "?", p: {} };
    const patch = clean(m.p);
    for (const k in patch) {
      if (patch[k] === null) delete a.p[k];
      else a.p[k] = patch[k];
    }
    if (JSON.stringify(a.p).length > MAX_MSG) return;
    ws.serializeAttachment(a);
    this.broadcast({ t: "u", id: a.id, p: patch }, ws);
  }

  webSocketClose(ws) { this.leave(ws); }
  webSocketError(ws) { this.leave(ws); }

  leave(ws) {
    const a = ws.deserializeAttachment();
    try { ws.close(); } catch {}
    if (a) this.broadcast({ t: "l", id: a.id }, ws);
  }

  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    for (const w of this.ctx.getWebSockets()) {
      if (w === except) continue;
      try { w.send(s); } catch {}
    }
  }
}

// 혼잣말은 30자, 알 수 없는 키는 그대로 두되 문자열은 짧게
function clean(p) {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (!/^[a-z]{1,12}$/.test(k)) continue;
    if (k === "say" && v && typeof v === "object") {
      out.say = { t: String(v.t || "").slice(0, 30), at: Number(v.at) || Date.now() };
    } else if (typeof v === "string") out[k] = v.slice(0, 40);
    else out[k] = v;
  }
  return out;
}
