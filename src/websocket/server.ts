import { WebSocketServer } from "ws";
import http from "http";
import { handleConnection } from "./handler";

export function initializeWebSocketServer(server: http.Server) {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws, req) => {
        handleConnection(ws, req);
    })
}