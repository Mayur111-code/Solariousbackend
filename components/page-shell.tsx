import type { ReactNode } from "react";
import InnerPageHero, { type PublicHeroProps } from "@/components/inner-page-hero";
import { DEFAULT_PUBLIC_HERO_IMAGE } from "@/lib/public-hero";

type PageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
} & Omit<Partial<PublicHeroProps>, "eyebrow" | "title" | "description" | "children">;

export default function PageShell({
  eyebrow,
  title,
  intro,
  image = DEFAULT_PUBLIC_HERO_IMAGE,
  children,
  ...hero
}: PageShellProps) {
  return (
    <main>
      <InnerPageHero
        {...hero}
        eyebrow={eyebrow}
        title={title}
        description={intro}
        image={image}
      />
      {children}
    </main>
  );
}
