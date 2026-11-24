import { describe, it, expect, beforeAll } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandList, CommandItem } from "@/components/ui/command";

/**
 * Dropdown viewport-overflow fix (CEO report, 2026-11-24): long dropdown
 * lists (roles, professions) rendered past the screen edge with no way to
 * scroll them — options were unreachable. Every shared floating-list
 * surface must cap its height at the space Popper measures as available
 * in the viewport and scroll internally, so every option stays reachable
 * on phone heights and desktop alike. These tests pin that contract on
 * the shared components (the harness-rendered proof lives with the fix's
 * mission report; jsdom has no layout, so classes are the pin here).
 */

beforeAll(() => {
  // jsdom gaps Radix needs when a layer mounts.
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {};
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
  if (!("ResizeObserver" in window)) {
    (window as unknown as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const AVAILABLE_HEIGHT = /max-h-\[var\(--radix-[a-z-]+-content-available-height\)\]/;

describe("shared dropdown surfaces stay inside the viewport and scroll", () => {
  it("Select content caps at the available height (not a fixed pixel height)", () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Assign role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="patient">Patient</SelectItem>
          <SelectItem value="courier">Courier</SelectItem>
        </SelectContent>
      </Select>
    );
    const content = screen.getByRole("listbox");
    expect(content.className).toMatch(
      /max-h-\[min\(24rem,var\(--radix-select-content-available-height\)\)\]/
    );
    expect(content.className).not.toMatch(/\bmax-h-96\b/);
  });

  it("DropdownMenu content caps at the available height and scrolls internally", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Roles</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Patient</DropdownMenuItem>
          <DropdownMenuItem>Courier</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const menu = screen.getByRole("menu");
    expect(menu.className).toMatch(AVAILABLE_HEIGHT);
    expect(menu.className).toMatch(/overflow-y-auto/);
  });

  it("ContextMenu content caps at the available height and scrolls internally", () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click zone</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Patient</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
    fireEvent.contextMenu(screen.getByText("Right-click zone"));
    const menu = screen.getByRole("menu");
    expect(menu.className).toMatch(AVAILABLE_HEIGHT);
    expect(menu.className).toMatch(/overflow-y-auto/);
  });

  it("Menubar content caps at the available height and scrolls internally", () => {
    render(
      <Menubar value="roles">
        <MenubarMenu value="roles">
          <MenubarTrigger>Roles</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Patient</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    );
    const menu = screen.getByRole("menu");
    expect(menu.className).toMatch(AVAILABLE_HEIGHT);
    expect(menu.className).toMatch(/overflow-y-auto/);
  });

  it("Popover content caps at the available height and scrolls internally", () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <p>A very long panel</p>
        </PopoverContent>
      </Popover>
    );
    const panel = screen.getByText("A very long panel").closest("div");
    expect(panel).not.toBeNull();
    expect(panel!.className).toMatch(AVAILABLE_HEIGHT);
    expect(panel!.className).toMatch(/overflow-y-auto/);
  });

  it("Command list caps at the smaller of 300px and 60dvh and scrolls", () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>Patient</CommandItem>
        </CommandList>
      </Command>
    );
    const list = screen.getByText("Patient").closest("[cmdk-list]");
    expect(list).not.toBeNull();
    expect((list as HTMLElement).className).toMatch(/max-h-\[min\(300px,60dvh\)\]/);
    expect((list as HTMLElement).className).toMatch(/overflow-y-auto/);
  });
});
