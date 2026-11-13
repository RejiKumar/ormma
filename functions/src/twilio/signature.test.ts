import { computeTwilioSignature, validateTwilioSignature } from "./signature";
import { gather, hangup, play, record, redirect, response } from "./twiml";

// The worked example from Twilio's own documentation for request validation.
const DOC_URL = "https://mycompany.com/myapp.php?foo=1&bar=2";
const DOC_PARAMS = {
  CallSid: "CA1234567890ABCDE",
  Caller: "+14158675309",
  Digits: "1234",
  From: "+14158675309",
  To: "+18005551212",
};
const DOC_TOKEN = "12345";
const DOC_SIGNATURE = "RSOYDt4T1cUTdK1PDd93/VVr8B8=";

describe("Twilio signature", () => {
  it("matches the documented example", () => {
    expect(computeTwilioSignature(DOC_TOKEN, DOC_URL, DOC_PARAMS)).toBe(DOC_SIGNATURE);
    expect(validateTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, DOC_URL, DOC_PARAMS)).toBe(true);
  });

  it("does not depend on the order the parameters arrive in", () => {
    const shuffled = { To: DOC_PARAMS.To, Digits: DOC_PARAMS.Digits, CallSid: DOC_PARAMS.CallSid, From: DOC_PARAMS.From, Caller: DOC_PARAMS.Caller };
    expect(validateTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, DOC_URL, shuffled)).toBe(true);
  });

  it("fails for a changed parameter, a changed address, another token, a wrong or missing signature", () => {
    expect(validateTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, DOC_URL, { ...DOC_PARAMS, Digits: "9999" })).toBe(false);
    expect(validateTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, DOC_URL, { ...DOC_PARAMS, Extra: "1" })).toBe(false);
    expect(validateTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, "https://mycompany.com/myapp.php?foo=1&bar=3", DOC_PARAMS)).toBe(false);
    expect(validateTwilioSignature("other-token", DOC_SIGNATURE, DOC_URL, DOC_PARAMS)).toBe(false);
    expect(validateTwilioSignature(DOC_TOKEN, "AAAA", DOC_URL, DOC_PARAMS)).toBe(false);
    expect(validateTwilioSignature(DOC_TOKEN, "", DOC_URL, DOC_PARAMS)).toBe(false);
    expect(validateTwilioSignature(DOC_TOKEN, null, DOC_URL, DOC_PARAMS)).toBe(false);
    expect(validateTwilioSignature(DOC_TOKEN, undefined, DOC_URL, DOC_PARAMS)).toBe(false);
  });

  it("fails closed when the auth token is not configured", () => {
    expect(validateTwilioSignature(undefined, DOC_SIGNATURE, DOC_URL, DOC_PARAMS)).toBe(false);
    expect(validateTwilioSignature("", computeTwilioSignature("", DOC_URL, DOC_PARAMS), DOC_URL, DOC_PARAMS)).toBe(false);
  });

  it("signs a parameter with several values by their sorted values", () => {
    const a = computeTwilioSignature(DOC_TOKEN, DOC_URL, { Tag: ["b", "a"] });
    const b = computeTwilioSignature(DOC_TOKEN, DOC_URL, { Tag: ["a", "b"] });
    expect(a).toBe(b);
    expect(a).not.toBe(computeTwilioSignature(DOC_TOKEN, DOC_URL, { Tag: ["a"] }));
  });
});

describe("TwiML builders", () => {
  it("builds a keypad question with a recording after it", () => {
    const xml = response(
      gather({ action: "https://x.test/twilioVoice?step=gather&parentId=p1", timeout: 5 }, play("https://x.test/a.mp3?id=1&token=t")),
      record({ action: "https://x.test/twilioVoice?step=record&parentId=p1", maxLength: 8, timeout: 3 }),
    );
    expect(xml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Gather input="dtmf" numDigits="1" timeout="5" method="POST" action="https://x.test/twilioVoice?step=gather&amp;parentId=p1">' +
        "<Play>https://x.test/a.mp3?id=1&amp;token=t</Play></Gather>" +
        '<Record method="POST" action="https://x.test/twilioVoice?step=record&amp;parentId=p1" maxLength="8" timeout="3" playBeep="false" finishOnKey=""/>' +
        "</Response>",
    );
  });

  it("escapes anything that could break the XML", () => {
    expect(play('x"><Hangup/>&')).toBe("<Play>x&quot;&gt;&lt;Hangup/&gt;&amp;</Play>");
    expect(redirect("https://x.test/?a=1&b=<2>")).toContain("a=1&amp;b=&lt;2&gt;");
    expect(gather({ action: 'a"b', timeout: 5 })).toContain('action="a&quot;b"');
  });

  it("ends a call with a hangup", () => {
    expect(response(play("https://x.test/c.mp3"), hangup())).toContain("<Hangup/></Response>");
  });
});
