// The emulator tests exercise the whole call flow, so calling is switched on with the test provider
// (nothing is dialled). Tests that check the off state pass an explicit activation instead.
process.env.CALL_PROVIDER = "log";
