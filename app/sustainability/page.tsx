import type { Metadata } from "next";
import SectionPage from "@/components/section-page";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import { pageContent } from "@/data/site";

export const metadata: Metadata = {
  title: "Sustainability",
  description: "Explore Solarious Energy's approach to responsible manufacturing and long-life solar solutions.",
};

export default function Page() {
  return <SectionPage content={pageContent.sustainability} {...PUBLIC_HERO_PRESETS.sustainability} />;
}
