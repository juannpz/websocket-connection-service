import { BaseNotification } from "../manager/notificationManager/notificationManager.definition.ts";

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

export interface WebSocketUserData {
	userId: number;
	role: RoleTypes;
	sessionId: string;
}

export interface DecodedToken {
	userId: number;
	role: RoleTypes;
	sessionId: string;
	exp: number;
}

export interface DecodedMessage {
	event: MessageEventTypes;
	token?: string;
	data?: unknown;
}

export interface WebSocketClient {
	socket: WebSocket;
	sessionId: string;
	status: ConnectionStatus;
	lastPong: number;
}

export type WebSocketsMap = Map<string, WebSocketClient>;