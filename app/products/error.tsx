"use client";
export default function ProductsError({reset}:{reset:()=>void}){return <main className="content-section"><section className="admin-empty"><h1>Products are temporarily unavailable</h1><p>We could not load the live product catalogue. Please retry in a moment.</p><button className="button" onClick={reset}>Retry products</button></section></main>}
