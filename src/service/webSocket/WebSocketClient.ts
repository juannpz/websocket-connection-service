import { Notification } from "../manager/notificationManager/notificationManager.definition.ts";
import { WebSocketConfig } from "../service.definition.ts";
import {
	ConnectionStatus,
	DecodedMessage,
	DecodedToken,
	WebSocketUserData,
	MessageEventTypes,
	RoleTypes,
	WebSocketsMap,
} from "./webSocketClient.definition.ts";

export class WebSocketClient {
	private socketsMap: WebSocketsMap = new Map();
	private config: WebSocketConfig;
	private abortController: AbortController = new AbortController();
	private heartbeatInterval: number | undefined;

	public constructor(config: WebSocketConfig) {
		this.config = config;
	}

	public init() {
		try {
			const { WS_PORT } = this.config;
			console.log(`>> Starting WebSocket server on port: ${WS_PORT}`);

			Deno.serve(
				{
					port: WS_PORT,
					signal: this.abortController.signal,
					onListen: ({ port }) => {
						console.log(`>> WebSocket server listening on port: ${port}`);
					},
					onError: (error) => {
						console.error(">> Unhandled error in WebSocket server:", error);
						return new Response("Internal Server Error", { status: 500 });
					},
				},
				this.handleRequest.bind(this),
			);

			this.heartbeatInterval = setInterval(
				() => this.checkConnections(),
				30000,
			);
		} catch (error) {
			console.error(">> Error initializing WebSocket server:", error);
			throw error;
		}
	}

	public notify(userId: number, notification: Notification) {
		const socketClient = this.socketsMap.get(String(userId));
		if (
			socketClient?.socket &&
			socketClient.socket.readyState === WebSocket.OPEN
		) {
			const messageStr = JSON.stringify(notification);
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
		clearInterval(this.heartbeatInterval);
		for (const [userId, client] of this.socketsMap.entries()) {
			if (client.socket.readyState === WebSocket.OPEN) {
				client.socket.close(1000, "Server shutting down");
			}
			this.socketsMap.delete(userId);
		}
		console.log(
			">> All active WebSocket connections closed. Server shut down.",
		);
	}

	private async handleRequest(req: Request): Promise<Response> {
		if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
			return new Response("Expected a WebSocket upgrade request", {
				status: 426,
			});
		}

		const { pathname, searchParams } = new URL(req.url);
		const role = this.getRoleFromPath(pathname);

		if (!role) {
			return new Response("Endpoint not found", { status: 404 });
		}

		const authHeader = req.headers.get("Authorization");
		const tokenFromHeader = authHeader?.startsWith("Bearer ")
			? authHeader.substring(7)
			: null;
		const token = tokenFromHeader ?? req.headers.get("auth_token") ??
			searchParams.get("auth_token");
		if (!token) {
			return new Response("Missing authentication token", { status: 401 });
		}

		try {
			const { verified, decodedToken } = await this.verifyToken(token);

			if (!verified || !decodedToken) {
				return new Response("Unauthorized: Invalid token", { status: 401 });
			}

			if (role === RoleTypes.ADMIN && decodedToken.role !== RoleTypes.ADMIN) {
				return new Response("Forbidden: Administrator privileges required", {
					status: 403,
				});
			}

			const { socket, response } = Deno.upgradeWebSocket(req, {
				idleTimeout: 120, // 2 minutes
			});

			const userData: WebSocketUserData = {
				userId: decodedToken.userId,
				role,
				sessionId: decodedToken.sessionId,
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
			const roleSegment = pathname.split("/")[2];
			switch (roleSegment) {
				case "user":
					return RoleTypes.USER;
				case "admin":
					return RoleTypes.ADMIN;
			}
		}
		return null;
	}

	private setupSocketEvents(socket: WebSocket, userData: WebSocketUserData) {
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

	private handleConnectionOpen(
		socket: WebSocket,
		userData: WebSocketUserData,
	) {
		const { userId, role, sessionId } = userData;

		if (!userId || !role || !sessionId) {
			socket.close(1008, "Invalid user data provided.");
			return;
		}

		this.socketsMap.set(String(userId), {
			socket,
			sessionId,
			status: ConnectionStatus.CONNECTED,
			lastPong: Date.now(),
		});
		console.log(`>> ${role} connected: ${userId}`);

		socket.send(
			JSON.stringify({
				event: MessageEventTypes.AUTHENTICATION_SUCCESS,
				data: { message: "Connection successfully established" },
			}),
		);
	}

	private handleMessage(
		socket: WebSocket,
		data: string | ArrayBuffer,
		userData: WebSocketUserData,
	) {
		try {
			const messageStr = typeof data === "string"
				? data
				: new TextDecoder().decode(data);

			let decodedMessage: DecodedMessage;
			try {
				decodedMessage = JSON.parse(messageStr);
			} catch (e) {
				console.log(
					`>> Non-JSON message received from ${userData.userId}: ${messageStr}`,
				);
				socket.send(
					JSON.stringify({ event: "error", message: "Invalid JSON format" }),
				);
				return;
			}

			switch (decodedMessage.event) {
				case MessageEventTypes.TOKEN_UPDATE:
					if (decodedMessage.token) {
						this.handleTokenUpdate(socket, decodedMessage.token, userData);
					}
					break;
				case MessageEventTypes.PING:
					socket.send(
						JSON.stringify({ event: MessageEventTypes.PONG, data: "pong" }),
					);
					break;
				case MessageEventTypes.PONG:
					{
						const client = this.socketsMap.get(String(userData.userId));
						if (client) {
							client.lastPong = Date.now();
						}
					}
					break;
				default:
					console.log(
						`>> Message received from user ${userData.userId}:`,
						decodedMessage,
					);
					break;
			}
		} catch (error) {
			console.error(">> Error processing message:", error);
			socket.send(
				JSON.stringify({ event: "error", message: "Error processing message" }),
			);
		}
	}

	private async handleTokenUpdate(
		socket: WebSocket,
		token: string,
		userData: WebSocketUserData,
	) {
		try {
			const { verified, decodedToken } = await this.verifyToken(token);
			if (verified && decodedToken?.sessionId === userData.sessionId) {
				socket.send(
					JSON.stringify({
						event: MessageEventTypes.NOTIFICATION,
						data: { message: "Token updated successfully" },
					}),
				);
			} else {
				socket.close(1008, "Invalid token or session mismatch");
			}
		} catch (error) {
			console.error(">> Error verifying token update:", error);
			socket.close(1011, "Internal error during token verification");
		}
	}

	private handleConnectionClose(userData: WebSocketUserData) {
		const { userId, role } = userData;
		if (userId && this.socketsMap.has(String(userId))) {
			this.socketsMap.delete(String(userId));
			console.log(`>> ${role} disconnected: ${userId}`);
		}
	}

	private async verifyToken(token: string,): Promise<{ decodedToken?: DecodedToken; verified: boolean }> {
		return {
			verified: true,
			decodedToken: {
				sessionId: "mockSessionId",
				role: RoleTypes.ADMIN,
				userId: 1,
				exp: Date.now() + 3600000,
			},
		};
	}

	private checkConnections() {
		const now = Date.now();
		for (const [userId, client] of this.socketsMap.entries()) {
			if (now - client.lastPong > 35000) {
				console.log(
					`>> No pong from user ${userId} in the last 35 seconds. Terminating connection.`,
				);
				client.socket.close(1000, "Idle timeout");
				this.socketsMap.delete(userId);
			} else {
				client.socket.send(JSON.stringify({ event: MessageEventTypes.PING }));
			}
		}
	}
}
