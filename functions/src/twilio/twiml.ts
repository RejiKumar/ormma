// Minimal TwiML (Twilio's XML call script) builders. Every value is escaped, so an address or id can
// never break out of its attribute or element. Only the verbs the check-in call needs.

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const play = (url: string): string => `<Play>${escapeXml(url)}</Play>`;

export const redirect = (url: string): string => `<Redirect method="POST">${escapeXml(url)}</Redirect>`;

export const hangup = (): string => "<Hangup/>";

export interface GatherOptions {
  action: string;
  /** Seconds to wait for a key after the prompt ends. */
  timeout: number;
}

/** A one-key keypad gather. The nested verbs play while a key can already be pressed. */
export const gather = (options: GatherOptions, ...nested: string[]): string =>
  `<Gather input="dtmf" numDigits="1" timeout="${options.timeout}" method="POST" action="${escapeXml(options.action)}">${nested.join("")}</Gather>`;

export interface RecordOptions {
  action: string;
  maxLength: number;
  /** Seconds of silence that end the recording. */
  timeout: number;
}

/** A short recording of the parent's spoken answer, with no beep and no key to finish. */
export const record = (options: RecordOptions): string =>
  `<Record method="POST" action="${escapeXml(options.action)}" maxLength="${options.maxLength}" timeout="${options.timeout}" playBeep="false" finishOnKey=""/>`;

export const response = (...verbs: string[]): string =>
  `<?xml version="1.0" encoding="UTF-8"?><Response>${verbs.join("")}</Response>`;
