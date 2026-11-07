import {NextResponse} from "next/server";
import {backendApiUrl} from "@/lib/server-config";

export const dynamic="force-dynamic";

function safeReturnTo(value:string|null){return value?.startsWith("/")&&!value.startsWith("//")?value:"/admin"}
function publicOrigin(request:Request){const headers=request.headers,host=headers.get("x-forwarded-host")||headers.get("host")||new URL(request.url).host,protocol=headers.get("x-forwarded-proto")||new URL(request.url).protocol.replace(":","");return `${protocol}://${host}`}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]||character))}
function page(returnTo:string,error=""){
  const message=error?`<p class="error">${escapeHtml(error)}</p>`:"";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solarious Admin Login</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#061b36;color:#172b3a;font-family:"Segoe UI",system-ui,-apple-system,BlinkMacSystemFont,Arial,sans-serif}.card{width:min(420px,calc(100% - 40px));padding:38px 36px;border-radius:20px;background:#fff;box-shadow:0 24px 70px #0008}.brand{color:#8a5f0a;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}h1{margin:12px 0 8px;font-family:inherit;font-size:32px;font-weight:750;letter-spacing:-.02em}.intro{color:#52647a;line-height:1.6;margin:0 0 24px}label{display:block;font-size:13px;font-weight:700;margin:16px 0 7px}label .req{color:#b3261e}input{box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #aebccb;border-radius:9px;background:#fff;color:#172b3a;font:inherit}input::placeholder{color:#5b7188;opacity:1}input:focus,input:focus-visible{outline:3px solid #0b2c52;outline-offset:2px;border-color:#0b2c52}button{width:100%;margin-top:22px;padding:14px;border:0;border-radius:9px;background:#061b36;color:#fff;font:inherit;font-weight:800;cursor:pointer}button:hover{background:#0b2c52}button:focus-visible{outline:3px solid #8a5f0a;outline-offset:3px}.error{padding:10px 12px;border-radius:8px;background:#fff1f0;color:#a9271b;font-size:14px;font-weight:600}</style></head><body><main class="card"><div class="brand">Solarious control centre</div><h1>Admin login</h1><p class="intro">Sign in with your authorised Solarious administrator credentials.</p>${message}<form method="post"><input type="hidden" name="return_to" value="${escapeHtml(returnTo)}"><label for="username">Username <span class="req" aria-hidden="true">*</span></label><input id="username" name="username" autocomplete="username" required autofocus><label for="password">Password <span class="req" aria-hidden="true">*</span></label><input id="password" name="password" type="password" autocomplete="current-password" required><button type="submit">Sign in securely</button></form></main></body></html>`;
}

export async function GET(request:Request){const url=new URL(request.url),returnTo=safeReturnTo(url.searchParams.get("return_to"));return new NextResponse(page(returnTo),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})}

export async function POST(request:Request){
  const form=await request.formData(),username=String(form.get("username")??""),password=String(form.get("password")??""),returnTo=safeReturnTo(String(form.get("return_to")??"/admin")),base=backendApiUrl();
  if(!base)return new NextResponse(page(returnTo,"Admin service is not configured."),{status:503,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
  let backendResponse:Response;
  try{backendResponse=await fetch(`${base}/api/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password}),cache:"no-store"})}
  catch(error){const detail=error instanceof Error?error.message:"Network connection failed";return new NextResponse(page(returnTo,`Admin service network error: ${detail}`),{status:503,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})}
  if(!backendResponse.ok){let detail="Request failed";try{const body=await backendResponse.json() as {error?:string};if(body.error)detail=body.error}catch{}const message=backendResponse.status===401?"Incorrect username or password.":`Admin service returned HTTP ${backendResponse.status}: ${detail}`;return new NextResponse(page(returnTo,message),{status:backendResponse.status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})}
  const sessionCookie=backendResponse.headers.get("set-cookie");
  if(!sessionCookie)return new NextResponse(page(returnTo,"Admin service did not create a secure session."),{status:502,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
  const response=NextResponse.redirect(new URL(returnTo,publicOrigin(request)),303);
  response.headers.append("set-cookie",sessionCookie);
  return response;
}
