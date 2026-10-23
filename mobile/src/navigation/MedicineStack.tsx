import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { Medicine } from "../family/useMedicines";
import { AddMedicineScreen } from "../screens/medicines/AddMedicineScreen";
import { EditMedicineScreen } from "../screens/medicines/EditMedicineScreen";
import { MedicinesListScreen } from "../screens/medicines/MedicinesListScreen";

export type MedicineStackParamList = {
  MedicinesList: undefined;
  AddMedicine: { parentId: string };
  EditMedicine: { parentId: string; medicine: Medicine };
};

const Stack = createNativeStackNavigator<MedicineStackParamList>();

/** Medicines tab: the per-parent list plus the add and edit screens. */
export function MedicineStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator>
      <Stack.Screen name="MedicinesList" component={MedicinesListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddMedicine"
        component={AddMedicineScreen}
        options={{ title: t("screens.medicines.addTitle") }}
      />
      <Stack.Screen
        name="EditMedicine"
        component={EditMedicineScreen}
        options={{ title: t("screens.medicines.editTitle") }}
      />
    </Stack.Navigator>
  );
}
