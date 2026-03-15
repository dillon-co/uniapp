import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";

interface WsClient {
  ws: WebSocket;
  userId: string;
  rooms: Set<string>;
}

// In-memory pub/sub — replace Map with Redis pub/sub for horizontal scaling
const clients = new Map<string, WsClient>();
const rooms = new Map<string, Set<string>>(); // roomId → Set<clientId>

declare module "fastify" {
  interface FastifyInstance {
    broadcast: (room: string, event: string, data: unknown) => void;
    notifyUser: (userId: string, event: string, data: unknown) => void;
  }
}

const wsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(websocket);

  // Helpers
  app.decorate("broadcast", (room: string, event: string, data: unknown) => {
    const roomClients = rooms.get(room);
    if (!roomClients) return;
    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    for (const clientId of roomClients) {
      const client = clients.get(clientId);
      if (client?.ws.readyState === 1 /* OPEN */) {
        client.ws.send(payload);
      }
    }
  });

  app.decorate("notifyUser", (userId: string, event: string, data: unknown) => {
    app.broadcast(`user:${userId}`, event, data);
  });

  // WebSocket endpoint
  app.get(
    "/ws",
    { websocket: true },
    (socket: WebSocket, request: FastifyRequest) => {
      const clientId = crypto.randomUUID();
      const client: WsClient = { ws: socket, userId: "", rooms: new Set() };
      clients.set(clientId, client);

      // Heartbeat
      const heartbeat = setInterval(() => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ event: "ping", timestamp: new Date().toISOString() }));
        }
      }, 30_000);

      socket.on("message", async (raw: Buffer | string) => {
        try {
          const msg = JSON.parse(raw.toString()) as {
            type: string;
            token?: string;
            room?: string;
          };

          switch (msg.type) {
            case "auth": {
              if (!msg.token) {
                socket.send(JSON.stringify({ event: "error", data: { message: "Token required" } }));
                return;
              }
              try {
                const payload = await request.server.jwt.verify<{ userId: string }>(msg.token);
                client.userId = payload.userId;

                // Auto-join user's personal room
                const userRoom = `user:${payload.userId}`;
                client.rooms.add(userRoom);
                if (!rooms.has(userRoom)) rooms.set(userRoom, new Set());
                rooms.get(userRoom)!.add(clientId);

                socket.send(JSON.stringify({ event: "authenticated", data: { userId: payload.userId } }));
              } catch {
                socket.send(JSON.stringify({ event: "error", data: { message: "Invalid token" } }));
              }
              break;
            }

            case "subscribe": {
              if (!client.userId) {
                socket.send(JSON.stringify({ event: "error", data: { message: "Authenticate first" } }));
                return;
              }
              const room = msg.room;
              if (!room) return;

              // Only allow subscribing to event rooms (not other users' rooms)
              if (!room.startsWith("event:") && !room.startsWith(`user:${client.userId}`)) {
                socket.send(JSON.stringify({ event: "error", data: { message: "Cannot subscribe to this room" } }));
                return;
              }

              client.rooms.add(room);
              if (!rooms.has(room)) rooms.set(room, new Set());
              rooms.get(room)!.add(clientId);
              socket.send(JSON.stringify({ event: "subscribed", data: { room } }));
              break;
            }

            case "unsubscribe": {
              const room = msg.room;
              if (room) {
                client.rooms.delete(room);
                rooms.get(room)?.delete(clientId);
              }
              break;
            }

            case "pong":
              break;

            default:
              socket.send(JSON.stringify({ event: "error", data: { message: `Unknown message type: ${msg.type}` } }));
          }
        } catch {
          socket.send(JSON.stringify({ event: "error", data: { message: "Invalid JSON" } }));
        }
      });

      socket.on("close", () => {
        clearInterval(heartbeat);
        for (const room of client.rooms) {
          rooms.get(room)?.delete(clientId);
        }
        clients.delete(clientId);
      });

      socket.on("error", (err: Error) => {
        app.log.error({ err }, "WebSocket error");
      });

      socket.send(JSON.stringify({
        event: "connected",
        data: { message: "Send { type: 'auth', token: '<jwt>' } to authenticate" },
      }));
    },
  );
};

export const websocketPlugin = fp(wsPlugin, { name: "websocket" });
