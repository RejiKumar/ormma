import { setGlobalOptions } from "firebase-functions/v2";
import type { PlaceholderId } from "../../shared/types";

// Every function deploys to Mumbai. Set once here so none can land in another region.
setGlobalOptions({ region: "asia-south1" });

// Stage 0 placeholder: proves the shared/ type import is erased at build. No functions yet.
export const STAGE = "0" satisfies PlaceholderId;
