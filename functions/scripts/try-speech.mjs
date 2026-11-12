// Tries Google Text-to-Speech and Speech-to-Text with the real call prompts, without any phone call.
// For each language it speaks the check-in question, saves it as an MP3 you can play, then sends the
// same audio back to Speech-to-Text and prints what was heard.
//
// Run from the functions folder, after `npm run build`:
//   $env:GOOGLE_TTS_API_KEY = "<your key>"; $env:GOOGLE_STT_API_KEY = "<your key>"
//   node scripts/try-speech.mjs            (all four languages)
//   node scripts/try-speech.mjs hi-IN      (one language)
// The keys stay in your shell. Nothing is written to Firestore or Storage. Output goes to ./speech-test/.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { GoogleTtsClient } = require("../lib/functions/src/voice/tts.js");
const { GoogleSttClient } = require("../lib/functions/src/voice/stt.js");
const { buildScript } = require("../lib/functions/src/voice/templates.js");

const ttsKey = process.env.GOOGLE_TTS_API_KEY;
const sttKey = process.env.GOOGLE_STT_API_KEY;
if (!ttsKey || !sttKey) {
  console.error("Set GOOGLE_TTS_API_KEY and GOOGLE_STT_API_KEY first (see the top of this file).");
  process.exit(1);
}

const ALL = ["en-IN", "hi-IN", "ml-IN", "ta-IN"];
const languages = process.argv[2] ? [process.argv[2]] : ALL;
const out = path.resolve("speech-test");
fs.mkdirSync(out, { recursive: true });

const tts = new GoogleTtsClient(ttsKey);
const stt = new GoogleSttClient(sttKey);

let failed = 0;
for (const language of languages) {
  const text = buildScript(language, "question_single", { hour: 9 });
  process.stdout.write(`${language}  said: ${text}\n`);
  try {
    const audio = await tts.synthesize(text, language);
    const file = path.join(out, `${language}.mp3`);
    fs.writeFileSync(file, audio);
    console.log(`${language}  TTS ok: ${audio.length} bytes -> ${file}`);
  } catch (error) {
    failed += 1;
    console.log(`${language}  TTS FAILED: ${error.code ?? error.message}`);
    continue;
  }
  try {
    const audio = fs.readFileSync(path.join(out, `${language}.mp3`));
    const result = await stt.transcribe(audio, language);
    console.log(`${language}  STT ${result.status}${result.confidence != null ? ` (confidence ${result.confidence.toFixed(2)})` : ""}: ${result.transcript ?? ""}`);
    if (result.status === "empty") failed += 1;
  } catch (error) {
    failed += 1;
    console.log(`${language}  STT FAILED: ${error.code ?? error.message}`);
  }
}
console.log(failed === 0 ? "\nBoth services work for the languages tried." : `\n${failed} problem(s) above.`);
process.exit(failed === 0 ? 0 : 1);
