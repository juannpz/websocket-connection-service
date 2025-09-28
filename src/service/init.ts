import { initManager } from "./manager/init.ts";
import { getConfig } from "./service.config.ts";

export async function init() {
    const config = getConfig();

    await initManager(config);
}