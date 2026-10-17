/**
 * Builder regression test — published renderer must cover all 24 builder
 * section types (builder-shape keys) without breaking legacy business-template
 * shapes or the index-based anchor scheme.
 */
import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import SectionRenderer, { resolveCtaTarget, firstProductsIndex } from "@/components/showroom/SectionRenderer";

const builderSections = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../test/qa-t21-sections.json"), "utf8")
);

// Distinctive visible text expected per builder section type.
const EXPECTED: Record<string, string> = {
  hero: "Renderer QA",
  about: "Builder-shape about section with description.",
  items: "299 ETB",
  gallery: "Photo A",
  services: "Web Design",
  testimonials: "Everything renders!",
  contact: "qa@nodbusiness.app",
  social: "Telegram",
  pricing: "999 ETB",
  team: "Alex Rivera",
  faq: "Does it render?",
  features: "Built for speed",
  stats: "5,000+",
  portfolio: "Client Co",
  newsletter: "Subscribe",
  video: "QA Video",
  map: "Bole Road, Addis Ababa",
  cta: "Ready to get started?",
  process: "Discover",
  booking: "Schedule your session",
  caseStudies: "300% increase in sales",
  partners: "Long-time partner",
  awards: "Best Business 2024",
  industries: "Healthcare",
};

describe("SectionRenderer — all 24 builder section types", () => {
  it("renders builder-shape content for every registered type", () => {
    expect(builderSections.length).toBe(24);
    builderSections.forEach((section: any, i: number) => {
      const { container } = render(
        <SectionRenderer section={section} sectionIndex={i} themeColor="#7C3AED" profile={{}} />
      );
      const text = container.textContent || "";
      const expected = EXPECTED[section.type];
      expect(text, `type=${section.type} should render "${expected}"`).toContain(expected);
      if (section.type === "newsletter") {
        const emailInput = container.querySelector('input[type="email"]');
        expect(emailInput, "newsletter must render email capture input").toBeTruthy();
        expect(emailInput?.getAttribute("placeholder")).toBe("Enter your email");
      }
      // Anchor scheme: every wrapper carries the index-based id.
      expect(container.querySelector(`#section-${i}`), `type=${section.type} missing #section-${i}`).toBeTruthy();
    });
  });

  it("emits semantic anchors: contact alias + hero CTA targeting", () => {
    const contactIdx = builderSections.findIndex((s: any) => s.type === "contact");
    const { container } = render(
      <SectionRenderer section={builderSections[contactIdx]} sectionIndex={contactIdx} profile={{}} />
    );
    expect(container.querySelector("#section-contact")).toBeTruthy();

    // No catalogue: the first menu, services, items or price list section.
    const firstOfferIdx = builderSections.findIndex((s: any) => ["menu", "services", "items", "pricing"].includes(s.type));
    expect(resolveCtaTarget(builderSections)).toBe(`#section-${firstOfferIdx}`);
    expect(firstProductsIndex(builderSections)).toBe(-1);
  });

  it("renders products section with semantic alias only when primary", () => {
    const primary = render(
      <SectionRenderer section={{ type: "products", title: "Shop" }} sectionIndex={2} products={[]} isPrimaryProducts />
    );
    expect(primary.container.querySelector("#section-products")).toBeTruthy();
    const secondary = render(
      <SectionRenderer section={{ type: "products", title: "Shop" }} sectionIndex={3} products={[]} isPrimaryProducts={false} />
    );
    expect(secondary.container.querySelector("#section-products")).toBeNull();
    expect(resolveCtaTarget([{ type: "hero" }, { type: "products" }])).toBe("#section-1");
    expect(resolveCtaTarget([{ type: "hero" }, { type: "menu" }])).toBe("#section-1");
    // A main button with words never disappears: it falls back to the contact block every site has.
    expect(resolveCtaTarget([{ type: "hero" }])).toBe("#section-contact");
    expect(resolveCtaTarget([{ type: "hero" }, { type: "inventory_catalog" }])).toBe("#section-1");
  });
});

describe("SectionRenderer — legacy business-template shapes unchanged", () => {
  it("renders legacy keys (title/items/content) for shared types", () => {
    const legacy = [
      { type: "about", title: "Our Story", content: "Legacy about content" },
      { type: "services", title: "Menu", items: [{ name: "Macchiato", description: "Coffee drink", price: "35 ETB" }] },
      { type: "features", title: "Process", items: [{ title: "Brew", desc: "We brew fresh" }] },
      { type: "testimonials", title: "Reviews", items: [{ text: "Great coffee!", name: "Abebe" }] },
      { type: "faq", title: "FAQ", items: [{ question: "Open Sundays?", answer: "Yes" }] },
      { type: "instructor", title: "Your Instructor" },
    ];
    legacy.forEach((section: any, i: number) => {
      const { container } = render(
        <SectionRenderer section={section} sectionIndex={i} profile={{ business_name: "Tomoca" }} />
      );
      const text = container.textContent || "";
      expect(text, `legacy ${section.type}`).toContain(section.title);
    });
    const svc = render(<SectionRenderer section={legacy[1]} sectionIndex={1} profile={{}} />);
    expect(svc.container.textContent).toContain("Macchiato");
    expect(svc.container.textContent).toContain("35 ETB");
    const testi = render(<SectionRenderer section={legacy[3]} sectionIndex={3} profile={{}} />);
    expect(testi.container.textContent).toContain("Great coffee!");
    expect(testi.container.textContent).toContain("Abebe");
  });
});
