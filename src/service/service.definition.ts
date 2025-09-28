export interface IServiceConfig {
    brokerConfig: IBrokerConfig;
    webSocketConfig: IWebSocketConfig;
    serviceUrls: IServiceUrls;
}

export interface IWebSocketConfig {
    WS_PORT: number;
    SESSION_SERVICE_URL: string;
}

export interface IBrokerConfig {
    BROKER_HOST: string;
    BROKER_PORT: number;
    BROKER_CLIENT_ID: string;
}

export interface IServiceUrls {
    sessionServiceUrl: string;
}