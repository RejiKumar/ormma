import { useAuth } from "../auth/AuthProvider";
import { ParentsProvider } from "../family/useParents";
import { WelcomeScreen } from "../onboarding/WelcomeScreen";
import { useWelcomeSeen } from "../onboarding/welcomeSeen";
import { AppTabs } from "./AppTabs";
import { AuthStack } from "./AuthStack";

/**
 * Signed out: the auth stack straight away. Signed in: the welcome intro the first time the user
 * reaches Today on this device, then the tabs.
 */
export function RootNavigator() {
  const { user, initialising } = useAuth();
  const { seen, markSeen } = useWelcomeSeen();
  if (initialising) return null;
  if (!user) return <AuthStack />;
  // Wait for the stored value so Today does not flash before the intro.
  if (seen === null) return null;
  if (!seen) return <WelcomeScreen onDone={markSeen} />;
  // One shared parents loader for every tab, instead of one per screen.
  return (
    <ParentsProvider>
      <AppTabs />
    </ParentsProvider>
  );
}
