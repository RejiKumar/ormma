import { bestValue, chooseOffer, trialLengthFromPeriod, type OfferLike } from "./offers";

const phase = (micros: string, period: string, cycles = 1, formatted = "₹299.00") => ({
  billingPeriod: period,
  priceAmountMicros: micros,
  priceCurrencyCode: "INR",
  formattedPrice: formatted,
  billingCycleCount: cycles,
});
const offer = (token: string, phases: ReturnType<typeof phase>[]): OfferLike => ({
  offerTokenAndroid: token,
  pricingPhasesAndroid: { pricingPhaseList: phases },
});

describe("trialLengthFromPeriod", () => {
  it("reads days, weeks and months", () => {
    expect(trialLengthFromPeriod("P7D")).toEqual({ amount: 7, unit: "day" });
    expect(trialLengthFromPeriod("P1W")).toEqual({ amount: 1, unit: "week" });
    expect(trialLengthFromPeriod("P1M")).toEqual({ amount: 1, unit: "month" });
    expect(trialLengthFromPeriod("P1Y")).toEqual({ amount: 12, unit: "month" });
  });

  it("multiplies by the cycle count and rejects mixed or unreadable periods", () => {
    expect(trialLengthFromPeriod("P1D", 3)).toEqual({ amount: 3, unit: "day" });
    expect(trialLengthFromPeriod("P1M1D")).toBeNull();
    expect(trialLengthFromPeriod("nonsense")).toBeNull();
  });
});

describe("chooseOffer", () => {
  const base = offer("base", [phase("299000000", "P1M")]);
  const trial = offer("trial", [phase("0", "P7D", 1, "Free"), phase("299000000", "P1M")]);

  it("uses the trial offer when Play returns one", () => {
    expect(chooseOffer([base, trial])).toMatchObject({
      offerToken: "trial",
      trial: { amount: 7, unit: "day" },
      priceMicros: 299_000_000,
      currencyCode: "INR",
      formattedPrice: "₹299.00",
    });
  });

  it("uses the plain offer when there is no trial offer", () => {
    expect(chooseOffer([base])).toMatchObject({ offerToken: "base", trial: null, priceMicros: 299_000_000 });
  });

  it("prefers the plain base offer over other multi-phase offers that are not a trial", () => {
    const intro = offer("intro", [phase("99000000", "P1M"), phase("299000000", "P1M")]);
    expect(chooseOffer([intro, base])?.offerToken).toBe("base");
  });

  it("ignores a free first phase whose length cannot be read", () => {
    const odd = offer("odd", [phase("0", "P1M1D"), phase("299000000", "P1M")]);
    expect(chooseOffer([odd, base])).toMatchObject({ offerToken: "base", trial: null });
  });

  it("returns null without any offer token", () => {
    expect(chooseOffer([])).toBeNull();
    expect(chooseOffer([{ offerTokenAndroid: null }])).toBeNull();
  });
});

describe("bestValue", () => {
  const m = { priceMicros: 299_000_000, currencyCode: "INR" };
  const y = { priceMicros: 2_999_000_000, currencyCode: "INR" };

  it("computes the monthly equivalent and the saving from the two Play prices", () => {
    expect(bestValue(m, y)).toEqual({ monthlyEquivalent: "₹250", savingPercent: 16 });
  });

  it("is null for different currencies, missing prices, no saving or a tiny one", () => {
    expect(bestValue(m, { ...y, currencyCode: "USD" })).toBeNull();
    expect(bestValue(undefined, y)).toBeNull();
    expect(bestValue(m, { priceMicros: null, currencyCode: "INR" })).toBeNull();
    expect(bestValue(m, { priceMicros: 3_588_000_000, currencyCode: "INR" })).toBeNull();
    expect(bestValue(m, { priceMicros: 3_580_000_000, currencyCode: "INR" })).toBeNull();
  });
});
