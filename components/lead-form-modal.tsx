"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QuotePopupForm from "@/components/quote-popup-form";

export default function LeadFormModal({ label = "Get a quote", className = "button" }: { label?: string; className?: string }) {
  return <Dialog><DialogTrigger asChild><button type="button" className={className}>{label}</button></DialogTrigger><DialogContent className="quote-popup-dialog" showCloseButton><div className="quote-popup-visual" aria-hidden="true"><Image src="/manufacturing-line.webp" alt="" fill sizes="(max-width: 720px) 0px, 320px"/><div><Image src="/solarious-logo.png" alt="" width={220} height={74}/><p>Engineering a brighter energy future.</p></div></div><div className="quote-popup-content"><DialogHeader><DialogTitle>Get your quote</DialogTitle><DialogDescription>Complete the details below and our solar team will contact you as soon as possible.</DialogDescription></DialogHeader><QuotePopupForm/></div></DialogContent></Dialog>;
}
