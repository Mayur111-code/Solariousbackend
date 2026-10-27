import type { ReactNode } from "react";
import InnerPageHero, { type PublicHeroProps } from "@/components/inner-page-hero";
import { DEFAULT_PUBLIC_HERO_IMAGE } from "@/lib/public-hero";

type ToolPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
} & Omit<Partial<PublicHeroProps>, "eyebrow" | "title" | "description" | "children">;

export default function ToolPageShell({
  eyebrow,
  title,
  intro,
  image = DEFAULT_PUBLIC_HERO_IMAGE,
  compact = true,
  overlay = "strong",
  children,
  ...hero
}: ToolPageShellProps) {
  return (
    <main className="tool-page">
      <InnerPageHero
        {...hero}
        eyebrow={eyebrow}
        title={title}
        description={intro}
        image={image}
        compact={compact}
        overlay={overlay}
      />
      {children}
    </main>
  );
}
