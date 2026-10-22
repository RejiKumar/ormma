import { useState } from "react";
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { fontFamilyFor } from "../design/fonts";
import { Icon } from "./Icon";

export interface TextFieldProps {
  /** Visible label and accessible name. Pass text from the i18n catalogue. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Validation or server error shown under the field. Pass text from the i18n catalogue. */
  error?: string;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: TextInputProps["autoCorrect"];
  maxLength?: number;
  editable?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  testID?: string;
}

/**
 * Labelled text input. Validation errors are shown in ink with an icon, never in coral
 * (coral is reserved for the missed status and urgent alerts).
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  keyboardType,
  autoComplete,
  textContentType,
  autoCapitalize,
  autoCorrect,
  maxLength,
  editable = true,
  returnKeyType,
  onSubmitEditing,
  testID,
}: TextFieldProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [focused, setFocused] = useState(false);
  const borderColor = error && !focused ? c.ink : focused ? c.focus : c.border;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="label" testID={testID ? `${testID}-label` : undefined}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.inkMuted}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        textContentType={textContentType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        editable={editable}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testID}
        style={{
          minHeight: 56,
          borderRadius: theme.radius.lg,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: c.surface,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          fontSize: theme.typeScale.bodyLarge.size,
          color: c.ink,
          fontFamily: fontFamilyFor("latin", "400"),
        }}
      />
      {hint && !error ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
      {error ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", gap: theme.spacing.xs, alignItems: "center" }}
        >
          <Icon name="xCircle" color={c.ink} size={16} />
          <Text variant="bodyStrong" style={{ color: c.ink, flexShrink: 1 }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
