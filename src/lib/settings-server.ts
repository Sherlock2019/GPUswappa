import "server-only";
import { cache } from "react";
import { getSettings } from "./settings";

/** Per-request cached settings for server components (avoids repeated DB reads while rendering lists). */
export const getSettingsCached = cache(getSettings);
