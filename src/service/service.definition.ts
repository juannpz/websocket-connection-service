export interface ServiceConfig {
    brokerConfig: BrokerConfig;
    webSocketConfig: WebSocketConfig;
    serviceUrls: ServiceUrls;
}

export interface WebSocketConfig {
    WS_PORT: number;
    SESSION_SERVICE_URL: string;
}

export interface BrokerConfig {
    BROKER_HOST: string;
    BROKER_PORT: number;
    BROKER_CLIENT_ID: string;
}

export interface ServiceUrls {
    sessionServiceUrl: string;
}