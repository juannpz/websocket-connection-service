import { IWebSocketConfig } from "../service.definition.ts";
import {
    IDecodedMessage,
    IDecodedToken,
    IWebSocketUserData,
    MessageEventTypes,
    RoleTypes,
    WebSocketsMap
} from "./webSocketClient.definition.ts";

export class WebSocketClient {
    private static instance: WebSocketClient;
    private socketsMap: WebSocketsMap;
    private configOptions: IWebSocketConfig;
    private sessionServiceUrl: string;
    private abortController: AbortController;

    private constructor(config: IWebSocketConfig, sessionServiceUrl: string) {
        this.socketsMap = new Map();
        this.configOptions = config;
        this.sessionServiceUrl = sessionServiceUrl;
        this.abortController = new AbortController();
    }

    public static getInstance(config?: IWebSocketConfig, sessionServiceUrl?: string): WebSocketClient {
        if ((!WebSocketClient.instance) && config && sessionServiceUrl) {
            WebSocketClient.instance = new WebSocketClient(config, sessionServiceUrl);
        }
        return WebSocketClient.instance;
    }

    public async init() {
        try {
            const { WS_PORT } = this.configOptions;
            console.log(`>> Iniciando servidor WebSocket en puerto: ${WS_PORT}`);

            await Deno.serve({
                port: WS_PORT,
                signal: this.abortController.signal,
                onListen: ({ port }) => {
                    console.log(`>> Servidor WebSocket escuchando en puerto: ${port}`);
                }
            }, (this.handleRequest.bind(this)));

        } catch (error) {
            console.error(">> Error al inicializar servidor WebSocket:", error);
        }
    }

    public async notify(userId: number, message: string | object) {
        const socketClient = this.socketsMap.get(String(userId));
        if (socketClient?.socket && socketClient.socket.readyState === WebSocket.OPEN) {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
            socketClient.socket.send(messageStr);
            console.log(`>> Mensaje enviado exitosamente al usuario: ${userId}`);
        } else {
            console.log(`>> Socket no encontrado o no abierto para el usuario: ${userId}`);
        }
    }

    public close() {
        this.abortController.abort();
        // Cerrar todas las conexiones activas
        for (const [userId, client] of this.socketsMap.entries()) {
            if (client.socket.readyState === WebSocket.OPEN) {
                client.socket.close(1000, "Servidor apagándose");
            }
        }
        console.log(">> Servidor WebSocket cerrado");
    }

    private async handleRequest(req: Request): Promise<Response> {
        // Verificar si es una solicitud de upgrade a WebSocket
        if (req.headers.get("upgrade") !== "websocket") {
            return new Response("Se esperaba una solicitud de WebSocket", { status: 426 });
        }

        const { pathname } = new URL(req.url);

        // Verificar la ruta
        if (pathname !== "/user" && pathname !== "/admin") {
            return new Response("Ruta no encontrada", { status: 404 });
        }

        const role = pathname === "/user" ? RoleTypes.USER : RoleTypes.ADMIN;

        try {
            // Obtener el token de autorización
            const token = req.headers.get("auth_token") ?? "";

            // Verificar el token antes de hacer el upgrade
            const verifyResult = await this.verifyToken(token);

            if (!verifyResult.verified) {
                return new Response("No autorizado", { status: 401 });
            }

            // Para la ruta /admin, verificar que el rol sea ADMIN
            if (pathname === "/admin" && verifyResult.role !== RoleTypes.ADMIN) {
                return new Response("No tiene permisos de administrador", { status: 403 });
            }

            const decodedToken = this.decodeToken(token);
            if (!decodedToken?.sessionId) {
                return new Response("Falta ID de sesión", { status: 400 });
            }

            // Crear conexión WebSocket con opciones mejoradas
            const { socket, response } = Deno.upgradeWebSocket(req, {
                idleTimeout: 120, // segundos
            });

            // Almacenar datos del usuario
            const userData: IWebSocketUserData = {
                userId: decodedToken.userId,
                role,
                sessionId: decodedToken.sessionId
            };

            // Configurar eventos del socket
            this.setupSocketEvents(socket, userData);

            return response;
        } catch (error) {
            console.error(`>> Error al manejar upgrade de WebSocket: ${error}`);
            return new Response(`Error al actualizar la conexión`, { status: 500 });
        }
    }

    private setupSocketEvents(socket: WebSocket, userData: IWebSocketUserData) {
        // Evento de apertura
        socket.addEventListener("open", () => {
            this.setSocket(socket, userData);
        });

        // Evento de mensaje
        socket.addEventListener("message", (event) => {
            this.handleMessage(socket, event.data, userData);
        });

        // Evento de cierre
        socket.addEventListener("close", (event) => {
            console.log(`>> Conexión cerrada: ${event.code} - ${event.reason}`);
            this.handleClose(userData);
        });

        // Evento de error
        socket.addEventListener("error", (event) => {
            console.error(`>> Error en WebSocket para usuario ${userData.userId}:`, event);
        });
    }

    private setSocket(socket: WebSocket, userData: IWebSocketUserData) {
        const { userId, role, sessionId } = userData;

        if (userId && role && sessionId) {
            this.socketsMap.set(String(userId), { socket, sessionId });
            console.log(`>> ${role} conectado: ${userId}`);

            // Enviar mensaje de bienvenida
            socket.send(JSON.stringify({
                event: MessageEventTypes.NOTIFICATION,
                data: { message: "Conexión establecida correctamente" }
            }));
        }
    }

    private handleMessage(socket: WebSocket, data: string | ArrayBuffer, userData: IWebSocketUserData) {
        try {
            // Si es una cadena
            const messageStr = typeof data === "string" ? data : new TextDecoder().decode(data);

            // Manejo simple para ping/pong
            if (messageStr === "ping") {
                socket.send("pong");
                return;
            }

            // Intentar decodificar como JSON
            try {
                const decodedMessage = JSON.parse(messageStr) as IDecodedMessage;

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
                        console.log(`>> Mensaje recibido de usuario ${userData.userId}:`, decodedMessage);
                        // Puedes implementar más manejo de mensajes según sea necesario
                        break;
                }
            } catch (jsonError) {
                console.log(`>> Mensaje no-JSON recibido: ${messageStr}`);
            }
        } catch (error) {
            console.error(">> Error al procesar mensaje:", error);
        }
    }

    private async handleTokenUpdate(socket: WebSocket, token: string, userData: IWebSocketUserData) {
        try {
            const verifyResult = await this.verifyToken(token);
            if (verifyResult.verified) {
                const decodedToken = this.decodeToken(token);
                if (decodedToken) {
                    const socketsMapMember = this.socketsMap.get(String(decodedToken.userId));
                    if (socketsMapMember && decodedToken.sessionId === socketsMapMember.sessionId) {
                        // El token es válido y la sesión coincide, no hay nada que hacer
                        socket.send(JSON.stringify({
                            event: MessageEventTypes.NOTIFICATION,
                            data: { message: "Token actualizado correctamente" }
                        }));
                        return;
                    }
                }
            }
            // Token inválido o sesión no coincide, cerrar la conexión
            socket.close(1008, "Token inválido");
        } catch (error) {
            console.error(">> Error al verificar actualización de token:", error);
            socket.close(1011, "Error interno");
        }
    }

    private handleClose(userData: IWebSocketUserData) {
        const { userId, role } = userData;
        if (userId && role) {
            this.socketsMap.delete(String(userId));
            console.log(`>> ${role} desconectado: ${userId}`);
        }
    }

    private decodeToken(token: string): IDecodedToken | null {
        try {
            // En un entorno real, usarías una librería como djwt
            // Este es un ejemplo simple para decodificar JWT sin verificación
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload) as IDecodedToken;
        } catch (error) {
            console.error(">> Error al decodificar token", error);
            return null;
        }
    }

    private async verifyToken(token: string): Promise<{ userId?: number; role?: RoleTypes; verified: boolean }> {
        try {
            const response = await fetch(`${this.sessionServiceUrl}/v1/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ jwt: token })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP! Estado: ${response.status}`);
            }

            const { userId, role } = await response.json();
            return { userId, role, verified: true };
        } catch (error) {
            console.error(">> Error al verificar token", error);
            return { verified: false };
        }
    }
}