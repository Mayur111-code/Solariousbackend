import type { Metadata } from "next";
import Link from "next/link";
import ToolPageShell from "@/components/tool-page-shell";
import { products } from "@/data/site";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";

export const metadata: Metadata = {
  title: "Compare Solar Module Technologies",
  description: "Compare Mono PERC, TOPCon, HJT and Bifacial solar module categories.",
};

const rows = [
  { name: "Technology", values: products.map((p) => p.technology) },
  { name: "Efficiency", values: products.map(() => "Confirm current series") },
  { name: "Power", values: products.map(() => "Confirm current series") },
  { name: "Bifacial capability", values: products.map((p) => p.bifacial) },
  { name: "Temperature behavior", values: products.map(() => "Product data required") },
  { name: "Application", values: products.map((p) => p.applications[0]) },
  { name: "Project type", values: products.map((p) => p.applications.join(", ")) },
];

export default function Page() {
  return (
    <ToolPageShell
      {...PUBLIC_HERO_PRESETS.compare}
      eyebrow="Approved category guidance"
      title="Compare Module Technologies"
      intro="A plain-language category comparison. Confirm every product-specific value with the Solarious technical team."
    >
      <section className="compare-wrap">
        <div className="compare-table" role="table" aria-label="Solar module technology comparison">
          <div className="compare-row compare-head" role="row">
            <span role="columnheader">Criteria</span>
            {products.map((x) => <strong role="columnheader" key={x.slug}>{x.name}</strong>)}
          </div>
          {rows.map((row) => (
            <div className="compare-row" role="row" key={row.name}>
              <span role="rowheader">{row.name}</span>
              {row.values.map((value, index) => <p role="cell" key={`${row.name}-${index}`}>{value}</p>)}
            </div>
          ))}
        </div>
        <div className="compare-cta">
          <p>No unverified efficiency, power or warranty values are displayed.</p>
          <Link className="button" href="/quote">Request confirmed specifications</Link>
        </div>
      </section>
    </ToolPageShell>
  );
}
