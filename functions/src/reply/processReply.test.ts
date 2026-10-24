import type { Firestore } from "firebase-admin/firestore";
import { createUrgentAlert } from "../alerts/createAlert";
import { structureReply } from "./replyStructuring";
import { processReply } from "./processReply";

jest.mock("./replyStructuring");
jest.mock("../alerts/createAlert");

const structureReplyMock = structureReply as jest.MockedFunction<typeof structureReply>;
const createUrgentAlertMock = createUrgentAlert as jest.MockedFunction<typeof createUrgentAlert>;

const db = {} as Firestore;
const sender = { sendMulticast: jest.fn() };
const client = { complete: jest.fn() };

describe("processReply orchestration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createUrgentAlertMock.mockResolvedValue("alert_urgent");
  });

  it("creates the urgent alert before calling the model when a keyword matches", async () => {
    const urgent = jest.fn();
    structureReplyMock.mockImplementation(async (_input, opts) => {
      if (opts?.onUrgentKeyword) await opts.onUrgentKeyword("help");
      return {
        tookMedicine: null,
        readings: [],
        symptoms: [],
        confirmationNote: null,
        urgent: true,
        confidence: null,
        language: "en-IN",
        needsReview: true,
        reviewReasons: ["invalid_output"],
        canApplyDoseStatus: false,
        promptVersion: "reply-structuring-v1",
        urgentSource: "keyword",
      } as any;
    });

    await processReply({
      db,
      parentId: "p1",
      parentName: "Amma",
      language: "en-IN",
      question: "dose_confirmation",
      eventIds: ["e1"],
      transcript: "help me",
      sender: sender as any,
      client: client as any,
    });

    expect(structureReplyMock).toHaveBeenCalledTimes(1);
    expect(createUrgentAlertMock).toHaveBeenCalledTimes(1);
    expect(createUrgentAlertMock.mock.calls[0][0]).toBe(db);
    expect(createUrgentAlertMock.mock.calls[0][1]).toBe("p1");
    expect(createUrgentAlertMock.mock.calls[0][2]).toBe("Amma");
    expect(createUrgentAlertMock.mock.calls[0][3]).toBe("e1");
  });

  it("creates the urgent alert if the model marks it urgent but the keyword missed nothing", async () => {
    structureReplyMock.mockResolvedValue({
      tookMedicine: null,
      readings: [],
      symptoms: [],
      confirmationNote: null,
      urgent: true,
      confidence: 0.9,
      language: "en-IN",
      needsReview: false,
      reviewReasons: [],
      canApplyDoseStatus: false,
      promptVersion: "reply-structuring-v1",
      urgentSource: "model",
    } as any);

    await processReply({
      db,
      parentId: "p1",
      parentName: "Amma",
      language: "en-IN",
      question: "dose_confirmation",
      eventIds: [],
      transcript: "something",
      sender: sender as any,
      client: client as any,
    });

    expect(createUrgentAlertMock).toHaveBeenCalledTimes(1);
  });
});
