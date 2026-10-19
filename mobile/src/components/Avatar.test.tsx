import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { darkColors, lightColors } from "../design/tokens";
import { renderApp } from "../test-utils";
import { Avatar, hashName, initialsOf } from "./Avatar";

describe("initialsOf", () => {
  it("takes the first letter of up to two words, uppercased", () => {
    expect(initialsOf("amma kumar")).toBe("AK");
    expect(initialsOf("Amma")).toBe("A");
    expect(initialsOf("  Amma   Devi   Kumar ")).toBe("AD");
    expect(initialsOf("")).toBe("");
  });

  it("keeps Indic letters whole with their combining marks", () => {
    expect(initialsOf("അമ്മ")).toBe("അ");
    expect(initialsOf("மாலா தேவி")).toBe("மா" + "தே");
    expect(initialsOf("माँ")).toBe("माँ");
  });
});

describe("hashName", () => {
  it("is stable and differs between names", () => {
    expect(hashName("Amma")).toBe(hashName("Amma"));
    expect(hashName("Amma")).not.toBe(hashName("Appa"));
  });
});

describe("Avatar", () => {
  it("shows initials with the name as its accessible label", async () => {
    await renderApp(<Avatar name="Amma Kumar" testID="a" />);
    expect(screen.getByText("AK")).toBeTruthy();
    expect(screen.getByLabelText("Amma Kumar")).toBeTruthy();
    expect(screen.getByTestId("a").props.accessibilityRole).toBe("image");
  });

  it("uses a palette tint that is stable for a name, and the dark palette in dark mode", async () => {
    await renderApp(<Avatar name="Amma" testID="a" />);
    const light = StyleSheet.flatten(screen.getByTestId("a").props.style).backgroundColor;
    expect(lightColors.avatars).toContain(light);
    await renderApp(<Avatar name="Amma" testID="a" />, { theme: "dark" });
    const dark = StyleSheet.flatten(screen.getByTestId("a").props.style).backgroundColor;
    expect(darkColors.avatars).toContain(dark);
  });

  it("never uses a status or coral colour", async () => {
    const forbidden = new Set<string>([
      ...Object.values(lightColors.status).flatMap((s) => [s.bg, s.fg, s.icon]),
      lightColors.urgent.bg,
      lightColors.urgent.fg,
    ]);
    for (const color of lightColors.avatars) expect(forbidden.has(color)).toBe(false);
  });

  it("is round and has the requested size", async () => {
    await renderApp(<Avatar name="Amma" size={64} testID="a" />);
    const s = StyleSheet.flatten(screen.getByTestId("a").props.style);
    expect(s.width).toBe(64);
    expect(s.borderRadius).toBe(32);
  });
});
