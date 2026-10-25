"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, Calculator, ChartNoAxesCombined, SearchCheck, Send, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const features = [
  { number: "01", title: "AI Solar Assistant", text: "Ask questions about Solarious products, technologies, applications, specifications and the quotation process.", label: "Ask Solarious AI", href: null, icon: Bot },
  { number: "02", title: "Smart Module Finder", text: "Identify a suitable solar module category based on your project type, space and performance priorities.", label: "Find my module", href: "/module-recommender", icon: SearchCheck },
  { number: "03", title: "Solar Project Calculator", text: "Get preliminary module quantity, system capacity and area estimates using transparent assumptions.", label: "Calculate project", href: "/solar-calculator", icon: Calculator },
  { number: "04", title: "Intelligent Comparison", text: "Compare Mono PERC, TOPCon, HJT and Bifacial technologies using approved category-level information.", label: "Compare modules", href: "/compare", icon: ChartNoAxesCombined },
];

function AssistantDialog() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Choose a quick question or ask about module technologies and project planning.");
  const [busy, setBusy] = useState(false);
  const reply = async (value: string) => {
    const message = value.trim();
    if (!message || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await response.json();
      setAnswer(data.answer ?? data.message ?? "The assistant could not respond right now. Please try again.");
    } catch {
      setAnswer("The assistant could not connect right now. Please try again or contact the Solarious team.");
    } finally {
      setQuestion("");
      setBusy(false);
    }
  };
  return <Dialog><DialogTrigger asChild><button className="ai-card-action" type="button">Ask Solarious AI <ArrowRight size={15} /></button></DialogTrigger><DialogContent className="assistant-dialog"><DialogHeader><DialogTitle>Solarious AI Assistant</DialogTitle><DialogDescription>Product guidance based on approved website information. Confirm final specifications with the technical team.</DialogDescription></DialogHeader><div className="assistant-answer" aria-live="polite">{busy ? "Thinking…" : answer}</div><div className="quick-prompts"><button disabled={busy} onClick={() => void reply("What is TOPCon?")}>What is TOPCon?</button><button disabled={busy} onClick={() => void reply("When is bifacial suitable?")}>When is bifacial suitable?</button><button disabled={busy} onClick={() => void reply("How do I request a quote?")}>How do I request a quote?</button></div><form className="assistant-form" onSubmit={(event) => { event.preventDefault(); void reply(question); }}><label className="sr-only" htmlFor="ai-question">Ask Solarious AI</label><input id="ai-question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about solar modules…" /><button type="submit" disabled={busy} aria-label="Send question"><Send size={18} /></button></form><div className="assistant-links"><Link href="/module-recommender">Find a module</Link><Link href="/compare">Compare products</Link><Link href="/contact#quote">Request quote</Link></div></DialogContent></Dialog>;
}

export default function AiSolarSection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const node = ref.current; if (!node) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { threshold: .12 }); observer.observe(node); return () => observer.disconnect(); }, []);
  return <section ref={ref} className={`section ai-section ${visible ? "is-visible" : ""}`} aria-labelledby="ai-solar-heading">
    <div className="ai-section-grid">
      <div className="ai-visual-wrap">
        <Image className="ai-visual" src="/ai-solar-intelligence.webp" alt="Solar panel installation with subtle digital energy monitoring and performance analytics" fill sizes="(max-width: 900px) 100vw, 48vw" />
        <div className="analytics-panel" aria-hidden="true"><span className="analytics-kicker">LIVE INTELLIGENCE</span><strong>Performance overview</strong><div className="analytics-chart"><i /><i /><i /><i /><i /><i /><i /></div><div className="analytics-meta"><span>Generation</span><span>Monitoring active</span></div></div>
        <div className="data-node node-one" aria-hidden="true"><Sparkles size={15} /> Predictive insights</div>
        <div className="data-node node-two" aria-hidden="true">Smart grid connected</div>
      </div>
      <div className="ai-copy">
        <p className="eyebrow"><span /> AI-powered solar technology</p>
        <h2 id="ai-solar-heading">Smarter Solar.<br /><em>Powered by Intelligence.</em></h2>
        <p>Combine advanced solar technology with intelligent digital tools to help customers understand module technologies, compare products, estimate project requirements, and connect with the right Solarious solution.</p>
        <div className="ai-assurance"><Sparkles size={18} /><span><strong>Engineering assistance, not guesswork</strong><small>Digital guidance uses approved information and clearly identifies when technical confirmation is required.</small></span></div>
      </div>
    </div>
    <div className="ai-feature-grid">{features.map(({ number, title, text, label, href, icon: Icon }) => <article className="ai-feature-card" key={number}><div className="ai-card-top"><span>{number}</span><Icon size={21} /></div><h3>{title}</h3><p>{text}</p>{href ? <Link className="ai-card-action" href={href}>{label} <ArrowRight size={15} /></Link> : <AssistantDialog />}</article>)}</div>
  </section>;
}
