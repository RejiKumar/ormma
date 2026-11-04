import { fitsWhatsApp, MAX_WHATSAPP_URL_LENGTH, whatsAppUrl } from "./whatsapp";

describe("whatsapp link", () => {
  it("percent-encodes the text after https://wa.me/?text=", () => {
    expect(whatsAppUrl("Ormma update\nAmma & Appa")).toBe("https://wa.me/?text=Ormma%20update%0AAmma%20%26%20Appa");
  });

  it("accepts a normal update and rejects one whose link passes the limit", () => {
    expect(fitsWhatsApp("Ormma update, Wed 4 Nov")).toBe(true);
    expect(fitsWhatsApp("x".repeat(MAX_WHATSAPP_URL_LENGTH))).toBe(false);
  });
});
