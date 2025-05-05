import { init } from "./src/service/init.ts";
import { load } from "@std/dotenv";

await load({ export: true });

init();