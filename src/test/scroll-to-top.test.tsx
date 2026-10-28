import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";

/**
 * ScrollToTop (W1 sweep, 2026-10-28): fresh navigations must land at the
 * top of the new page on EVERY scroll container this app uses — the
 * window, <body> (the document scroller here), and the app shell's
 * <main id="main-content">. Hash anchors scroll to their target instead,
 * and POP (Back/Forward) is left to native restoration.
 */

function setScroll(el: Element, value: number) {
  Object.defineProperty(el, "scrollTop", {
    value,
    writable: true,
    configurable: true,
  });
  // jsdom's Element.scrollTo is a not-implemented stub; give the element a
  // faithful one that honours the options object the component passes.
  Object.defineProperty(el, "scrollTo", {
    value: (opts: { top?: number }) => {
      (el as HTMLElement).scrollTop = opts?.top ?? 0;
    },
    writable: true,
    configurable: true,
  });
}

function NavButtons() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate("/b")}>go-b</button>
      <button onClick={() => navigate("/b#anchor-x")}>go-hash</button>
      <button onClick={() => navigate(-1)}>go-back</button>
    </>
  );
}

function Harness() {
  return (
    <>
      <ScrollToTop />
      <NavButtons />
      <main id="main-content">
        <div id="anchor-x">anchor target</div>
        <Routes>
          <Route path="/a" element={<div>page a</div>} />
          <Route path="/b" element={<div>page b</div>} />
        </Routes>
      </main>
    </>
  );
}

describe("ScrollToTop", () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;
  let intoViewSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    intoViewSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: intoViewSpy,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resets window, body and main scroll on a fresh navigation", () => {
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Harness />
      </MemoryRouter>,
    );
    const main = document.querySelector("main")!;
    setScroll(document.documentElement, 300);
    setScroll(document.body, 640);
    setScroll(main, 880);

    fireEvent.click(screen.getByText("go-b"));

    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, behavior: "instant" }),
    );
    expect(document.body.scrollTop).toBe(0);
    expect(main.scrollTop).toBe(0);
    expect(screen.getByText("page b")).toBeInTheDocument();
  });

  it("scrolls to the hash anchor instead of the top when the target exists", () => {
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Harness />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("go-hash"));
    expect(intoViewSpy).toHaveBeenCalled();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("does not reset scroll on POP (browser Back) — native restoration owns it", () => {
    render(
      <MemoryRouter initialEntries={["/a", "/b"]} initialIndex={1}>
        <Harness />
      </MemoryRouter>,
    );
    const main = document.querySelector("main")!;
    setScroll(main, 432);
    scrollToSpy.mockClear();

    fireEvent.click(screen.getByText("go-back"));

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(main.scrollTop).toBe(432);
  });
});
