import { DEFAULT_COUNTRY_CODE, INDIA_MOBILE_DIGITS, nextIndiaDigits } from "../utils/phone";
import { TextField } from "./TextField";

export interface PhoneFieldProps {
  label: string;
  /** The 10 digits typed so far, without +91. */
  value: string;
  onChangeValue: (digits: string) => void;
  error?: string;
  editable?: boolean;
  returnKeyType?: "done" | "next" | "go";
  onSubmitEditing?: () => void;
  testID?: string;
}

/** Indian mobile number field: a fixed +91 prefix and exactly 10 digits. */
export function PhoneField({ label, value, onChangeValue, error, editable, returnKeyType, onSubmitEditing, testID }: PhoneFieldProps) {
  return (
    <TextField
      testID={testID}
      label={label}
      prefix={DEFAULT_COUNTRY_CODE}
      value={value}
      onChangeText={(text) => onChangeValue(nextIndiaDigits(value, text))}
      keyboardType="phone-pad"
      autoComplete="tel"
      textContentType="telephoneNumber"
      autoCapitalize="none"
      maxLength={INDIA_MOBILE_DIGITS + 6}
      error={error}
      editable={editable}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
    />
  );
}
