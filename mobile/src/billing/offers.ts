// Reads Google Play's offers for a subscription: which offer to buy, whether it starts with a free
// trial, and the recurring price. Pure functions over the shape Play returns, so they are tested
// without the store. The app never invents a trial: it only describes what Play returned.
import type { BillingProduct, TrialLength } from "./billing";

export interface PricingPhase {
  billingPeriod: string;
  priceAmountMicros: string;
  priceCurrencyCode: string;
  formattedPrice: string;
  billingCycleCount: number;
}

export interface OfferLike {
  offerTokenAndroid?: string | null;
  pricingPhasesAndroid?: { pricingPhaseList: PricingPhase[] } | null;
}

/** ISO 8601 period (P7D, P1W, P1M, P1Y) as a trial length, or null for anything else. */
export function trialLengthFromPeriod(period: string, cycles = 1): TrialLength | null {
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(period);
  if (!match) return null;
  const [years, months, weeks, days] = [1, 2, 3, 4].map((i) => (match[i] ? Number(match[i]) : 0));
  const count = Math.max(1, cycles);
  if (years + months > 0 && weeks + days === 0) return { amount: (years * 12 + months) * count, unit: "month" };
  if (weeks > 0 && years + months + days === 0) return { amount: weeks * count, unit: "week" };
  if (days > 0 && years + months + weeks === 0) return { amount: days * count, unit: "day" };
  return null;
}

const phasesOf = (offer: OfferLike): PricingPhase[] => offer.pricingPhasesAndroid?.pricingPhaseList ?? [];

/** The trial an offer starts with: a first phase that costs nothing and has a readable length. */
function trialOf(offer: OfferLike): TrialLength | null {
  const phases = phasesOf(offer);
  if (phases.length < 2 || Number(phases[0].priceAmountMicros) !== 0) return null;
  return trialLengthFromPeriod(phases[0].billingPeriod, phases[0].billingCycleCount);
}

export interface ChosenOffer {
  offerToken: string;
  trial: TrialLength | null;
  /** The recurring price, from the last pricing phase. */
  priceMicros: number | null;
  currencyCode: string | null;
  formattedPrice: string | null;
}

/**
 * Google returns the trial offer only to accounts that are eligible, so when one is present it is the
 * offer to buy. Otherwise the plain offer is used (the one with the fewest phases).
 */
export function chooseOffer(offers: readonly OfferLike[]): ChosenOffer | null {
  const withToken = offers.filter((offer) => !!offer.offerTokenAndroid);
  if (withToken.length === 0) return null;
  const trialOffer = withToken.find((offer) => trialOf(offer) !== null);
  const offer = trialOffer ?? [...withToken].sort((a, b) => phasesOf(a).length - phasesOf(b).length)[0];
  const phases = phasesOf(offer);
  const recurring = phases.length > 0 ? phases[phases.length - 1] : null;
  const micros = recurring ? Number(recurring.priceAmountMicros) : Number.NaN;
  return {
    offerToken: offer.offerTokenAndroid as string,
    trial: trialOffer ? trialOf(trialOffer) : null,
    priceMicros: Number.isFinite(micros) && micros > 0 ? micros : null,
    currencyCode: recurring?.priceCurrencyCode || null,
    formattedPrice: recurring?.formattedPrice?.trim() || null,
  };
}

export interface BestValue {
  /** The yearly price per month, formatted in the plan currency. */
  monthlyEquivalent: string;
  /** Whole percent saved against twelve monthly payments. */
  savingPercent: number;
}

/**
 * The yearly saving, computed only from the two Play prices and only when they share a currency and
 * yearly really costs less than twelve months.
 */
export function bestValue(
  monthly: Pick<BillingProduct, "priceMicros" | "currencyCode"> | undefined,
  yearly: Pick<BillingProduct, "priceMicros" | "currencyCode"> | undefined,
): BestValue | null {
  if (!monthly?.priceMicros || !yearly?.priceMicros) return null;
  if (!monthly.currencyCode || monthly.currencyCode !== yearly.currencyCode) return null;
  const twelveMonths = monthly.priceMicros * 12;
  if (yearly.priceMicros >= twelveMonths) return null;
  const savingPercent = Math.round((1 - yearly.priceMicros / twelveMonths) * 100);
  if (savingPercent < 1) return null;
  try {
    const monthlyEquivalent = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: yearly.currencyCode as string,
      maximumFractionDigits: 0,
    }).format(yearly.priceMicros / 12 / 1_000_000);
    return { monthlyEquivalent, savingPercent };
  } catch {
    return null;
  }
}
