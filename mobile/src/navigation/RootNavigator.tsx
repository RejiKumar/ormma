import { useAuth } from "../auth/AuthProvider";
import { ParentsProvider } from "../family/useParents";
import { WelcomeScreen } from "../onboarding/WelcomeScreen";
import { useWelcomeSeen } from "../onboarding/welcomeSeen";
import { AppTabs } from "./AppTabs";
import { AuthStack } from "./AuthStack";

/**
 * Signed out: the welcome intro the first time on a device, then the auth stack. Signed in: the
 * existing tabs (the intro is never forced on a signed-in user).
 */
export function RootNavigator() {
  const { user, initialising } = useAuth();
  const { seen, markSeen } = useWelcomeSeen();
  if (initialising) return null;
  // One shared parents loader for every tab, instead of one per screen.
  if (user) {
    return (
      <ParentsProvider>
        <AppTabs />
      </ParentsProvider>
    );
  }
  // Wait for the stored value so sign-in does not flash before the intro.
  if (seen === null) return null;
  return seen ? <AuthStack /> : <WelcomeScreen onDone={markSeen} />;
}
