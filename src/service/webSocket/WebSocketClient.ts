import { IWebSocketConfig } from "../service.definition.ts";
import {
    IDecodedMessage,
    IDecodedToken,
    IWebSocketUserData,
    MessageEventTypes,
    RoleTypes,
    WebSocketsMap
} from "./webSocketClient.definition.ts";
import { decode } from "@djwt";

export class WebSocketClient {
    private static instance: WebSocketClient;
    private socketsMap: WebSocketsMap = new Map();
    private config: IWebSocketConfig;
    private abortController: AbortController = new AbortController();

    private constructor(config: IWebSocketConfig) {
        this.config = config;
    }

    public static getInstance(config?: IWebSocketConfig): WebSocketClient {
        if (!WebSocketClient.instance && config) {
            WebSocketClient.instance = new WebSocketClient(config);
        }
        return WebSocketClient.instance;
    }

    public async init() {
        try {
            const { WS_PORT } = this.config;
            console.log(`>> Starting WebSocket server on port: ${WS_PORT}`);

            await Deno.serve({
                port: WS_PORT,
                signal: this.abortController.signal,
                onListen: ({ port }) => {
                    console.log(`>> WebSocket server listening on port: ${port}`);
                },
                onError: (error) => {
                    console.error(">> Unhandled error in WebSocket server:", error);
                    return new Response("Internal Server Error", { status: 500 });
                }
            }, this.handleRequest.bind(this));

        } catch (error) {
            console.error(">> Error initializing WebSocket server:", error);
            throw error; // Re-throw to indicate initialization failure
        }
    }

    public notify(userId: number, message: string | object) {
        const socketClient = this.socketsMap.get(String(userId));
        if (socketClient?.socket && socketClient.socket.readyState === WebSocket.OPEN) {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
            socketClient.socket.send(messageStr);
            console.log(`>> Message successfully sent to user: ${userId}`);
        } else {
            console.log(`>> Socket not found or not open for user: ${userId}`);
        }
    }

    public close() {
        if (this.abortController.signal.aborted) {
            console.log(">> WebSocket server is already closing or closed.");
            return;
        }
        console.log(">> Closing WebSocket server...");
        this.abortController.abort();
        for (const [userId, client] of this.socketsMap.entries()) {
            if (client.socket.readyState === WebSocket.OPEN) {
                client.socket.close(1000, "Server shutting down");
            }
            this.socketsMap.delete(userId);
        }
        console.log(">> All active WebSocket connections closed. Server shut down.");
    }

    private async handleRequest(req: Request): Promise<Response> {
        if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
            return new Response("Expected a WebSocket upgrade request", { status: 426 });
        }

        const { pathname } = new URL(req.url);
        const role = this.getRoleFromPath(pathname);

        if (!role) {
            return new Response("Endpoint not found", { status: 404 });
        }

        const token = req.headers.get("auth_token");
        if (!token) {
            return new Response("Missing authentication token", { status: 401 });
        }

        try {
            const { verified, decodedToken } = await this.verifyToken(token);

            if (!verified || !decodedToken) {
                return new Response("Unauthorized: Invalid token", { status: 401 });
            }

            if (role === RoleTypes.ADMIN && decodedToken.role !== RoleTypes.ADMIN) {
                return new Response("Forbidden: Administrator privileges required", { status: 403 });
            }

            const { socket, response } = Deno.upgradeWebSocket(req, {
                idleTimeout: 120, // 2 minutes
            });

            const userData: IWebSocketUserData = {
                userId: decodedToken.userId,
                role,
                sessionId: decodedToken.sessionId
            };

            this.setupSocketEvents(socket, userData);

            return response;
        } catch (error) {
            console.error(error);
            return new Response("Failed to upgrade connection", { status: 500 });
        }
    }
    
    private getRoleFromPath(pathname: string): RoleTypes | null {
        if (pathname.startsWith("/ws/")) {
            const roleSegment = pathname.split('/')[2];
            switch (roleSegment) {
                case "user":
                    return RoleTypes.USER;
                case "admin":
                    return RoleTypes.ADMIN;
            }
        }
        return null;
    }

    private setupSocketEvents(socket: WebSocket, userData: IWebSocketUserData) {
        socket.onopen = () => {
            this.handleConnectionOpen(socket, userData);
        };
        socket.onmessage = (event) => {
            this.handleMessage(socket, event.data, userData);
        };
        socket.onclose = (event) => {
            console.log(`>> Connection closed: ${event.code} - ${event.reason}`);
            this.handleConnectionClose(userData);
        };
        socket.onerror = (event) => {
            console.error(`>> WebSocket error for user ${userData.userId}:`, event);
        };
    }

    private handleConnectionOpen(socket: WebSocket, userData: IWebSocketUserData) {
        const { userId, role, sessionId } = userData;

        if (!userId || !role || !sessionId) {
            socket.close(1008, "Invalid user data provided.");
            return;
        }
        
        this.socketsMap.set(String(userId), { socket, sessionId });
        console.log(`>> ${role} connected: ${userId}`);

        socket.send(JSON.stringify({
            event: MessageEventTypes.NOTIFICATION,
            data: { message: "Connection successfully established" }
        }));
    }

    private handleMessage(socket: WebSocket, data: string | ArrayBuffer, userData: IWebSocketUserData) {
        try {
            const messageStr = typeof data === "string" ? data : new TextDecoder().decode(data);

            if (messageStr === "ping") {
                socket.send("pong");
                return;
            }

            let decodedMessage: IDecodedMessage;
            try {
                decodedMessage = JSON.parse(messageStr);
            } catch (e) {
                console.log(`>> Non-JSON message received from ${userData.userId}: ${messageStr}`);
                socket.send(JSON.stringify({ event: "error", message: "Invalid JSON format" }));
                return;
            }

            switch (decodedMessage.event) {
                case MessageEventTypes.TOKEN_UPDATE:
                    if (decodedMessage.token) {
                        this.handleTokenUpdate(socket, decodedMessage.token, userData);
                    }
                    break;
                case MessageEventTypes.PING:
                    socket.send(JSON.stringify({ event: MessageEventTypes.PING, data: "pong" }));
                    break;
                default:
                    console.log(`>> Message received from user ${userData.userId}:`, decodedMessage);
                    // Implement further message handling as needed
                    break;
            }
        } catch (error) {
            console.error(">> Error processing message:", error);
            socket.send(JSON.stringify({ event: "error", message: "Error processing message" }));
        }
    }

    private async handleTokenUpdate(socket: WebSocket, token: string, userData: IWebSocketUserData) {
        try {
            const { verified, decodedToken } = await this.verifyToken(token);
            if (verified && decodedToken?.sessionId === userData.sessionId) {
                socket.send(JSON.stringify({
                    event: MessageEventTypes.NOTIFICATION,
                    data: { message: "Token updated successfully" }
                }));
            } else {
                socket.close(1008, "Invalid token or session mismatch");
            }
        } catch (error) {
            console.error(">> Error verifying token update:", error);
            socket.close(1011, "Internal error during token verification");
        }
    }

    private handleConnectionClose(userData: IWebSocketUserData) {
        const { userId, role } = userData;
        if (userId && this.socketsMap.has(String(userId))) {
            this.socketsMap.delete(String(userId));
            console.log(`>> ${role} disconnected: ${userId}`);
        }
    }

    private decodeToken(token: string): IDecodedToken | null {
        try {
            const [_, payload] = decode(token);
            return payload as IDecodedToken;
        } catch (error) {
            console.error(">> Error decoding token:", error);
            return null;
        }
    }

    private async verifyToken(token: string): Promise<{ decodedToken?: IDecodedToken; verified: boolean }> {
        try {
            const response = await fetch(`${this.config.SESSION_SERVICE_URL}/v1/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jwt: token })
            });

            if (!response.ok) {
                console.error(`>> Token verification failed with status: ${response.status}`);
                return { verified: false };
            }

            const decodedToken = await response.json() as IDecodedToken;
            return { decodedToken, verified: true };
        } catch (error) {
            console.error(">> Error during token verification request:", error);
            return { verified: false };
        }
    }
}
