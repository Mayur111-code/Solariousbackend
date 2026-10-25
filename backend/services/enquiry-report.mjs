const escaped=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const spreadsheetSafe=value=>{const text=String(value??"").replace(/\r?\n/g," ");return /^[=+\-@]/.test(text.trimStart())?`'${text}`:text};
export const csvCell=value=>`"${spreadsheetSafe(value).replace(/"/g,'""')}"`;
const displayDate=value=>new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(value));
const sourceOf=item=>item.kind==="quote"?"Quote":"Contact";

export const emailConfiguration=()=>({provider:(process.env.EMAIL_PROVIDER||"resend").trim().toLowerCase(),apiKey:Boolean(process.env.EMAIL_API_KEY?.trim()),from:(process.env.EMAIL_FROM||"").trim(),configured:Boolean(process.env.EMAIL_API_KEY?.trim()&&process.env.EMAIL_FROM?.trim())});

export function buildEnquiryReport({items,start,end}){
  const counts={total:items.length,contact:items.filter(item=>item.kind!=="quote").length,quote:items.filter(item=>item.kind==="quote").length,new:items.filter(item=>item.status==="new").length,contacted:items.filter(item=>item.status==="contacted").length,pending:items.filter(item=>["new","qualified"].includes(item.status)).length};
  const subject=`Solarious Energy | Weekly Enquiry Report | ${displayDate(start).split(",")[0]} - ${displayDate(end).split(",")[0]}`;
  const rows=items.map((item,index)=>`<tr><td>${index+1}</td><td>${escaped(item.name)}</td><td>${escaped(item.phone)}</td><td>${escaped(item.email)}</td><td>${sourceOf(item)}</td><td>${escaped(item.product||item.message||"General enquiry")}</td><td>${displayDate(item.createdAt)}</td><td>${escaped(item.status)}</td></tr>`).join("");
  const html=`<!doctype html><html><body style="margin:0;background:#f3f6fa;font-family:Arial,sans-serif;color:#172b3a"><div style="max-width:920px;margin:auto;padding:28px"><div style="padding:25px;background:#142536;color:white"><strong style="font-size:22px">SOLARIOUS ENERGY</strong><p style="margin:8px 0 0;color:#cbd5e1">Weekly Customer Enquiry Summary</p></div><div style="padding:24px;background:white"><p>Reporting period: <strong>${displayDate(start)}</strong> to <strong>${displayDate(end)}</strong></p><table style="width:100%;border-collapse:collapse;margin:20px 0"><tr>${Object.entries(counts).map(([label,value])=>`<td style="padding:12px;border:1px solid #e2e8f0"><strong style="display:block;font-size:22px">${value}</strong><small>${escaped(label)}</small></td>`).join("")}</tr></table><div style="overflow:auto"><table style="width:100%;min-width:820px;border-collapse:collapse;font-size:12px"><thead><tr>${["Sr. No.","Customer","Mobile","Email","Source","Requirement","Received","Status"].map(value=>`<th style="padding:9px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left">${value}</th>`).join("")}</tr></thead><tbody>${rows||'<tr><td colspan="8" style="padding:24px;text-align:center;border:1px solid #e2e8f0">No enquiries were received during this reporting period.</td></tr>'}</tbody></table></div></div></div></body></html>`;
  const headings=["Sr. No.","Customer Name","Mobile","Email","Enquiry Source","Requirement","Received Date","Status"];
  const csv=[headings.map(csvCell).join(","),...items.map((item,index)=>[index+1,item.name,item.phone,item.email,sourceOf(item),item.product||item.message||"General enquiry",new Date(item.createdAt).toISOString(),item.status].map(csvCell).join(","))].join("\r\n");
  return{subject,html,csv,counts};
}

export async function sendTransactionalEmail({to,subject,html,csv,fileName}){
  const config=emailConfiguration();
  if(!config.configured)throw Object.assign(new Error("Email delivery is not configured. Set EMAIL_API_KEY and EMAIL_FROM on the backend."),{status:503,code:"EMAIL_NOT_CONFIGURED"});
  if(config.provider!=="resend")throw Object.assign(new Error("Unsupported email provider. Configure EMAIL_PROVIDER=resend."),{status:503,code:"EMAIL_PROVIDER_UNSUPPORTED"});
  const payload={from:config.from,to:[to],subject,html,...(csv?{attachments:[{filename:fileName||"solarious-enquiries.csv",content:Buffer.from(csv).toString("base64") }]}:{})};
  let response;
  try{response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.EMAIL_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(payload)})}catch{throw Object.assign(new Error("The email provider could not be reached."),{status:503,code:"EMAIL_PROVIDER_UNAVAILABLE",retryable:true})}
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(response.status===429?"The email provider rate limit was reached.":"The email provider rejected the message."),{status:response.status===429?429:502,code:response.status===429?"EMAIL_RATE_LIMITED":"EMAIL_REJECTED",retryable:response.status===429,providerStatus:response.status,providerMessage:String(body?.message||body?.error||"").slice(0,180)});
  return{messageId:String(body.id||""),status:body.id?"sent":"unknown"};
}
