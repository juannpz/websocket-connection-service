import { IBrokerConfig, IServiceConfig } from "./service.definition.ts";
import { checkEnv } from '@juannpz/deno-service-tools';

export function getConfig() {
    const config: IServiceConfig = {
        brokerConfig: getBrokerConfig()
    };
    
    return checkEnv(config);
}

function getBrokerConfig(): IBrokerConfig {
    return {
        BROKER_HOST: Deno.env.get("BROKER_HOST") ?? "",
        BROKER_PORT: parseInt(Deno.env.get("BROKER_PORT") ?? ""),
        BROKER_CLIENT_ID: Deno.env.get("BROKER_CLIENT_ID") ?? ""
    };
}