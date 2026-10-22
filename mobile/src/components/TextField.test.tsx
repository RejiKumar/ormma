import { fireEvent, screen } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import { TextField } from "./TextField";

const onChangeText = jest.fn();

describe("TextField", () => {
  beforeEach(() => onChangeText.mockReset());

  it("shows its label and value from props, with the label as the accessible name", async () => {
    await renderApp(
      <TextField label="Phone number" value="+91" onChangeText={onChangeText} testID="tf" />,
    );
    expect(screen.getByText("Phone number")).toBeTruthy();
    expect(screen.getByTestId("tf").props.value).toBe("+91");
    expect(screen.getByLabelText("Phone number")).toBeTruthy();
  });

  it("reports edits through onChangeText", async () => {
    await renderApp(<TextField label="Phone" value="" onChangeText={onChangeText} testID="tf" />);
    await fireEvent.changeText(screen.getByTestId("tf"), "+919876543210");
    expect(onChangeText).toHaveBeenCalledWith("+919876543210");
  });

  it("shows the error under the field", async () => {
    await renderApp(
      <TextField label="Phone" value="bad" onChangeText={onChangeText} error="Not valid" testID="tf" />,
    );
    expect(screen.getByText("Not valid")).toBeTruthy();
  });

  it("shows the hint only when there is no error", async () => {
    const { rerenderApp } = await renderApp(
      <TextField label="Phone" value="" onChangeText={onChangeText} hint="Hint text" testID="tf" />,
    );
    expect(screen.getByText("Hint text")).toBeTruthy();
    await rerenderApp(
      <TextField
        label="Phone"
        value=""
        onChangeText={onChangeText}
        hint="Hint text"
        error="Not valid"
        testID="tf"
      />,
    );
    expect(screen.getByText("Not valid")).toBeTruthy();
    expect(screen.queryByText("Hint text")).toBeNull();
  });

  it("respects editable false", async () => {
    await renderApp(
      <TextField label="Phone" value="" onChangeText={onChangeText} editable={false} testID="tf" />,
    );
    expect(screen.getByTestId("tf").props.editable).toBe(false);
  });
});
