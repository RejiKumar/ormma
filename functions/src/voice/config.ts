import { defineSecret } from "firebase-functions/params";
import { ensureAdminApp } from "../db";
import { GoogleTtsClient, PromptAudioService, StorageAudioStore } from "./tts";

export const GOOGLE_TTS_API_KEY = defineSecret("GOOGLE_TTS_API_KEY");
export const VOICE_PROMPT_TOKEN = defineSecret("VOICE_PROMPT_TOKEN");
export const VOICE_AUDIO_BASE_URL = defineSecret("VOICE_AUDIO_BASE_URL");

export const VOICE_SECRETS = [GOOGLE_TTS_API_KEY, VOICE_PROMPT_TOKEN, VOICE_AUDIO_BASE_URL];
export const VOICE_AUDIO_SECRETS = [VOICE_PROMPT_TOKEN];

/** Null when TTS is not configured, so the endpoint can answer with a code instead of crashing. */
export function createPromptAudioService(
  env: NodeJS.ProcessEnv = process.env,
): PromptAudioService | null {
  const apiKey = env.GOOGLE_TTS_API_KEY;
  if (!apiKey) return null;
  ensureAdminApp();
  return new PromptAudioService(new GoogleTtsClient(apiKey), new StorageAudioStore());
}
