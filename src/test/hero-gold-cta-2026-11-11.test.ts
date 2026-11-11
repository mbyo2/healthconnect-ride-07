import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// PATIENT HOME HERO — GOLD PRIMARY CTAs (classic PayPal shell follow-up,
// 2026-11-11). src/components/Hero.tsx is the patient Home hero (its only
// consumer is src/pages/Home.tsx). Its two primary CTAs — the hero search
// submit and "Get Started Free" — were the last signed-in primaries still
// filled blue: both are the shared Button primitive (whose default variant
// IS the classic gold pill: bg-gold / text-gold-ink / hover:bg-gold-deep)
// but carried the marketing utility `vf-btn-primary`
// (bg-primary-500 → #0066F5 blue) as an overriding className. Dropping the
// utility class restores the gold default; the hero's sizing classes stay.
// Blue remains where it belongs in this hero: link/accent text
// (text-primary-500 headline word, trust-bar icons) is untouched, and the
// paired "Sign In" secondary keeps its outline + vf-btn-secondary
// treatment. The vf-btn-primary utility definition itself stays in
// index.css — nothing else in the tree uses it after this change, but it
// is the shared marketing utility and stays available deliberately.

const read = (rel: string) =>
  readFileSync(resolve(__dirname, "..", rel), "utf-8");

describe("patient Home hero — gold primary CTAs (2026-11-11)", () => {
  const hero = read("components/Hero.tsx");

  it("no blue vf-btn-primary remains on the patient Home hero", () => {
    expect(hero).not.toContain("vf-btn-primary");
  });

  it("both hero primaries are the shared Button with its gold default variant", () => {
    // Search submit: no variant prop (= default gold), hero sizing kept.
    expect(hero).toContain(
      '<Button type="submit" size="lg" className="h-12 px-6">'
    );
    // Get Started Free: asChild Link button, gold default, sizing kept.
    expect(hero).toContain(
      '<Button asChild size="lg" className="flex-1 sm:flex-none h-12">'
    );
    expect(hero).toContain("Get Started Free");
    // The gold default variant itself is untouched.
    const button = read("components/ui/button.tsx");
    expect(button).toContain(
      'default: "bg-gold text-gold-ink font-semibold hover:bg-gold-deep"'
    );
  });

  it("the paired Sign In secondary and blue accents are unchanged", () => {
    expect(hero).toContain('variant="outline"');
    expect(hero).toContain("vf-btn-secondary");
    expect(hero).toContain("text-primary-500");
  });
});
