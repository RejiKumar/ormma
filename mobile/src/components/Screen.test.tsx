import { act, fireEvent, screen } from "@testing-library/react-native";
import { createRef } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { renderApp } from "../test-utils";
import { Icon } from "./Icon";
import { Screen } from "./Screen";
import { TextField } from "./TextField";

describe("Screen", () => {
  it("shows its content and the medical disclaimer", async () => {
    await renderApp(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.getByText("content")).toBeTruthy();
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
  });

  it("shows the disclaimer even when there is a primary action and when it does not scroll", async () => {
    await renderApp(
      <Screen scroll={false} primaryAction={<View testID="cta" />}>
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.getByTestId("cta")).toBeTruthy();
    expect(screen.getByTestId("disclaimer-footer")).toBeTruthy();
  });

  it("places the primary action in the bottom area, above the disclaimer", async () => {
    await renderApp(
      <Screen primaryAction={<View testID="cta" />}>
        <Text>content</Text>
      </Screen>,
    );
    const bottom = screen.getByTestId("screen-bottom");
    const kids = bottom.children as unknown as Array<{ props: { testID?: string } }>;
    expect(kids[0].props.testID).toBe("screen-primary-action");
    expect(kids[1].props.testID).toBe("disclaimer-footer");
    // and the content sits in the scrolling area, not in the bottom area
    expect(screen.getByTestId("screen-scroll")).toBeTruthy();
  });

  it("renders without a primary action slot when none is given", async () => {
    await renderApp(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.queryByTestId("screen-primary-action")).toBeNull();
  });
});

describe("Icon", () => {
  it("is hidden from screen readers unless it has a label", async () => {
    await renderApp(
      <>
        <Icon name="check" color="#000000" testID="deco" />
        <Icon name="check" color="#000000" accessibilityLabel="Done" testID="named" />
      </>,
    );
    expect(
      screen.getByTestId("deco", { includeHiddenElements: true }).props.accessibilityElementsHidden,
    ).toBe(true);
    expect(screen.getByTestId("named").props.accessibilityLabel).toBe("Done");
    expect(screen.getByTestId("named").props.accessible).toBe(true);
  });
  describe("keeps the field being typed in visible", () => {
    const scrollRef = createRef<React.ComponentRef<typeof ScrollView>>();

    /** The scroll area spans y 100..600; the focused input is placed at the given window y. */
    const arrange = async (inputY: number) => {
      const scrollTo = jest.fn();
      await renderApp(
        <Screen scrollRef={scrollRef}>
          <TextField testID="field" label="Name" value="" onChangeText={() => undefined} />
        </Screen>,
      );
      const scroller = scrollRef.current as unknown as { measureInWindow: unknown; scrollTo: unknown };
      scroller.measureInWindow = (cb: (x: number, y: number, w: number, h: number) => void) => cb(0, 100, 400, 500);
      scroller.scrollTo = scrollTo;
      jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
        measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(0, inputY, 300, 50),
      } as never);
      return scrollTo;
    };

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it("scrolls down when the focused field is below the visible area", async () => {
      const scrollTo = await arrange(700);
      await fireEvent(screen.getByTestId("field"), "focus");
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(scrollTo).toHaveBeenCalledTimes(1);
      // The field's bottom (750) must end up inside the area (bottom 600 less the margin of 24).
      expect(scrollTo.mock.calls[0][0].y).toBeGreaterThan(150);
    });

    it("does not scroll when the field is already visible", async () => {
      const scrollTo = await arrange(300);
      await fireEvent(screen.getByTestId("field"), "focus");
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(scrollTo).not.toHaveBeenCalled();
    });
  });
});
