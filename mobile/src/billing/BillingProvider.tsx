import { createContext, useContext, type ReactNode } from "react";
import type { Billing } from "./billing";
import { playBilling } from "./playBilling";

const BillingContext = createContext<Billing>(playBilling);

/** Provides the Billing implementation; tests pass a fake, the app uses Google Play. */
export function BillingProvider({ billing = playBilling, children }: { billing?: Billing; children: ReactNode }) {
  return <BillingContext.Provider value={billing}>{children}</BillingContext.Provider>;
}

export function useBilling(): Billing {
  return useContext(BillingContext);
}
