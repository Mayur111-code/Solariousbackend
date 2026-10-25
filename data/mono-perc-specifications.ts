import type { ProductDatasheet, ProductSeries, ProductVariant } from "@/data/site";

type Electrical = { powers:string[]; voc:string[]; isc:string[]; vmp:string[]; imp:string[]; efficiency:string[] };
const variants = (data: Electrical): ProductVariant[] => data.powers.map((power, index) => ({ power, voc:data.voc[index], isc:data.isc[index], vmp:data.vmp[index], imp:data.imp[index], efficiency:data.efficiency[index] }));
const gains = (powers:string[]) => Object.fromEntries([10,20,30].map(percent => [`${percent}%`, powers.map(power => String(Math.round(Number(power) * (1 + percent / 100) * 10) / 10)) ]));

const electrical: Record<string, Electrical> = {
  "156": { powers:["575","580","585","590","595","600"], voc:["53.25","53.30","53.35","53.40","53.45","53.50"], isc:["13.45","13.50","13.65","13.80","13.90","13.95"], vmp:["45.90","45.95","46.00","46.10","46.20","46.30"], imp:["12.55","12.65","12.75","12.80","12.90","13.00"], efficiency:["20.75","20.90","21.10","21.30","21.50","21.70"] },
  "144": { powers:["515","520","525","530","535","540","545","550","555"], voc:["49.20","49.24","49.28","49.32","49.36","49.40","49.44","49.80","50.00"], isc:["13.15","13.26","13.38","13.49","13.60","13.72","13.83","13.98","14.05"], vmp:["41.72","41.76","41.80","41.84","41.88","41.92","41.96","41.95","41.99"], imp:["12.34","12.45","12.56","12.67","12.77","12.88","12.99","13.12","13.22"], efficiency:["19.93","20.12","20.31","20.51","20.70","20.89","21.09","21.28","21.48"] },
  "132": { powers:["490","495","500","505","510"], voc:["45.32","45.36","45.70","45.90","46.10"], isc:["13.57","13.69","13.72","13.82","13.92"], vmp:["38.46","38.50","38.55","38.58","38.62"], imp:["12.74","12.86","12.97","13.09","13.21"], efficiency:["20.64","20.86","21.07","21.28","21.49"] },
  "120": { powers:["425","430","435","440","445","450","455","460"], voc:["40.54","40.06","40.8","40.41","41.2","41.4","41.6","41.8"], isc:["13","13.27","13.34","13.41","13.49","13.6","13.69","13.78"], vmp:["34.37","34.41","34.45","34.49","34.53","34.57","34.61","34.65"], imp:["12.37","12.5","12.63","12.76","12.89","13.02","13.15","13.28"], efficiency:["19.64","19.87","20.1","20.34","20.57","20.8","21.03","21.26"] },
  "108": { powers:["385","390","395","400","405","410","415"], voc:["36.88","36.92","36.96","37","37.3","37.5","37.7"], isc:["13.28","13.43","13.59","13.74","13.81","13.87","13.95"], vmp:["30.88","30.92","30.96","31","31.04","31.08","31.12"], imp:["12.47","12.61","12.76","12.9","13.04","13.19","13.34"], efficiency:["19.72","19.97","20.23","20.48","20.75","21","21.25"] },
};

const physical: Record<string, {range:string; dimensions:string; monoWeight:string; bifacialWeight:string}> = {
  "156": {range:"575-600 Wp",dimensions:"2465 x 1134 x 35 mm",monoWeight:"31.5 kg",bifacialWeight:"31.5 kg"},
  "144": {range:"515-555 Wp",dimensions:"2278 x 1134 x 35 mm",monoWeight:"27.5 kg",bifacialWeight:"27.5 kg"},
  "132": {range:"490-510 Wp",dimensions:"2093 x 1134 x 35 mm",monoWeight:"26 kg",bifacialWeight:"23 kg"},
  "120": {range:"425-460 Wp",dimensions:"1908 x 1134 x 35 mm",monoWeight:"23 kg",bifacialWeight:"26 kg"},
  "108": {range:"385-415 Wp",dimensions:"1722 x 1134 x 35 mm",monoWeight:"21.5 kg",bifacialWeight:"21.5 kg"},
};

const build = (moduleType:"Monofacial"|"Bifacial", prefix:"SLM"|"SLB"): ProductSeries[] => Object.entries(electrical).map(([cells, values]) => ({
  id:`${prefix.toLowerCase()}-m10-${cells}`,
  model:`${prefix}-M10-${cells}-XXX`,
  title:`${cells} Half Cut Cell Mono PERC ${moduleType === "Bifacial" ? "Bi-facial G2B" : "Mono-facial"} Module`,
  moduleType,
  wattageRange:physical[cells].range,
  cells:`${cells} half-cut cells`,
  dimensions:physical[cells].dimensions,
  weight:moduleType === "Bifacial" ? physical[cells].bifacialWeight : physical[cells].monoWeight,
  variants:variants(values),
  ...(moduleType === "Bifacial" ? {bifacialGain:gains(values.powers)} : {}),
  ...(["120","108"].includes(cells) ? {reviewNote:"The source sheet contains non-sequential voltage values. Values are reproduced exactly and require engineering confirmation before publication."} : {}),
}));

export const monoPercSeries = [...build("Monofacial","SLM"), ...build("Bifacial","SLB")];

export const monoPercDatasheets: ProductDatasheet[] = [
  {title:"Complete Mono-facial Product Sheet",url:"/datasheets/solarious-mono-facial-sheet.pdf",moduleType:"Monofacial",fileSize:5812793},
  {title:"Complete G2B Bifacial Product Sheet",url:"/datasheets/solarious-g2b-sheet.pdf",moduleType:"Bifacial",fileSize:5847163},
];

export const monoPercTechnicalSpecifications = {
  testingConditions:"STC: irradiance 1000 W/m², spectrum AM1.5 and cell temperature 25°C. Except Pmax, other parameters have a tolerance of ±3% as stated in the source sheets.",
  powerTolerance:"0 to +5 W",
  temperatureCoefficients:{voc:"-0.28%/°C",isc:"0.05%/°C",pmax:"-0.35%/°C"},
  noct:"45°C ± 2°C",
  operatingTemperature:"-40°C to 85°C",
  maximumSystemVoltage:"1500 V DC",
  snowLoad:"5400 Pa",
  windLoad:"2400 Pa",
  hailResistance:"Maximum 24 mm with impact speed of 83 km/h",
  junctionBox:"IP68 certified, 3 bypass diodes",
  cable:"Solar cable 4 mm²; lengths vary by series and customization",
  connectors:"MC4-compatible connectors",
  frontGlass:"3.2 mm high-transmission, low-iron, ARC tempered glass",
  frame:"Anodized aluminium alloy (silver/black)",
  productWarranty:"12 years on materials and workmanship (source cover claim)",
  performanceWarranty:"30-year linear performance claim on source cover; the plotted chart ends at year 27 and therefore requires manual warranty confirmation.",
  standards:["IEC 61730","IEC 62804 (PID)","IEC 61701 (Salt Mist)","IEC 61853","ISO 9001","ISO 14001","ISO 45001","IS 14286","IS 61730-1 & 2"],
  sourceReview:"G2B is described by the supplied sheet as glass-to-backsheet. Certification and warranty marks must be verified against original certificates before being presented as approved company accreditations.",
};
