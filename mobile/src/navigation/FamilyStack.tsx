import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { AddParentScreen } from "../screens/family/AddParentScreen";
import { FamilyListScreen } from "../screens/family/FamilyListScreen";
import { InviteScreen } from "../screens/family/InviteScreen";
import { RedeemScreen } from "../screens/family/RedeemScreen";

export type FamilyStackParamList = {
  FamilyList: undefined;
  AddParent: undefined;
  Invite: { parentId: string; parentName: string };
  Redeem: undefined;
};

const Stack = createNativeStackNavigator<FamilyStackParamList>();

/** Family tab: the parents list plus the add-parent, invite and accept-invite screens. */
export function FamilyStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FamilyList"
        component={FamilyListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddParent"
        component={AddParentScreen}
        options={{ title: t("screens.addParent.title") }}
      />
      <Stack.Screen
        name="Invite"
        component={InviteScreen}
        options={{ title: t("screens.invite.title") }}
      />
      <Stack.Screen
        name="Redeem"
        component={RedeemScreen}
        options={{ title: t("screens.redeem.title") }}
      />
    </Stack.Navigator>
  );
}
