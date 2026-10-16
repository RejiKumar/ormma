import { setGlobalOptions } from "firebase-functions/v2";
import type { Language } from "../../shared/types";

// Every function deploys to Mumbai. Set once here so none can land in another region.
setGlobalOptions({ region: "asia-south1" });

// Placeholder: proves the shared/ type import is erased at build. No functions yet.
export const SUPPORTED_LANGUAGES: readonly Language[] = ["ml-IN", "ta-IN", "hi-IN", "en-IN"];
