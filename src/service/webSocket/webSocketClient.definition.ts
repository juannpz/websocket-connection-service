export enum RoleTypes {
    USER = "USER",
    ADMIN = "ADMIN"
}

export enum MessageEventTypes {
    TOKEN_UPDATE = "TOKEN_UPDATE",
    NOTIFICATION = "NOTIFICATION",
    PING = "PING"
}

export interface IWebSocketUserData {
    userId: number;
    role: RoleTypes;
    sessionId: string;
}

export interface IDecodedToken {
    userId: number;
    role: RoleTypes;
    sessionId: string;
    exp: number;
}

export interface IDecodedMessage {
    event: MessageEventTypes;
    token?: string;
    data?: unknown;
}

export interface IWebSocketClient {
    socket: WebSocket;
    sessionId: string;
}

export type WebSocketsMap = Map<string, IWebSocketClient>;