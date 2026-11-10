import { View } from "react-native";
import { Illustration, type IllustrationName } from "../illustrations/Illustration";

export interface IllustrationFrameProps {
  name: IllustrationName;
  size?: number;
  /** Short description for screen readers. Omit to mark the illustration decorative. */
  description?: string;
  testID?: string;
}

/** Sets size and the accessibility of an illustration: a described image, or hidden when decorative. */
export function IllustrationFrame({ name, size = 160, description, testID }: IllustrationFrameProps) {
  return (
    <View
      testID={testID}
      accessible={description !== undefined}
      accessibilityRole={description !== undefined ? "image" : undefined}
      accessibilityLabel={description}
      accessibilityElementsHidden={description === undefined}
      importantForAccessibility={description !== undefined ? "yes" : "no-hide-descendants"}
      style={{ width: size, height: size, alignSelf: "center" }}
    >
      <Illustration name={name} size={size} />
    </View>
  );
}
