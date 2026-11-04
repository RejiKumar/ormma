/** Longest wa.me link the app will open; longer updates go to the system share sheet instead. */
export const MAX_WHATSAPP_URL_LENGTH = 2000;

/** The WhatsApp link that opens a chat picker with `text` as an unsent message. */
export function whatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** True when the link for `text` is short enough to open. */
export function fitsWhatsApp(text: string): boolean {
  return whatsAppUrl(text).length <= MAX_WHATSAPP_URL_LENGTH;
}
