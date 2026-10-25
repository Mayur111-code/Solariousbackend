"use client";

import { Download, FileText, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/data/site";

const text = (value: unknown) =>
  typeof value === "string" ? value : "Not documented";

export default function ProductSpecificationView({
  product,
}: {
  product: Product;
}) {
  const series = useMemo(() => product.series ?? [], [product.series]);
  const [construction, setConstruction] = useState<
    "All" | "Monofacial" | "Bifacial"
  >("All");
  const filtered = useMemo(
    () =>
      construction === "All"
        ? series
        : series.filter((item) => item.moduleType === construction),
    [construction, series],
  );
  const [selectedId, setSelectedId] = useState(series[0]?.id ?? "");
  const selected =
    filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const specifications = product.technicalSpecifications ?? {};
  const coefficients = specifications.temperatureCoefficients as
    Record<string, unknown> | undefined;

  if (!series.length)
    return (
      <section className="product-spec-empty">
        <h2>Technical specifications</h2>
        <p>
          Approved product-series data is not published yet. Request the current
          datasheet for confirmed values.
        </p>
      </section>
    );

  return (
    <>
      <section
        className="product-series-section"
        aria-labelledby="series-heading"
      >
        <div className="product-section-heading">
          <p className="eyebrow">Verified product variants</p>
          <h2 id="series-heading">Electrical characteristics</h2>
          <p>{text(specifications.testingConditions)}</p>
        </div>
        <div
          className="construction-filter"
          aria-label="Filter by module construction"
        >
          {(["All", "Monofacial", "Bifacial"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={construction === value ? "active" : ""}
              onClick={() => {
                setConstruction(value);
                const next =
                  value === "All"
                    ? series[0]
                    : series.find((item) => item.moduleType === value);
                setSelectedId(next?.id ?? "");
              }}
            >
              {value}
            </button>
          ))}
        </div>
        <label className="series-picker">
          Product series
          <select
            value={selected?.id ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {filtered.map((item) => (
              <option value={item.id} key={item.id}>
                {item.model} - {item.wattageRange}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <div className="series-card">
            <header>
              <div>
                <span>{selected.moduleType}</span>
                <h3>{selected.title}</h3>
                <p>{selected.model}</p>
              </div>
              <strong>{selected.wattageRange}</strong>
            </header>
            {selected.reviewNote && (
              <div className="spec-review-note" role="note">
                Manual review required: {selected.reviewNote}
              </div>
            )}
            <div className="spec-table-wrap">
              <table>
                <caption>STC electrical values for {selected.model}</caption>
                <thead>
                  <tr>
                    <th scope="col">Pmax (Wp)</th>
                    <th scope="col">Voc (V)</th>
                    <th scope="col">Isc (A)</th>
                    <th scope="col">Vmp (V)</th>
                    <th scope="col">Imp (A)</th>
                    <th scope="col">Efficiency (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.variants.map((item) => (
                    <tr key={item.power}>
                      <th scope="row">{item.power}</th>
                      <td>{item.voc}</td>
                      <td>{item.isc}</td>
                      <td>{item.vmp}</td>
                      <td>{item.imp}</td>
                      <td>{item.efficiency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected.bifacialGain && (
              <div className="bifacial-table">
                <h3>Rear-side gain assumptions</h3>
                <p>
                  Calculated output shown in the manufacturer sheet for the
                  stated gain assumptions. Actual gain depends on plant design
                  and site albedo.
                </p>
                <div className="spec-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Gain</th>
                        {selected.variants.map((item) => (
                          <th scope="col" key={item.power}>
                            {item.power} Wp
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selected.bifacialGain).map(
                        ([gain, values]) => (
                          <tr key={gain}>
                            <th scope="row">{gain}</th>
                            {values.map((value, index) => (
                              <td
                                key={`${gain}-${selected.variants[index].power}`}
                              >
                                {value}
                              </td>
                            ))}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      <section
        className="product-technical-grid"
        aria-label="Mechanical and operating specifications"
      >
        <article>
          <h2>Mechanical characteristics</h2>
          <dl>
            <div>
              <dt>Module</dt>
              <dd>{selected?.model}</dd>
            </div>
            <div>
              <dt>Construction</dt>
              <dd>{selected?.moduleType}</dd>
            </div>
            <div>
              <dt>Cells</dt>
              <dd>{selected?.cells}</dd>
            </div>
            <div>
              <dt>Dimensions</dt>
              <dd>{selected?.dimensions}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{selected?.weight}</dd>
            </div>
            <div>
              <dt>Front glass</dt>
              <dd>{text(specifications.frontGlass)}</dd>
            </div>
            <div>
              <dt>Frame</dt>
              <dd>{text(specifications.frame)}</dd>
            </div>
            <div>
              <dt>Junction box</dt>
              <dd>{text(specifications.junctionBox)}</dd>
            </div>
            <div>
              <dt>Cable</dt>
              <dd>{text(specifications.cable)}</dd>
            </div>
            <div>
              <dt>Connectors</dt>
              <dd>{text(specifications.connectors)}</dd>
            </div>
          </dl>
        </article>
        <article>
          <h2>Temperature &amp; operating conditions</h2>
          <dl>
            <div>
              <dt>Power tolerance</dt>
              <dd>{text(specifications.powerTolerance)}</dd>
            </div>
            <div>
              <dt>Temperature coefficient Voc</dt>
              <dd>{text(coefficients?.voc)}</dd>
            </div>
            <div>
              <dt>Temperature coefficient Isc</dt>
              <dd>{text(coefficients?.isc)}</dd>
            </div>
            <div>
              <dt>Temperature coefficient Pmax</dt>
              <dd>{text(coefficients?.pmax)}</dd>
            </div>
            <div>
              <dt>NOCT</dt>
              <dd>{text(specifications.noct)}</dd>
            </div>
            <div>
              <dt>Operating range</dt>
              <dd>{text(specifications.operatingTemperature)}</dd>
            </div>
            <div>
              <dt>Maximum system voltage</dt>
              <dd>{text(specifications.maximumSystemVoltage)}</dd>
            </div>
            <div>
              <dt>Snow / wind load</dt>
              <dd>
                {text(specifications.snowLoad)} /{" "}
                {text(specifications.windLoad)}
              </dd>
            </div>
            <div>
              <dt>Hail resistance</dt>
              <dd>{text(specifications.hailResistance)}</dd>
            </div>
          </dl>
        </article>
      </section>
      <section className="product-warranty-section">
        <div>
          <ShieldCheck />
          <p className="eyebrow">Warranty &amp; compliance</p>
          <h2>Documented source claims</h2>
          <p>{text(specifications.productWarranty)}</p>
          <p>{text(specifications.performanceWarranty)}</p>
        </div>
        <ul>
          {Array.isArray(specifications.standards) &&
            specifications.standards.map((item) => (
              <li key={String(item)}>{String(item)}</li>
            ))}
        </ul>
        <p className="spec-review-note">{text(specifications.sourceReview)}</p>
      </section>
      <section
        className="datasheet-section"
        aria-labelledby="datasheet-heading"
      >
        <div className="product-section-heading">
          <p className="eyebrow">Original documents</p>
          <h2 id="datasheet-heading">Datasheet preview &amp; download</h2>
          <p>Original client-supplied PDFs are preserved without alteration.</p>
        </div>
        <div className="datasheet-grid">
          {product.datasheets?.map((sheet) => (
            <article key={sheet.url}>
              <header>
                <FileText />
                <div>
                  <span>{sheet.moduleType}</span>
                  <h3>{sheet.title}</h3>
                  <small>{(sheet.fileSize / 1024 / 1024).toFixed(1)} MiB</small>
                </div>
              </header>
              <object
                data={`${sheet.url}#view=FitH`}
                type="application/pdf"
                aria-label={`${sheet.title} preview`}
              >
                <p>
                  PDF preview is unavailable in this browser.{" "}
                  <a href={sheet.url}>Open the document</a>.
                </p>
              </object>
              <a className="button button-ghost" href={sheet.url} download>
                <Download size={16} /> Download datasheet
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
