import { BrokerConfig, ServiceConfig, ServiceUrls, WebSocketConfig } from "./service.definition.ts";
import { checkEnv } from '@juannpz/deno-service-tools';

export function getConfig() {
    const config: ServiceConfig = {
        brokerConfig: getBrokerConfig(),
        webSocketConfig: getWebSocketConfig(),
        serviceUrls: getServiceUrls()
    };
    
    return checkEnv(config);
}

function getBrokerConfig(): BrokerConfig {
    return {
        BROKER_HOST: Deno.env.get("BROKER_HOST") ?? "",
        BROKER_PORT: parseInt(Deno.env.get("BROKER_PORT") ?? ""),
        BROKER_CLIENT_ID: Deno.env.get("BROKER_CLIENT_ID") ?? ""
    };
}

function getWebSocketConfig(): WebSocketConfig {
    return {
        WS_PORT: parseInt(Deno.env.get("WS_PORT") ?? ""),
        SESSION_SERVICE_URL: Deno.env.get("SESSION_SERVICE_URL") ?? ""
    }
}

function getServiceUrls(): ServiceUrls {
    return {
        sessionServiceUrl: Deno.env.get("SESSION_SERVICE_URL") ?? ""
    }
}