import { NotificationManager } from "./notificationManager/NotificationManager.ts";
import { IServiceConfig } from "../service.definition.ts";

export async function initManager(config: IServiceConfig) {
    await NotificationManager.init(config.brokerConfig);
}