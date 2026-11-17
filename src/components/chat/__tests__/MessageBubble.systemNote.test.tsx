import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";
import { buildReminderNoteText } from "@/lib/chatSystemNote";
import type { Message } from "@/types/communication";

const base: Message = {
  id: "m1",
  content: "Hello",
  sender_id: "provider-1",
  receiver_id: "patient-1",
  created_at: new Date().toISOString(),
  read: false,
};

describe("MessageBubble system reminder notes", () => {
  it("renders a platform reminder as a centered system note, not a provider bubble", () => {
    const content = buildReminderNoteText({
      patientFirstName: "Mabvuto",
      providerFirstName: "Jane",
      providerLastName: "Mwila",
      providerRole: "doctor",
      facilityName: "Lusaka Clinic",
      dateLabel: "Tue 18 Nov 2026",
      timeLabel: "10:30",
    });
    const { container } = render(
      <MessageBubble message={{ ...base, content }} isMine={false} />,
    );
    const note = screen.getByRole("note", { name: "System reminder" });
    expect(note).toBeInTheDocument();
    // Centered system styling, not the sided incoming bubble.
    expect(note.className).toContain("justify-center");
    // Machine marker is stripped from display; human label is shown.
    expect(note.textContent).not.toContain("[Doc'O Clock reminder]");
    expect(screen.getByText("Doc'O Clock reminder")).toBeInTheDocument();
    expect(note.textContent).toContain("you have an appointment with Dr. Jane Mwila");
    // No read/sent ticks on a system note.
    expect(container.querySelector('[aria-label="Read"], [aria-label="Sent"]')).toBeNull();
  });

  it("renders an ordinary provider message unchanged (left bubble)", () => {
    const { container } = render(
      <MessageBubble message={{ ...base, content: "See you tomorrow" }} isMine={false} />,
    );
    expect(screen.queryByRole("note")).toBeNull();
    expect(container.textContent).toContain("See you tomorrow");
  });

  it("does not treat a user message that merely mentions reminders as a system note", () => {
    const { container } = render(
      <MessageBubble
        message={{ ...base, content: "Thanks for the Doc'O Clock reminder yesterday" }}
        isMine={false}
      />,
    );
    expect(screen.queryByRole("note")).toBeNull();
    expect(container.textContent).toContain("Thanks for the Doc'O Clock reminder");
  });
});
