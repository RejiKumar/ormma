// Device-local record of parent ids this account knows about (ids only — never health data).
// Rules deny unfiltered parents lists, so the app queries parents by known ids (docs/DECISIONS.md).
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ormma.parentIds";

/** Parent ids stored on this device, in the order they were added. */
export async function readParentIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

/** Record a parent id (from createParent or redeemInvite), keeping the list de-duplicated. */
export async function addParentId(parentId: string): Promise<void> {
  const ids = await readParentIds();
  if (ids.includes(parentId)) return;
  await AsyncStorage.setItem(KEY, JSON.stringify([...ids, parentId]));
}
