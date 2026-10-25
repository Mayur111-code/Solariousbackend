export const company = {
  legalName: "Mayureshwar Solar Energy Pvt Ltd",
  brand: "Solarious Energy",
  email: "info@solariousenergy.in",
  phone: null,
  headOffice: "Plot No. T 3/4, MIDC Nardana Phase 2, Bhabalde Nardana, Dhule, Maharashtra – 425404, India",
  manufacturingUnit: "Plot No. T 3/4, MIDC Nardana Phase 2, Bhabalde Nardana, Dhule, Maharashtra – 425404, India",
  address: "Plot No. T 3/4, MIDC Nardana Phase 2, Bhabalde Nardana, Dhule, Maharashtra – 425404, India",
  website: "www.solariousenergy.in",
  websiteUrl: "http://www.solariousenergy.in",
  tagline: "Clean Energy.. Pure World!",
  description: "Solar module manufacturing and engineering support for commercial, industrial and utility-scale applications.",
};

export type ProductVariant = { power:string; voc:string; isc:string; vmp:string; imp:string; efficiency:string };
export type ProductSeries = { id:string; model:string; title:string; moduleType:"Monofacial"|"Bifacial"; wattageRange:string; cells:string; dimensions:string; weight:string; variants:ProductVariant[]; bifacialGain?:Record<string,string[]>; reviewNote?:string };
export type ProductDatasheet = { title:string; url:string; moduleType:"Monofacial"|"Bifacial"; fileSize:number };
export type Product = { slug:string; name:string; technology:string; summary:string; applications:string[]; features:string[]; bifacial:string; image:string; moduleType?:string; status?:"draft"|"published"|"archived"; powerRating?:string; efficiency?:string; dimensions?:string; weight?:string; cellType?:string; warranty?:string; modelNumber?:string; gallery?:string[]; datasheetUrl?:string; datasheets?:ProductDatasheet[]; series?:ProductSeries[]; technicalSpecifications?:Record<string,unknown> };
export const products: Product[] = [
  { slug:"mono-perc", name:"Mono PERC", technology:"Passivated Emitter and Rear Cell", summary:"A mature module category for dependable commercial, industrial and ground-mounted applications.", applications:["Commercial rooftop","Industrial","Solar EPC"], features:["Established cell architecture","Flexible project use","Configuration-dependent module formats"], bifacial:"Configuration dependent", image:"/utility-solar.webp" },
  { slug:"topcon", name:"TOPCon", technology:"Tunnel Oxide Passivated Contact", summary:"A performance-focused category for projects prioritising efficiency and energy yield.", applications:["Commercial rooftop","Industrial","Utility scale"], features:["Advanced contact architecture","Performance-focused design","Bifacial configurations may be available"], bifacial:"Configuration dependent", image:"/ai-solar-intelligence.webp" },
  { slug:"hjt", name:"HJT", technology:"Heterojunction Technology", summary:"A high-performance architecture combining crystalline silicon with thin-film layers.", applications:["Space-constrained sites","Premium rooftop","Specialised projects"], features:["Heterojunction cell structure","Strong low-light potential","Project-specific configuration"], bifacial:"Configuration dependent", image:"/manufacturing-line.webp" },
  { slug:"bifacial", name:"Bifacial", technology:"Dual-side Energy Generation", summary:"Designed to use front and rear irradiance where mounting and site albedo support it.", applications:["Utility scale","Ground-mounted arrays","High-albedo sites"], features:["Rear-side generation potential","Site-design dependent gain","Compatible technology variants"], bifacial:"Yes", image:"/utility-solar.webp" },
];

export const pageContent = {
  about:{ eyebrow:"About Solarious", title:"Powering India’s Solar Future", intro:"Solarious Energy brings manufacturing discipline, product technology and project-focused support together for the evolving solar industry.", sections:[
    ["Who We Are","Solarious Energy is the solar module brand of Mayureshwar Solar Energy Pvt. Ltd. We serve EPC companies, developers and renewable-energy projects with a focus on reliable engineering communication."],
    ["Our Journey","Our growth story is built around responsible scale, modern manufacturing systems and long-term customer relationships. Milestones and statistics will be published after company verification."],
    ["Manufacturing Excellence","A structured production process—from incoming cell inspection to final testing and dispatch—supports consistency, traceability and project readiness."],
    ["Mission","To support a cleaner energy future with well-engineered solar modules and transparent, responsive customer support."],
    ["Vision","To build a trusted solar manufacturing company recognised for quality, innovation, reliability and responsible growth."],
  ]},
  manufacturing:{ eyebrow:"Production & engineering", title:"Advanced Solar Manufacturing", intro:"A disciplined manufacturing line built around process control, automation, testing and traceability.", sections:[
    ["Facility Overview","Production areas are organised for controlled material flow, consistent assembly and repeatable quality checks. Published capacity figures remain configurable until verified."],
    ["Automation","Automated stringing, layup and handling systems help reduce variation while trained teams monitor every critical stage."],
    ["Quality Monitoring","Inspection checkpoints, EL imaging and flash testing are positioned throughout the line to identify issues before dispatch."],
    ["Traceability","Batch and process records can connect incoming materials, production stages and final inspection results."],
  ]},
  technology:{ eyebrow:"Technology & innovation", title:"Technology That Powers Tomorrow", intro:"Understand the solar cell architectures available for different space, performance and project-design priorities.", sections:products.map(p=>[`${p.name} Technology`,`${p.summary} Suitability depends on confirmed product specifications and site engineering.`] as const)},
  quality:{ eyebrow:"Quality systems", title:"Quality Without Compromise", intro:"Quality is treated as a continuous process—from incoming materials to final inspection and dispatch.", sections:[
    ["Incoming Material Inspection","Materials and components are checked against approved requirements before entering production."],
    ["In-Process Quality Control","Structured checkpoints help teams monitor alignment, soldering, lamination and assembly consistency."],
    ["EL & Flash Testing","Electroluminescence inspection and calibrated flash testing support defect detection and output verification."],
    ["Final Inspection & Traceability","Finished modules are visually reviewed, labelled and linked to production records before dispatch."],
    ["Certifications","Verified certificate files will appear here when uploaded. No certification is claimed without approved documentation."],
  ]},
  projects:{ eyebrow:"Project applications", title:"Solar Solutions for Every Scale", intro:"Explore application categories—not fabricated client projects—and identify module technologies for further technical review.", sections:[
    ["Commercial Rooftop","Space-efficient module categories for offices, retail, logistics and institutional rooftops."],
    ["Industrial","Module options for factories and large energy users with engineering-led system design."],
    ["Utility Scale","Technology categories for large ground-mounted plants, selected after site and performance assessment."],
    ["Solar EPC","Product discovery and technical coordination for EPC procurement and project execution."],
    ["Institutional","Solar module options for campuses, hospitals and public-use facilities."],
    ["Large Ground-Mounted Projects","Module and mounting selection aligned with terrain, irradiance, albedo and project design."],
  ]},
  sustainability:{ eyebrow:"Responsible energy", title:"Powering a Sustainable Future", intro:"Sustainability guides how solar solutions are designed, manufactured and supported across their useful life.", sections:[
    ["Clean Energy Commitment","Solar technology enables organisations to move more of their electricity demand toward renewable generation."],
    ["Efficient Manufacturing","Process monitoring and responsible production planning can reduce avoidable material and energy loss."],
    ["Waste Reduction","Material handling and production controls are designed to minimise waste and support responsible disposal practices."],
    ["Responsible Materials","Supplier and material decisions should balance performance, durability, traceability and environmental responsibility."],
    ["Long Product Life","Durable products and informed system design can support reliable generation over long operating periods."],
    ["Future Goals","Verified sustainability goals and measured progress will be published as company reporting becomes available."],
  ]},
} as const;

export const manufacturingSteps=["Material Inspection","Cell Sorting and Stringing","Module Layup","Lamination","Framing and Junction Box","Electrical and Quality Testing","Final Inspection and Dispatch"];
export const resourceCategories=["Product Datasheets","Technical Specifications","Company Profile","Brochures","Certificates","Warranty Documents","Installation Documents"];
