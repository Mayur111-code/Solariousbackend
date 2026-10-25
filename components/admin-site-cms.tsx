"use client";
/* eslint-disable @next/next/no-img-element */
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImageUp, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { apiError } from "@/lib/api-error";

type Section = { title: string; text: string; imageUrl?: string; displayOrder?: number; published?: boolean };
type Timeline = {
  year: string;
  title: string;
  text: string;
  imageUrl: string;
  displayOrder: number;
  published: boolean;
};
type ManufacturingStep = {
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  published: boolean;
};
type PageSetting = {
  eyebrow: string;
  title: string;
  intro: string;
  heroImage: string;
  sections: Section[];
  timeline?: Timeline[];
  steps?: ManufacturingStep[];
};
type Location = {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
  primary: boolean;
  active: boolean;
  verificationStatus: "pending" | "verified";
  displayOrder: number;
};
type CompanyProfile = {
  companyName:string;legalName:string;tagline:string;aboutHeading:string;description:string;companyProfile:string;
  primaryPhone:string;secondaryPhone:string;whatsapp:string;generalEmail:string;salesEmail:string;purchaseEmail:string;qcEmail:string;factoryEmail:string;
  registeredOffice:string;factoryAddress:string;officeContact:string;website:string;websiteUrl:string;footerDescription:string;
  social:{linkedin:string;facebook:string;instagram:string;youtube:string;x:string};
};
const companyDefault:CompanyProfile={companyName:"Solarious Energy",legalName:"Mayureshwar Solar Energy Pvt Ltd",tagline:"Clean Energy.. Pure World!",aboutHeading:"Powering India’s Solar Future",description:"Solar module manufacturing and engineering support for commercial, industrial and utility-scale applications.",companyProfile:"Solarious Energy brings manufacturing discipline, product technology and project-focused support together for the evolving solar industry.",primaryPhone:"",secondaryPhone:"",whatsapp:"",generalEmail:"info@solariousenergy.in",salesEmail:"",purchaseEmail:"",qcEmail:"",factoryEmail:"",registeredOffice:"Plot No. T 3/4, MIDC Nardana Phase 2, Bhabalde Nardana, Dhule, Maharashtra – 425404, India",factoryAddress:"Plot No. T 3/4, MIDC Nardana Phase 2, Bhabalde Nardana, Dhule, Maharashtra – 425404, India",officeContact:"",website:"www.solariousenergy.com",websiteUrl:"https://www.solariousenergy.com",footerDescription:"Solar module manufacturing and engineering support for commercial, industrial and utility-scale applications.",social:{linkedin:"",facebook:"",instagram:"",youtube:"",x:""}};
const aboutDefault: PageSetting = {
  eyebrow: "About Solarious",
  title: "Powering India’s Solar Future",
  intro:
    "Solarious Energy brings manufacturing discipline, product technology and project-focused support together for the evolving solar industry.",
  heroImage: "/manufacturing-line.webp",
  sections: [],
  timeline: [],
};
const manufacturingDefault: PageSetting = {
  eyebrow: "Production & engineering",
  title: "Precision Manufacturing. Powering Tomorrow.",
  intro:
    "A disciplined manufacturing line built around process control, automation, testing and traceability.",
  heroImage: "/manufacturing-line.webp",
  sections: [],
  steps: [
    "Material Inspection",
    "Cell Sorting and Stringing",
    "Module Layup",
    "Lamination",
    "Framing and Junction Box",
    "Electrical and Quality Testing",
    "Final Inspection and Dispatch",
  ].map((title) => ({
    title,
    description: "Stage details are pending company confirmation.",
    imageUrl: "",
    videoUrl: "",
    published: true,
  })),
};
const newLocation = (): Location => ({
  name: "",
  address: "",
  latitude: 21.112265,
  longitude: 74.798172,
  mapsUrl: "",
  primary: false,
  active: true,
  verificationStatus: "pending",
  displayOrder: 0,
});
const linesToSections = (value: string): Section[] =>
  value
    .split("\n")
    .map((line) => {
      const [title, ...text] = line.split("|");
      return { title: title?.trim(), text: text.join("|").trim() };
    })
    .filter((item) => item.title && item.text);
const sectionsToLines = (items: Section[]) =>
  items.map((item) => `${item.title} | ${item.text}`).join("\n");
export default function AdminSiteCms() {
  const [company, setCompany] = useState(companyDefault),
    [about, setAbout] = useState(aboutDefault),
    [manufacturing, setManufacturing] = useState(manufacturingDefault),
    [branding, setBranding] = useState({
      logoUrl: "/solarious-logo.png",
      alternateLogoUrl: "/solarious-logo.png",
      footerLogoUrl: "/solarious-logo.png",
      faviconUrl: "/favicon.svg",
      partnerLogoUrls: [] as string[],
    }),
    [locations, setLocations] = useState<Location[]>([]),
    [editingLocation, setEditingLocation] = useState<Location | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState<"company"|"about"|"journey"|"roadmap"|"locations"|"branding"|"seo">("company"),
    [seo, setSeo] = useState({title:"Solarious Energy",description:"Advanced solar modules and clean-energy solutions for India.",keywords:"solar energy, solar modules, renewable energy",canonicalUrl:"https://www.solariousenergy.com",ogTitle:"Solarious Energy",ogDescription:"Advanced solar modules and clean-energy solutions for India.",ogImage:"/solarious-logo.png",robotsIndex:true,robotsFollow:true});
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a, m, b, l, s] = await Promise.all([
        adminFetch("/api/admin/settings/companyProfile"),
        adminFetch("/api/admin/settings/aboutPage"),
        adminFetch("/api/admin/settings/manufacturingPage"),
        adminFetch("/api/admin/settings/branding"),
        adminFetch("/api/admin/locations"),
        adminFetch("/api/admin/settings/seoSettings"),
      ]);
      if (!l.ok) throw await apiError(l, "Locations could not be loaded");
      const [cd, ad, md, bd, ld, sd] = await Promise.all([
        c.json(),
        a.json(),
        m.json(),
        b.json(),
        l.json(),
        s.json(),
      ]);
      if(cd.setting?.value)setCompany(current=>({...current,...cd.setting.value,social:{...current.social,...(cd.setting.value.social||{})}}));
      if (ad.setting?.value)
        setAbout((current) => ({ ...current, ...ad.setting.value, sections:(ad.setting.value.sections||[]).map((item:Section,index:number)=>({...item,displayOrder:item.displayOrder??index,published:item.published!==false})) }));
      if (md.setting?.value)
        setManufacturing((current) => {
          const next = { ...current, ...md.setting.value };
          return {
            ...next,
            steps: (next.steps || []).map((step: ManufacturingStep | string) =>
              typeof step === "string"
                ? {
                    title: step,
                    description:
                      "Stage details are pending company confirmation.",
                    imageUrl: "",
                    videoUrl: "",
                    published: true,
                  }
                : step,
            ),
          };
        });
      if (bd.setting?.value)
        setBranding((current) => ({ ...current, ...bd.setting.value }));
      setLocations(ld.locations || []);
      if(sd.setting?.value)setSeo((current)=>({...current,...sd.setting.value}));
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Site CMS could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const saveSetting = async (key: string, value: object) => {
    setBusy(true);
    setNotice("");
    try {
      const response = await adminFetch(`/api/admin/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      if (!response.ok)
        throw await apiError(response, "Settings could not be saved");
      setNotice(
        "Changes saved. Public pages will use the updated content immediately.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Settings could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLocation) return;
    setBusy(true);
    try {
      const response = await adminFetch(
        editingLocation.id
          ? `/api/admin/locations/${editingLocation.id}`
          : "/api/admin/locations",
        {
          method: editingLocation.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingLocation),
        },
      );
      if (!response.ok)
        throw await apiError(response, "Location could not be saved");
      setEditingLocation(null);
      setNotice("Location saved.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Location could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  const removeLocation = async (item: Location) => {
    if (!item.id || !confirm(`Delete ${item.name}?`)) return;
    const response = await adminFetch(`/api/admin/locations/${item.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setLocations((current) =>
        current.filter((location) => location.id !== item.id),
      );
      setNotice("Location deleted.");
    } else
      setNotice(
        (await apiError(response, "Location could not be deleted")).message,
      );
  };
  const uploadBrand = async (
    file: File,
    key: "logoUrl" | "alternateLogoUrl" | "footerLogoUrl" | "faviconUrl",
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      setNotice("Brand assets must be 5 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file, file.name);
      const response = await adminFetch("/api/admin/branding/upload", {
        method: "POST",
        body: data,
      });
      if (!response.ok)
        throw await apiError(response, "Brand asset upload failed");
      const uploaded = (await response.json()) as { url: string };
      setBranding((current) => ({ ...current, [key]: uploaded.url }));
      setNotice("Asset uploaded. Save branding to publish it.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Brand asset upload failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const uploadContent = async (file: File, apply: (url:string)=>void) => {
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){setNotice("Choose a JPG, PNG or WebP image below 5 MB.");return}
    setBusy(true);
    try{const data=new FormData();data.append("file",file,file.name);const response=await adminFetch("/api/admin/site-content/upload",{method:"POST",body:data});if(!response.ok)throw await apiError(response,"Image upload failed");const uploaded=await response.json();apply(uploaded.url);setNotice("Image uploaded. Save this tab to publish it.")}
    catch(error){setNotice(error instanceof Error?error.message:"Image upload failed.")}
    finally{setBusy(false)}
  };
  if (loading)
    return (
      <section className="admin-panel">
        <div className="admin-loading">
          <Loader2 className="spin" /> Loading site CMS…
        </div>
      </section>
    );
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <h2>Website content &amp; locations</h2>
          <p>
            Edit company pages, roadmap stages, business locations and global
            brand assets.
          </p>
        </div>
      </div>
      {notice && <div className="admin-notice">{notice}</div>}
      <nav className="cms-tabs" aria-label="Website content sections">
        {([["company","Company & Contact"],["about","About Page"],["journey","Company Journey"],["roadmap","Roadmap"],["locations","Business Locations"],["branding","Brand Assets"],["seo","SEO Settings"]] as const).map(([key,label])=><button type="button" className={tab===key?"active":""} aria-current={tab===key?"page":undefined} onClick={()=>setTab(key)} key={key}>{label}</button>)}
      </nav>
      <form className="admin-cms-block" hidden={tab!=="company"} onSubmit={event=>{event.preventDefault();void saveSetting("companyProfile",company)}}>
        <div className="cms-section-head"><div><span>Centralized website identity</span><h3>Company &amp; contact information</h3><p>Changes here are used by the footer, Contact page, About page and quotation contact.</p></div><button type="button" className="button button-ghost" onClick={()=>void load()}><RefreshCw size={16}/>Refresh</button></div>
        <div className="admin-form-grid">
          <label>Company name *<input required value={company.companyName} onChange={e=>setCompany({...company,companyName:e.target.value})}/></label>
          <label>Legal company name *<input required value={company.legalName} onChange={e=>setCompany({...company,legalName:e.target.value})}/></label>
          <label>Tagline<input value={company.tagline} onChange={e=>setCompany({...company,tagline:e.target.value})}/></label>
          <label>About Us heading<input value={company.aboutHeading} onChange={e=>setCompany({...company,aboutHeading:e.target.value})}/></label>
          <label className="full">Company description *<textarea required rows={3} value={company.description} onChange={e=>setCompany({...company,description:e.target.value})}/></label>
          <label className="full">Company profile<textarea rows={5} value={company.companyProfile} onChange={e=>setCompany({...company,companyProfile:e.target.value})}/></label>
          <label>Primary mobile<input inputMode="tel" value={company.primaryPhone} onChange={e=>setCompany({...company,primaryPhone:e.target.value})}/></label>
          <label>Secondary mobile<input inputMode="tel" value={company.secondaryPhone} onChange={e=>setCompany({...company,secondaryPhone:e.target.value})}/></label>
          <label>WhatsApp number<input inputMode="tel" value={company.whatsapp} onChange={e=>setCompany({...company,whatsapp:e.target.value})}/></label>
          <label>General email<input type="email" value={company.generalEmail} onChange={e=>setCompany({...company,generalEmail:e.target.value})}/></label>
          <label>Sales email<input type="email" value={company.salesEmail} onChange={e=>setCompany({...company,salesEmail:e.target.value})}/></label>
          <label>Purchase email<input type="email" value={company.purchaseEmail} onChange={e=>setCompany({...company,purchaseEmail:e.target.value})}/></label>
          <label>QC email<input type="email" value={company.qcEmail} onChange={e=>setCompany({...company,qcEmail:e.target.value})}/></label>
          <label>Factory email<input type="email" value={company.factoryEmail} onChange={e=>setCompany({...company,factoryEmail:e.target.value})}/></label>
          <label>Website label<input value={company.website} onChange={e=>setCompany({...company,website:e.target.value})}/></label>
          <label>Website URL<input type="url" value={company.websiteUrl} onChange={e=>setCompany({...company,websiteUrl:e.target.value})}/></label>
          <label className="full">Registered office<textarea rows={3} value={company.registeredOffice} onChange={e=>setCompany({...company,registeredOffice:e.target.value})}/></label>
          <label className="full">Factory address<textarea rows={3} value={company.factoryAddress} onChange={e=>setCompany({...company,factoryAddress:e.target.value})}/></label>
          <label className="full">Office contact information<textarea rows={3} value={company.officeContact} onChange={e=>setCompany({...company,officeContact:e.target.value})}/></label>
          <label className="full">Footer description<textarea rows={3} value={company.footerDescription} onChange={e=>setCompany({...company,footerDescription:e.target.value})}/></label>
          {(["linkedin","facebook","instagram","youtube","x"] as const).map(key=><label key={key}>{key[0].toUpperCase()+key.slice(1)} URL<input type="url" value={company.social[key]} onChange={e=>setCompany({...company,social:{...company.social,[key]:e.target.value}})}/></label>)}
        </div>
        <button className="button" disabled={busy}>{busy?<Loader2 className="spin" size={16}/>:<Save size={16}/>} {busy?"Saving…":"Save company information"}</button>
      </form>
      <form
        className="admin-cms-block"
        hidden={tab!=="about"&&tab!=="journey"}
        onSubmit={(event) => {
          event.preventDefault();
          void saveSetting("aboutPage", about);
        }}
      >
        <div className="cms-section-head"><div><span>{tab==="about"?"Page content":"Company history"}</span><h3>{tab==="about"?"About Page":"Company Journey"}</h3></div><button type="button" className="button button-ghost" onClick={()=>void load()}><RefreshCw size={16}/>Refresh</button></div>
        <div hidden={tab!=="about"}>
        <div className="admin-form-grid">
          <label>
            Eyebrow
            <input
              value={about.eyebrow}
              onChange={(e) => setAbout({ ...about, eyebrow: e.target.value })}
            />
          </label>
          <label>
            Title
            <input
              value={about.title}
              onChange={(e) => setAbout({ ...about, title: e.target.value })}
            />
          </label>
          <label>
            Hero image URL
            <input
              value={about.heroImage}
              onChange={(e) =>
                setAbout({ ...about, heroImage: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Introduction
          <textarea
            rows={3}
            value={about.intro}
            onChange={(e) => setAbout({ ...about, intro: e.target.value })}
          />
        </label>
        <div className="cms-image-row">{about.heroImage&&<img src={about.heroImage} alt="About hero preview"/>}<label className="admin-file-label"><ImageUp size={16}/>Upload or replace hero image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadContent(file,url=>setAbout(current=>({...current,heroImage:url})));e.currentTarget.value=""}}/></label></div>
        <div className="cms-repeat-head"><div><h4>Content sections</h4><p>Build the page with ordered, publishable content cards.</p></div><button type="button" className="button button-ghost" onClick={()=>setAbout({...about,sections:[...about.sections,{title:"",text:"",imageUrl:"",displayOrder:about.sections.length,published:true}]})}><Plus size={16}/>Add section</button></div>
        <div className="cms-card-list">{about.sections.map((item,index)=><article className="cms-editor-card" key={index}><header><strong>Section {index+1}</strong><div><button type="button" disabled={index===0} onClick={()=>{const next=[...about.sections];[next[index-1],next[index]]=[next[index],next[index-1]];setAbout({...about,sections:next.map((x,i)=>({...x,displayOrder:i}))});}}><ArrowUp size={15}/></button><button type="button" disabled={index===about.sections.length-1} onClick={()=>{const next=[...about.sections];[next[index+1],next[index]]=[next[index],next[index+1]];setAbout({...about,sections:next.map((x,i)=>({...x,displayOrder:i}))});}}><ArrowDown size={15}/></button><button type="button" className="danger" onClick={()=>setAbout({...about,sections:about.sections.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button></div></header><label>Section title<input value={item.title} onChange={e=>setAbout({...about,sections:about.sections.map((x,i)=>i===index?{...x,title:e.target.value}:x)})}/></label><label>Content<textarea rows={4} value={item.text} onChange={e=>setAbout({...about,sections:about.sections.map((x,i)=>i===index?{...x,text:e.target.value}:x)})}/></label><label>Image URL<input value={item.imageUrl||""} onChange={e=>setAbout({...about,sections:about.sections.map((x,i)=>i===index?{...x,imageUrl:e.target.value}:x)})}/></label><label className="cms-check"><input type="checkbox" checked={item.published!==false} onChange={e=>setAbout({...about,sections:about.sections.map((x,i)=>i===index?{...x,published:e.target.checked}:x)})}/>Published</label></article>)}</div>
        </div>
        <div hidden={tab!=="journey"}>
        <div className="cms-repeat-head"><div><h4>Timeline entries</h4><p>Use the controls to maintain public display order.</p></div><button type="button" className="button button-ghost" onClick={()=>setAbout({...about,timeline:[...(about.timeline||[]),{year:"",title:"",text:"",imageUrl:"",displayOrder:(about.timeline||[]).length,published:true}]})}><Plus size={16}/>Add milestone</button></div>
        <div className="cms-card-list">{(about.timeline||[]).map((item,index)=><article className="cms-editor-card" key={index}><header><strong>Milestone {index+1}</strong><button type="button" className="danger" onClick={()=>setAbout({...about,timeline:(about.timeline||[]).filter((_,i)=>i!==index)})}><Trash2 size={15}/></button></header><div className="admin-form-grid"><label>Year<input value={item.year} onChange={e=>setAbout({...about,timeline:(about.timeline||[]).map((x,i)=>i===index?{...x,year:e.target.value}:x)})}/></label><label>Title<input value={item.title} onChange={e=>setAbout({...about,timeline:(about.timeline||[]).map((x,i)=>i===index?{...x,title:e.target.value}:x)})}/></label></div><label>Description<textarea rows={3} value={item.text} onChange={e=>setAbout({...about,timeline:(about.timeline||[]).map((x,i)=>i===index?{...x,text:e.target.value}:x)})}/></label><label>Image URL<input value={item.imageUrl} onChange={e=>setAbout({...about,timeline:(about.timeline||[]).map((x,i)=>i===index?{...x,imageUrl:e.target.value}:x)})}/></label><label className="cms-check"><input type="checkbox" checked={item.published} onChange={e=>setAbout({...about,timeline:(about.timeline||[]).map((x,i)=>i===index?{...x,published:e.target.checked}:x)})}/>Published</label></article>)}</div>
        </div>
        <button className="button" disabled={busy}>
          <Save size={16} /> Save {tab==="journey"?"journey":"About page"}
        </button>
      </form>
      <form
        className="admin-cms-block"
        hidden={tab!=="roadmap"}
        onSubmit={(event) => {
          event.preventDefault();
          void saveSetting("manufacturingPage", manufacturing);
        }}
      >
        <h3>Manufacturing page</h3>
        <div className="admin-form-grid">
          <label>
            Eyebrow
            <input
              value={manufacturing.eyebrow}
              onChange={(e) =>
                setManufacturing({ ...manufacturing, eyebrow: e.target.value })
              }
            />
          </label>
          <label>
            Title
            <input
              value={manufacturing.title}
              onChange={(e) =>
                setManufacturing({ ...manufacturing, title: e.target.value })
              }
            />
          </label>
          <label>
            Hero image URL
            <input
              value={manufacturing.heroImage}
              onChange={(e) =>
                setManufacturing({
                  ...manufacturing,
                  heroImage: e.target.value,
                })
              }
            />
          </label>
        </div>
        <label>
          Introduction
          <textarea
            rows={3}
            value={manufacturing.intro}
            onChange={(e) =>
              setManufacturing({ ...manufacturing, intro: e.target.value })
            }
          />
        </label>
        <label>
          Feature sections — one per line: Title | Content
          <textarea
            rows={5}
            value={sectionsToLines(manufacturing.sections)}
            onChange={(e) =>
              setManufacturing({
                ...manufacturing,
                sections: linesToSections(e.target.value),
              })
            }
          />
        </label>
        <label>
          Process stages — one per line: Title | Description | Image URL | Video
          URL | published
          <textarea
            rows={7}
            value={(manufacturing.steps || [])
              .map(
                (step) =>
                  `${step.title} | ${step.description} | ${step.imageUrl} | ${step.videoUrl} | ${step.published}`,
              )
              .join("\n")}
            onChange={(e) =>
              setManufacturing({
                ...manufacturing,
                steps: e.target.value
                  .split("\n")
                  .map((value) => {
                    const [title, description, imageUrl, videoUrl, published] =
                      value.split("|").map((part) => part.trim());
                    return {
                      title,
                      description,
                      imageUrl,
                      videoUrl,
                      published: published !== "false",
                    };
                  })
                  .filter((step) => step.title),
              })
            }
          />
        </label>
        <button className="button" disabled={busy}>
          <Save size={16} /> Save Manufacturing page
        </button>
      </form>
      <div className="admin-cms-block" hidden={tab!=="locations"}>
        <div className="admin-panel-head">
          <div>
            <h3>Business locations</h3>
            <p>
              Unverified coordinates remain clearly marked until an
              administrator confirms them.
            </p>
          </div>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => setEditingLocation(newLocation())}
          >
            <Plus size={16} /> Add location
          </button>
        </div>
        <div className="admin-product-grid">
          {locations.map((item) => (
            <article key={item.id}>
              <div>
                <span>{item.verificationStatus}</span>
                <h3>{item.name}</h3>
                <p>{item.address}</p>
                <small>
                  {item.latitude}, {item.longitude}
                  {item.primary ? " · Primary" : ""}
                </small>
                <div className="admin-inline-actions">
                  <button
                    className="button button-ghost"
                    onClick={() => setEditingLocation(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => void removeLocation(item)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <form
        className="admin-cms-block"
        hidden={tab!=="branding"}
        onSubmit={(event) => {
          event.preventDefault();
          void saveSetting("branding", branding);
        }}
      >
        <h3>Global branding</h3>
        <div className="admin-form-grid">
          {(
            [
              "logoUrl",
              "alternateLogoUrl",
              "footerLogoUrl",
              "faviconUrl",
            ] as const
          ).map((key) => (
            <div className="admin-upload-field" key={key}>
              {branding[key] && (
                <img src={branding[key]} alt={`${key} preview`} />
              )}
              <label>
                {key === "logoUrl"
                  ? "Primary header logo"
                  : key === "alternateLogoUrl"
                    ? "Alternate dark-background logo"
                    : key === "footerLogoUrl"
                      ? "Footer logo"
                      : "Favicon"}
                <input
                  value={branding[key]}
                  onChange={(e) =>
                    setBranding({ ...branding, [key]: e.target.value })
                  }
                />
              </label>
              <label className="admin-file-label">
                <ImageUp size={16} /> Upload JPG, PNG, WebP or safe SVG
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadBrand(file, key);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          ))}
          <label>
            Optional certification / partner logo URLs (one per line)
            <textarea
              rows={4}
              value={branding.partnerLogoUrls.join("\n")}
              onChange={(event) =>
                setBranding({
                  ...branding,
                  partnerLogoUrls: event.target.value
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
        <button className="button" disabled={busy}>
          <Save size={16} /> Save branding
        </button>
      </form>
      <form className="admin-cms-block" hidden={tab!=="seo"} onSubmit={event=>{event.preventDefault();void saveSetting("seoSettings",seo)}}>
        <div className="cms-section-head"><div><span>Search appearance</span><h3>SEO Settings</h3><p>Set the default search and social sharing content.</p></div></div>
        <div className="admin-form-grid"><label>Site title<input required maxLength={70} value={seo.title} onChange={e=>setSeo({...seo,title:e.target.value})}/></label><label>Canonical URL<input type="url" value={seo.canonicalUrl} onChange={e=>setSeo({...seo,canonicalUrl:e.target.value})}/></label><label className="full">Meta description<textarea required rows={4} maxLength={180} value={seo.description} onChange={e=>setSeo({...seo,description:e.target.value})}/></label><label className="full">Keywords<input value={seo.keywords} onChange={e=>setSeo({...seo,keywords:e.target.value})}/></label><label>Open Graph title<input value={seo.ogTitle} onChange={e=>setSeo({...seo,ogTitle:e.target.value})}/></label><label>Social image URL<input value={seo.ogImage} onChange={e=>setSeo({...seo,ogImage:e.target.value})}/></label><label className="full">Open Graph description<textarea rows={3} value={seo.ogDescription} onChange={e=>setSeo({...seo,ogDescription:e.target.value})}/></label><label className="cms-check"><input type="checkbox" checked={seo.robotsIndex} onChange={e=>setSeo({...seo,robotsIndex:e.target.checked})}/>Allow search indexing</label><label className="cms-check"><input type="checkbox" checked={seo.robotsFollow} onChange={e=>setSeo({...seo,robotsFollow:e.target.checked})}/>Allow link following</label></div>
        <button className="button" disabled={busy}>{busy?<Loader2 className="spin" size={16}/>:<Save size={16}/>} {busy?"Saving…":"Save SEO settings"}</button>
      </form>
      {editingLocation && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <h2>{editingLocation.id ? "Edit" : "Add"} location</h2>
            <form onSubmit={saveLocation}>
              <label>
                Name
                <input
                  required
                  value={editingLocation.name}
                  onChange={(e) =>
                    setEditingLocation({
                      ...editingLocation,
                      name: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Address
                <textarea
                  required
                  rows={3}
                  value={editingLocation.address}
                  onChange={(e) =>
                    setEditingLocation({
                      ...editingLocation,
                      address: e.target.value,
                    })
                  }
                />
              </label>
              <div className="admin-form-grid">
                <label>
                  Latitude
                  <input
                    required
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={editingLocation.latitude}
                    onChange={(e) =>
                      setEditingLocation({
                        ...editingLocation,
                        latitude: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Longitude
                  <input
                    required
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={editingLocation.longitude}
                    onChange={(e) =>
                      setEditingLocation({
                        ...editingLocation,
                        longitude: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Map URL
                  <input
                    required
                    type="url"
                    value={editingLocation.mapsUrl}
                    onChange={(e) =>
                      setEditingLocation({
                        ...editingLocation,
                        mapsUrl: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Verification
                  <select
                    value={editingLocation.verificationStatus}
                    onChange={(e) =>
                      setEditingLocation({
                        ...editingLocation,
                        verificationStatus: e.target
                          .value as Location["verificationStatus"],
                      })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                  </select>
                </label>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={editingLocation.primary}
                  onChange={(e) =>
                    setEditingLocation({
                      ...editingLocation,
                      primary: e.target.checked,
                    })
                  }
                />{" "}
                Primary location
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={editingLocation.active}
                  onChange={(e) =>
                    setEditingLocation({
                      ...editingLocation,
                      active: e.target.checked,
                    })
                  }
                />{" "}
                Published
              </label>
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setEditingLocation(null)}
                >
                  Cancel
                </button>
                <button className="button" disabled={busy}>
                  <Save size={16} /> Save location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
