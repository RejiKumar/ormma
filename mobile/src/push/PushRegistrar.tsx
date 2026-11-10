import { usePushRegistration } from "../family/usePushRegistration";
import { PushBanner } from "./PushBanner";
import { usePushMessages } from "./usePushMessages";

/** Registers the device for push, shows a banner for a message that arrives while the app is open, and opens the right tab on a tap. */
export function PushRegistrar() {
  usePushRegistration();
  const { banner, dismiss, open } = usePushMessages();
  return <PushBanner banner={banner} onOpen={open} onDismiss={dismiss} />;
}
