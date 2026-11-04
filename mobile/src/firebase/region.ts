// Cloud Functions region for every client call. `functions/src/index.ts` pins all deploys to Mumbai
// with `setGlobalOptions({ region: "asia-south1" })`, so a client instance that omits the region
// (the default is us-central1) reaches no function and every call fails with `code=unknown`.
export const FUNCTIONS_REGION = "asia-south1";
