import InnerPageHero from "@/components/inner-page-hero";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";

export default function NotFound() {
  return (
    <main>
      <InnerPageHero
        {...PUBLIC_HERO_PRESETS.notFound}
        eyebrow="404"
        title="Page not found"
        description="The page may have moved or the address may be incorrect."
      />
    </main>
  );
}
