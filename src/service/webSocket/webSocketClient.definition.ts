export enum RoleTypes {
	USER = "USER",
	ADMIN = "ADMIN",
}

export enum MessageEventTypes {
	TOKEN_UPDATE = "TOKEN_UPDATE",
	NOTIFICATION = "NOTIFICATION",
	PING = "PING",
	PONG = "PONG",
	ERROR = "ERROR",
	AUTHENTICATION_SUCCESS = "AUTHENTICATION_SUCCESS",
	AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
}

export enum ConnectionStatus {
	CONNECTED = "CONNECTED",
	DISCONNECTED = "DISCONNECTED",
	AUTHENTICATING = "AUTHENTICATING",
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

export interface IMessage<T = unknown> {
	event: MessageEventTypes;
	data?: T;
	error?: string;
}

export interface IWebSocketClient {
	socket: WebSocket;
	sessionId: string;
	status: ConnectionStatus;
	lastPong: number;
}

export type WebSocketsMap = Map<string, IWebSocketClient>;