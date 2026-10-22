import AsyncStorage from "@react-native-async-storage/async-storage";
import { addParentId, readParentIds } from "./parentIds";

describe("parentIds", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("starts empty on a fresh device", async () => {
    expect(await readParentIds()).toEqual([]);
  });

  it("stores an id and reads it back in order", async () => {
    await addParentId("p2");
    await addParentId("p1");
    expect(await readParentIds()).toEqual(["p2", "p1"]);
  });

  it("de-duplicates repeats", async () => {
    await addParentId("p1");
    await addParentId("p1");
    expect(await readParentIds()).toEqual(["p1"]);
  });

  it("returns [] when the stored value is not an array", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify({ nope: true }));
    expect(await readParentIds()).toEqual([]);
  });

  it("filters out non-string and empty entries", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1", 42, "", null, "p2"]));
    expect(await readParentIds()).toEqual(["p1", "p2"]);
  });

  it("returns [] on corrupt JSON", async () => {
    await AsyncStorage.setItem("ormma.parentIds", "{not json");
    expect(await readParentIds()).toEqual([]);
  });
});
