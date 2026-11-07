"use client";

import { useMemo, useState } from "react";
import { Info, Table2 } from "lucide-react";
import type { CatalogProduct } from "@/data/product-catalog";

const columnIndexFor = (
  columns: string[],
  variant: { id: string; label: string; power: number } | undefined,
) => {
  if (!variant) return -1;
  const exact = columns.findIndex((column) => column.trim() === variant.label.trim());
  if (exact >= 0) return exact;
  return columns.findIndex((column) => {
    const digits = column.replace(/[^\d.]/g, "");
    return digits && Number(digits) === variant.power;
  });
};

export default function ProductSpecExplorer({
  product,
  id,
}: {
  product: CatalogProduct;
  /** Anchor target for the sticky section navigation. */
  id?: string;
}) {
  const variants = product.variants;
  const tables = product.specTables;
  const [activeId, setActiveId] = useState(variants[0]?.id ?? "");
  const active = useMemo(
    () => variants.find((variant) => variant.id === activeId) ?? variants[0],
    [variants, activeId],
  );

  if (!tables.length) {
    return (
      <section
      className="ps-section ps-spec-pending"
      id={id}
      aria-labelledby="spec-heading"
    >
        <div className="ps-section-head">
          <p className="ps-kicker">Technical data</p>
          <h2 id="spec-heading">Specifications pending publication</h2>
          <p>
            Solarious only publishes module data taken from an approved datasheet. The sheet for
            {" "}
            {product.name} has not been released yet, so no numeric values are shown here.
          </p>
        </div>
        <div className="ps-pending-card">
          <Info size={20} aria-hidden="true" />
          <div>
            <strong>Request the engineering package</strong>
            <p>
              Our technical team can share the current module drawing, electrical data and warranty
              terms for your project once they are approved.
            </p>
            <a className="ps-button ps-button-primary" href="#enquiry">
              Request specifications
            </a>
          </div>
        </div>
      </section>
    );
  }

  const summaryRows = active
    ? [
        { label: "Pmax", value: `${active.power} Wp` },
        { label: "Voc", value: active.voc ? `${active.voc} V` : "—" },
        { label: "Isc", value: active.isc ? `${active.isc} A` : "—" },
        { label: "Vmp", value: active.vmp ? `${active.vmp} V` : "—" },
        { label: "Imp", value: active.imp ? `${active.imp} A` : "—" },
        { label: "Efficiency", value: active.efficiency ? `${active.efficiency}%` : "—" },
      ]
    : [];

  return (
    <section className="ps-section ps-specs" id={id} aria-labelledby="spec-heading">
      <div className="ps-section-head">
        <p className="ps-kicker">Technical data</p>
        <h2 id="spec-heading">Module specifications</h2>
        <p>
          Values are transcribed from the published Solarious datasheet. Choose a power class to
          highlight its column in every table below.
        </p>
      </div>

      {variants.length ? (
        <>
          <div className="ps-variant-switch" role="group" aria-label="Select a power class">
            <span className="ps-variant-switch-label">
              <Table2 size={15} aria-hidden="true" /> Power class
            </span>
            <div className="ps-variant-chips">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className={variant.id === active?.id ? "is-active" : ""}
                  onClick={() => setActiveId(variant.id)}
                  aria-pressed={variant.id === active?.id}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          </div>

          {summaryRows.length ? (
            <dl className="ps-variant-summary" aria-live="polite">
              {summaryRows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      ) : null}

      <div className="ps-table-grid">
        {tables.map((table) => {
          const highlight = table.matrix ? columnIndexFor(table.columns, active) : -1;
          return (
            <article className="ps-table-card" key={table.id} id={`spec-${table.id}`}>
              <header>
                <h3>{table.title}</h3>
                {table.description ? <p>{table.description}</p> : null}
              </header>
              <div className="ps-table-scroll">
                <table>
                  <caption>
                    {product.name} — {table.title}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Parameter</th>
                      {table.columns.map((column, columnIndex) => (
                        <th
                          scope="col"
                          key={`${column}-${columnIndex}`}
                          className={columnIndex === highlight ? "is-highlighted" : undefined}
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        {row.values.map((value, columnIndex) => (
                          <td
                            key={`${row.label}-${columnIndex}`}
                            className={columnIndex === highlight ? "is-highlighted" : undefined}
                          >
                            {value || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.note ? <p className="ps-table-note">{table.note}</p> : null}
            </article>
          );
        })}
      </div>

      {product.reviewNotes.length ? (
        <div className="ps-review-note" role="note">
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Datasheet values awaiting confirmation</strong>
            <ul>
              {product.reviewNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
