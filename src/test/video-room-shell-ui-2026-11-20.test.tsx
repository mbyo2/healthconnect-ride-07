import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { VideoRoom } from "@/components/video/VideoRoom";

// Behavioural proof for the Zoom-parity in-call shell (2026-11-20).
// The live two-party browser proof cannot reach Daily's joined state
// from the build VM (no WebRTC egress — Daily's own error card shows
// inside the iframe), so the app-shell UI that renders after
// 'joined-meeting' is proven here against a mocked Daily frame:
// connection chip + weak-network adaptation, Speaker/Gallery toggle,
// app-message chat with unread badge, visit info with live stats,
// background blur wiring, and the presence waiting room.

type Handler = (e: any) => void;

const handlers = new Map<string, Handler[]>();
const frame = {
  on: vi.fn((event: string, cb: Handler) => {
    const list = handlers.get(event) || [];
    list.push(cb);
    handlers.set(event, list);
  }),
  join: vi.fn(async () => ({})),
  leave: vi.fn(),
  destroy: vi.fn(),
  setLocalAudio: vi.fn(),
  setLocalVideo: vi.fn(),
  startScreenShare: vi.fn(async () => {}),
  stopScreenShare: vi.fn(async () => {}),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  updateReceiveSettings: vi.fn(),
  updateInputSettings: vi.fn(async () => ({})),
  updateSendSettings: vi.fn(async () => ({})),
  setActiveSpeakerMode: vi.fn(),
  sendAppMessage: vi.fn(),
  getNetworkStats: vi.fn(async () => ({
    networkState: "good",
    stats: {
      latest: {
        networkRoundTripTime: 0.082,
        sendBitsPerSecond: 1_400_000,
        recvBitsPerSecond: 2_100_000,
      },
    },
  })),
};
const createFrame = vi.fn(() => frame);

vi.mock("@daily-co/daily-js", () => ({
  default: { createFrame: (...args: any[]) => createFrame(...args) },
}));

// Presence (waiting room) — mutable so tests can land the provider.
let presence: Record<string, any[]> = {};
let presenceSync: (() => void) | null = null;
const channel = {
  on: vi.fn((type: string, filter: any, cb: () => void) => {
    if (type === "presence") presenceSync = cb;
    return channel;
  }),
  subscribe: vi.fn((cb: (status: string) => void) => {
    cb("SUBSCRIBED");
    return channel;
  }),
  track: vi.fn(async () => ({})),
  presenceState: vi.fn(() => presence),
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  },
}));

const fire = (event: string, payload: any = {}) =>
  act(() => {
    for (const cb of handlers.get(event) || []) cb(payload);
  });

const baseProps = {
  roomUrl: "https://doc0clock.daily.co/consultation-test",
  userName: "QA Zoom Provider",
  meetingToken: "token-123",
  consultationId: "consult-1",
  onLeave: vi.fn(),
};

beforeEach(() => {
  handlers.clear();
  presence = {};
  presenceSync = null;
  vi.clearAllMocks();
  // clearAllMocks drops the implementations set at creation; restore.
  frame.on.mockImplementation((event: string, cb: Handler) => {
    const list = handlers.get(event) || [];
    list.push(cb);
    handlers.set(event, list);
  });
  frame.join.mockImplementation(async () => ({}));
  frame.updateInputSettings.mockImplementation(async () => ({}));
  frame.getNetworkStats.mockImplementation(async () => ({
    networkState: "good",
    stats: {
      latest: {
        networkRoundTripTime: 0.082,
        sendBitsPerSecond: 1_400_000,
        recvBitsPerSecond: 2_100_000,
      },
    },
  }));
  channel.on.mockImplementation((type: string, filter: any, cb: () => void) => {
    if (type === "presence") presenceSync = cb;
    return channel;
  });
  channel.subscribe.mockImplementation((cb: (s: string) => void) => {
    cb("SUBSCRIBED");
    return channel;
  });
  channel.presenceState.mockImplementation(() => presence);
  createFrame.mockImplementation(() => frame);
});

describe("VideoRoom — join configuration", () => {
  it("creates the frame with HD capture, adaptive layers and app theme", () => {
    render(<VideoRoom {...baseProps} isProvider onEndMeeting={vi.fn()} />);
    expect(createFrame).toHaveBeenCalledTimes(1);
    const opts = (createFrame.mock.calls[0] as any[])[1];
    expect(opts.token).toBe("token-123");
    expect(opts.activeSpeakerMode).toBe(true);
    expect(opts.sendSettings.video.allowAdaptiveLayers).toBe(true);
    expect(opts.sendSettings.video.maxQuality).toBe("high");
    expect(opts.sendSettings.screenVideo).toBe("detail-optimized");
    expect(opts.inputSettings.video.settings.width).toEqual({ ideal: 1280, max: 1920 });
    expect(opts.inputSettings.audio.settings.echoCancellation).toBe(true);
    expect(opts.inputSettings.audio.settings.noiseSuppression).toBe(true);
    expect(opts.inputSettings.audio.settings.autoGainControl).toBe(true);
    expect(opts.theme.light.colors.accent).toBe("#003087");
    expect(opts.theme.dark.colors.accent).toBe("#FFC439");
    expect(frame.join).toHaveBeenCalled();
  });
});

describe("VideoRoom — in-call shell after joining", () => {
  const renderJoined = () => {
    const utils = render(<VideoRoom {...baseProps} isProvider peerName="QA Zoom Patient" onEndMeeting={vi.fn()} />);
    fire("joined-meeting");
    return utils;
  };

  it("shows the call bar: timer, participants, chat, info, layout toggle", () => {
    renderJoined();
    expect(screen.getByText(/in call/)).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Visit info")).toBeInTheDocument();
    expect(screen.getByText("Speaker")).toBeInTheDocument();
    expect(screen.getByText("Gallery")).toBeInTheDocument();
    expect(screen.getByText("Copy join link")).toBeInTheDocument();
  });

  it("layers noise cancellation on after join", () => {
    renderJoined();
    expect(frame.updateInputSettings).toHaveBeenCalledWith({
      audio: { processor: { type: "noise-cancellation" } },
    });
  });

  it("connection chip follows network events; weak state shows the plain-language banner", () => {
    renderJoined();
    fire("network-quality-change", { networkState: "good" });
    expect(screen.getByText("Good")).toBeInTheDocument();
    fire("network-quality-change", { networkState: "bad" });
    expect(screen.getByText("Weak")).toBeInTheDocument();
    expect(screen.getByText(/Your connection is weak/)).toBeInTheDocument();
  });

  it("in auto mode a bad network steps the capture profile down", async () => {
    renderJoined();
    frame.updateInputSettings.mockClear();
    fire("network-quality-change", { networkState: "bad" });
    // adaptation is throttled by design; the first bad event after
    // mount adapts immediately (lastAdapt starts at 0).
    await waitFor(() => {
      expect(frame.updateInputSettings).toHaveBeenCalledWith({
        video: { settings: expect.objectContaining({ width: { ideal: 854, max: 1280 } }) },
      });
    });
  });

  it("layout toggle drives setActiveSpeakerMode", () => {
    renderJoined();
    fireEvent.click(screen.getByText("Gallery"));
    expect(frame.setActiveSpeakerMode).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByText("Speaker"));
    expect(frame.setActiveSpeakerMode).toHaveBeenCalledWith(true);
  });

  it("chat: sends over app-messages, renders both ways, badges unread", async () => {
    renderJoined();
    fireEvent.click(screen.getByText("Chat"));
    expect(screen.getByText(/aren't saved/)).toBeInTheDocument();
    const input = screen.getByLabelText("Chat message");
    fireEvent.change(input, { target: { value: "Hello from the test" } });
    fireEvent.click(screen.getByLabelText("Send message"));
    expect(frame.sendAppMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "dococlock-chat", text: "Hello from the test" }),
      "*"
    );
    expect(screen.getByText("Hello from the test")).toBeInTheDocument();

    // Close the panel, then a peer message arrives -> unread badge.
    fireEvent.click(screen.getByLabelText("Close chat"));
    fire("app-message", {
      fromId: "peer-1",
      data: { kind: "dococlock-chat", text: "Peer reply", name: "QA Zoom Patient", ts: Date.now() },
    });
    const chatBtn = screen.getByText("Chat").closest("button")!;
    expect(chatBtn.textContent).toContain("1");
    fireEvent.click(screen.getByText("Chat"));
    expect(screen.getByText("Peer reply")).toBeInTheDocument();
  });

  it("ignores app-messages that are not chat", () => {
    renderJoined();
    fireEvent.click(screen.getByText("Chat"));
    fire("app-message", { fromId: "x", data: { kind: "something-else", text: "nope" } });
    expect(screen.queryByText("nope")).not.toBeInTheDocument();
  });

  it("visit info panel shows peer, connection and live stats", async () => {
    renderJoined();
    fireEvent.click(screen.getByText("Visit info"));
    expect(screen.getByText("QA Zoom Patient")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/2\.1 Mbps/)).toBeInTheDocument();
      expect(screen.getByText(/82 ms/)).toBeInTheDocument();
    });
  });

  it("background blur toggles the Daily video processor", async () => {
    renderJoined();
    fireEvent.click(screen.getByLabelText("Blur my background"));
    await waitFor(() => {
      expect(frame.updateInputSettings).toHaveBeenCalledWith({
        video: { processor: { type: "background-blur", config: { strength: 0.7 } } },
      });
    });
  });

  it("participant events drive the in-call count", () => {
    renderJoined();
    fire("participant-joined", {
      participants: {
        a: { session_id: "a", user_name: "QA Zoom Provider", local: true },
        b: { session_id: "b", user_name: "QA Zoom Patient" },
      },
    });
    expect(screen.getByText("2 in call")).toBeInTheDocument();
  });
});

describe("VideoRoom — waiting room (patient side)", () => {
  it("holds the patient in the waiting state until the provider's presence lands", () => {
    presence = { "patient-x": [{ role: "patient", name: "QA Zoom Patient" }] };
    render(
      <VideoRoom
        {...baseProps}
        userName="QA Zoom Patient"
        isProvider={false}
        peerName={undefined}
      />
    );
    expect(screen.getByText(/to start the visit/)).toBeInTheDocument();
    expect(createFrame).not.toHaveBeenCalled();

    // Provider arrives -> presence sync -> the frame is created.
    presence = {
      "patient-x": [{ role: "patient", name: "QA Zoom Patient" }],
      "provider-y": [{ role: "provider", name: "QA Zoom Provider" }],
    };
    act(() => {
      presenceSync && presenceSync();
    });
    expect(createFrame).toHaveBeenCalledTimes(1);
  });
});
