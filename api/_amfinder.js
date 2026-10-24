#!/usr/bin/env node
"use strict";

/**
 * Preset AM Finder CLI
 * Search preset by TikTok/YouTube video URL or keyword.
 * Based on the scraper supplied by the user.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import axios from "axios";

const VERSION = "1.0.0";
const BASE = "https://amfinder.web.id";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const CHALLENGEKY = ["/api/v/2b51359f"];
const HANDSHAKE_TIMEOUT = 15000;
const SSE_MAX_MS = 150000;
const HTTP_RETRY_MAX = 3;
const TOP_DEFAULT = 5;
const DELAY_DEFAULT = 1500;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clampN = v => Math.max(1, Math.min(10000, Math.floor(Number(v) || 1)));
let QUIET = false;

function log(...a) { if (!QUIET) process.stderr.write(a.join(" ") + "\n"); }
function prog(s) { if (!QUIET) process.stderr.write("\r" + s); }
function fail(msg) { process.stderr.write("[X] " + msg + "\n"); process.exitCode = 1; }

class ApiError extends Error {
  constructor(msg, {status, retryable} = {}) {
    super(msg); this.name = "ApiError"; this.status = status; this.retryable = Boolean(retryable);
  }
}
const RETRY_RE = /coba lagi|try again|429|terlalu banyak|too many|timed out|timeout|server|sebentar/i;
const retryableMsg = msg => RETRY_RE.test(String(msg || ""));
function deviceFile() { return path.join("/tmp", ".amfinder-device"); }
function readDevice() {
  try { const v = fs.readFileSync(deviceFile(), "utf8").trim(); if (v.length >= 8) return v; } catch (_) {}
  return null;
}
function saveDevice(v) { try { fs.writeFileSync(deviceFile(), v, "utf8"); } catch (_) {} }
function newDevice() {
  const v = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  saveDevice(v); return v;
}
function postRaw(challengePath, body) {
  return axios({
    method:"POST", url:BASE+challengePath, data:body, timeout:HANDSHAKE_TIMEOUT,
    headers:{"User-Agent":UA,"Content-Type":"application/json","Accept":"application/json","Origin":BASE,"Referer":BASE+"/"},
    validateStatus:()=>true
  }).then(r=>({status:r.status,json:r.data})).catch(e=>{
    throw new ApiError("handshake HTTP error: "+(e.code||e.message), {
      status:e.response?e.response.status:0, retryable:!(e.response&&e.response.status<400)
    });
  });
}
async function subtleHmacRound(saltHex, payload) {
  const subtle = crypto.webcrypto.subtle;
  const key = await subtle.importKey("raw",Buffer.from(saltHex,"hex"),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return Buffer.from(await subtle.sign("HMAC",key,payload));
}
function proofOf(salt,cid,did,ts,rounds) {
  let msg=Promise.resolve(Buffer.from(cid+"|"+did+"|"+ts));
  for(let i=0;i<clampN(rounds);i++) msg=msg.then(buf=>subtleHmacRound(salt,buf));
  return msg.then(buf=>buf.toString("hex"));
}
async function handshakeOnce(challengePath) {
  const did=readDevice()||newDevice();
  const s1=await postRaw(challengePath,{did}), j1=s1.json||{};
  if(s1.status!==200||j1.ok!==true) throw new ApiError(j1.error||"handshake gagal (HTTP "+s1.status+")",{status:s1.status,retryable:s1.status===403||s1.status===429||s1.status>=500});
  const proof=await proofOf(j1.salt,j1.cid,did,j1.ts,j1.rounds);
  const s2=await postRaw(challengePath,{cid:j1.cid,did,ts:j1.ts,proof,score:0,reasons:[]}),j2=s2.json||{};
  if(s2.status!==200||j2.ok!==true||!j2.token) throw new ApiError(j2.error||"handshake gagal (HTTP "+s2.status+")",{status:s2.status,retryable:s2.status===403||s2.status===429||s2.status>=500});
  return j2.token;
}
async function discoverChallenges() {
  const found=new Set(CHALLENGEKY);
  try {
    const home=await axios({method:"GET",url:BASE+"/",timeout:12000,headers:{"User-Agent":UA},validateStatus:()=>true});
    const html=typeof home.data==="string"?home.data:"";
    const chunks=[...(html.match(/\/_next\/static\/chunks\/[^"' ]+\.js/g)||[])].slice(0,12);
    await Promise.all(chunks.map(async f=>{
      try {
        const p=f.startsWith("http")?f:BASE+(f.startsWith("/")?f:"/"+f);
        const r=await axios({url:p,timeout:12000,headers:{"User-Agent":UA},validateStatus:()=>true});
        if(typeof r.data==="string") (String(r.data).match(/\/api\/v\/[0-9a-f]{8}/g)||[]).forEach(c=>found.add(c));
      } catch (_) {}
    }));
  } catch (_) {}
  return [...found];
}
async function getHandshakeToken() {
  let list=CHALLENGEKY.slice(),last=null;
  for(let pass=0;pass<4;pass++) {
    for(const cpath of list) {
      try { log("[-] bot-check ("+cpath+")..."); return await handshakeOnce(cpath); }
      catch(e) {
        last=e; prog("");
        if(e.status===403){newDevice();await sleep(5000);}
        else if(e.status===429) await sleep(8000);
        else if(e.status>=500) await sleep(3000);
        else if(pass===0&&list.length===CHALLENGEKY.length){list=await discoverChallenges();}
        else break;
      }
    }
  }
  throw last||new ApiError("handshake gagal");
}
function parseSseBlock(block) {
  let ev="message"; const datas=[];
  for(const line of block.split("\n")) {
    if(line.startsWith("event:")) ev=line.slice(6).trim()||"message";
    else if(line.startsWith("data:")) datas.push(line.slice(5).trim());
  }
  return datas.length?{event:ev,data:datas.join("\n")}:null;
}
function sseRun(ssePath) {
  return new Promise((resolve,reject)=>{
    let buf="",fulfilled=false,killer=null;
    const acc={logs:[],candidates:null,result:null,error:null};
    axios({method:"GET",url:BASE+ssePath,responseType:"stream",timeout:0,headers:{"User-Agent":UA,"Accept":"text/event-stream","Cache-Control":"no-cache","Referer":BASE+"/"},validateStatus:()=>true})
    .then(res=>{
      if(res.status!==200) {
        let txt="";
        res.data.on("data",c=>{txt+=c.toString();if(txt.length>400)res.data.destroy();});
        res.data.on("end",()=>reject(new ApiError("SSE HTTP "+res.status+": "+txt.slice(0,300),{status:res.status,retryable:res.status===429||res.status>=500})));
        res.data.on("error",()=>reject(new ApiError("SSE HTTP "+res.status,{status:res.status,retryable:true})));
        return;
      }
      const finish=()=>{if(fulfilled)return;fulfilled=true;clearTimeout(killer);try{res.data.destroy();}catch(_){}resolve(acc);};
      killer=setTimeout(()=>{
        if(fulfilled)return; fulfilled=true;try{res.data.destroy();}catch(_){}
        if(acc.result||acc.error)resolve(acc);else reject(new ApiError("timeout: server tidak selesai mengirim data dalam "+SSE_MAX_MS/1000+" detik",{retryable:true}));
      },SSE_MAX_MS);
      res.data.on("data",chunk=>{
        buf+=chunk.toString().replace(/\r\n/g,"\n"); let idx;
        while((idx=buf.indexOf("\n\n"))!==-1) {
          const block=buf.slice(0,idx);buf=buf.slice(idx+2);const e=parseSseBlock(block);if(!e)continue;
          if(e.event==="log"){acc.logs.push(e.data);prog("   · "+String(e.data).slice(0,160));}
          else if(e.event==="candidates"){try{acc.candidates=JSON.parse(e.data);}catch(_){acc.candidates=null;}}
          else if(e.event==="result"){try{acc.result=JSON.parse(e.data);}catch(_){acc.result=null;}finish();return;}
          else if(e.event==="error"){let msg="terjadi kesalahan dari server";try{const j=JSON.parse(e.data);msg=j.message||msg;}catch(_){msg=e.data||msg;}acc.error={message:msg};finish();return;}
        }
      });
      const end=()=>{if(fulfilled)return;if(acc.result||acc.error)finish();else{fulfilled=true;clearTimeout(killer);reject(new ApiError("koneksi SSE terputus sebelum selesai",{retryable:true}));}};
      res.data.on("end",end);res.data.on("error",end);res.data.on("close",end);
    }).catch(e=>{if(fulfilled)return;clearTimeout(killer);reject(new ApiError("gagal membuka koneksi SSE: "+(e.code||e.message),{retryable:true}));});
  });
}
function isVideoUrl(t){return /(?:https?:\/\/)?(?:[\w-]*\.)*(?:tiktok\.com|youtu\.be|youtube\.com)/i.test(t||"");}
async function apiFind(inputUrl) {
  let lastErr=null;
  for(let attempt=1;attempt<=HTTP_RETRY_MAX;attempt++){
    const token=await getHandshakeToken(),p="/api/find?url="+encodeURIComponent(inputUrl)+"&t="+encodeURIComponent(token);
    log("[-] memindai video (percobaan "+attempt+"): "+inputUrl);prog("");
    const got=await sseRun(p);
    if(got.error){const msg=got.error.message;if(retryableMsg(msg)&&attempt<HTTP_RETRY_MAX){await sleep(4000+attempt*1500);lastErr=new ApiError(msg,{retryable:true});continue;}throw new ApiError(msg);}
    if(got.result){const r=got.result;if(r.ok===false){const msg=r.error||"target tidak dapat memproses link ini";if(retryableMsg(msg)&&attempt<HTTP_RETRY_MAX){await sleep(4000+attempt*1500);lastErr=new ApiError(msg,{retryable:true});continue;}throw new ApiError(msg);}r.logs=got.logs||[];return r;}
    lastErr=new ApiError("tidak ada data yang diterima dari server",{retryable:true});await sleep(3000);
  }
  throw lastErr||new ApiError("pemindaian gagal");
}
async function apiSearch(keyword) {
  let lastErr=null;
  for(let attempt=1;attempt<=HTTP_RETRY_MAX;attempt++){
    const token=await getHandshakeToken(),p="/api/search?mode=pick&q="+encodeURIComponent(keyword)+"&t="+encodeURIComponent(token);
    log('[-] mencari kata kunci "'+keyword+'" (percobaan '+attempt+")");prog("");
    const got=await sseRun(p);
    if(got.error){const msg=got.error.message;if(retryableMsg(msg)&&attempt<HTTP_RETRY_MAX){await sleep(4000+attempt*1500);lastErr=new ApiError(msg,{retryable:true});continue;}throw new ApiError(msg);}
    if(got.result||got.candidates)return {items:(got.candidates&&got.candidates.items)||[],fromCache:got.candidates?got.candidates.fromCache:null,meta:got.result||null};
    lastErr=new ApiError("tidak ada data yang diterima dari server",{retryable:true});await sleep(3000);
  }
  throw lastErr||new ApiError("pencarian gagal");
}
const YT_RE=/youtu\.be|youtube\.com/i;
function detectSource(u){return YT_RE.test(u||"")?"youtube":"tiktok";}
function hashtagsOf(t){const out=[],re=/#([\p{L}\p{N}_]+)/gu;let m;while((m=re.exec(String(t||""))))out.push("#"+m[1]);return [...new Set(out)];}
function isoTime(raw){const n=Number(raw);if(!Number.isFinite(n)||n<=0)return {ms:null,iso:null};const ms=n<1e12?n*1000:n;return {ms:Math.round(ms),iso:new Date(ms).toISOString()};}
function fmtLink(l,i){return {no:i+1,tipe:l.type||null,judul:l.title||null,url:l.url,ukuran_file:l.size||null,rasio:l.ratio||null,thumbnail:l.thumb||null,thumbs:Array.isArray(l.thumbs)?l.thumbs:[],diperoleh_dari:l.source||null,komentar:l.detail||null,dari_creator_video:l.byAuthor===true,disematkan:l.pinned===true,terverifikasi:l.verified===true};}
function mapFindResult(r){
  const v=r.video||{},st=v.stats||{},ad=r.authorDetail||{},src=detectSource(r.videoUrl||v.url||""),links=Array.isArray(r.presetLinks)?r.presetLinks:[];
  const videoId=r.videoId||v.id||null,shareUrl=videoId?BASE+"/preset/"+src+"/"+videoId:null;
  return {success:r.found!==false&&links.length>0,mode:"link_video",input:r.input||"",sumber:src,nama_creator:ad.nickname||r.author||null,handle_creator:ad.uniqueId?"@"+ad.uniqueId:(r.author||null),bio_creator:ad.bio||null,bio_link_creator:ad.bioLink||null,avatar_creator:ad.avatar||null,like:st.likes??null,comment:st.comments??null,favorite_video:st.favorite??null,views:st.views??null,jumlah_share:st.shares??null,tautan_share:shareUrl,tautan_video:r.videoUrl||v.url||null,video_id:videoId,judul_video:v.title||null,caption:v.description||null,hastag:hashtagsOf(v.description||""),thumbnail:v.cover||null,diupload_at:isoTime(v.createTime).iso,musik:v.music?{judul:v.music.title||null,author:v.music.author||null,original:v.music.original===true,cover:v.music.cover||null,audio_url:v.music.playUrl||null}:null,link_preset:links.map(l=>l.url).filter(Boolean),preset:links.map(fmtLink),tautan_lain:Array.isArray(r.otherLinks)?r.otherLinks:[],cakupan_pemindaian:{deskripsi:r.scanned?Boolean(r.scanned.description):null,bio:r.scanned?Boolean(r.scanned.bio):null,halaman_biolink:r.scanned?Boolean(r.scanned.bioLinkPage):null,komentar_dipindai:r.scanned&&r.scanned.comments!=null?r.scanned.comments:null,balasan_komentar:r.scanned&&r.scanned.replies!=null?r.scanned.replies:null,komentar_dinonaktifkan:(r.checked&&r.checked.commentsDisabled)===true},kata_kunci_konteks:Array.isArray((r.context||{}).matched)?r.context.matched:[],pesan:links.length===0?((r.checked&&r.checked.commentsDisabled)?"Komentar video dinonaktifkan kreator. Link preset tidak dapat diperiksa.":"Video ini tidak mengandung preset!"):null,log_proses:r.logs||[]};
}
function mapSearchItem(it){
  const src=it.url&&/youtube|youtu\.be/i.test(it.url)?"youtube":"tiktok";
  const m=/\/video\/(\d+)|[?&]v=([A-Za-z0-9_-]{6,})|youtu\.be\/([A-Za-z0-9_-]{6,})/.exec(it.url||""),vid=m?m[1]||m[2]||m[3]:null;
  return {url_video:it.url,handle:it.handle||null,snippet_caption:it.snippet||null,hastag:hashtagsOf(it.snippet||""),thumbnail:it.thumb||null,durasi_detik:it.duration??null,views:it.stats&&it.stats.playCount||null,like:it.stats&&it.stats.likeCount||null,tautan_share:vid?BASE+"/preset/"+src+"/"+vid:null};
}
/* ------------------------------------------------------ Vercel API module */

export async function keywordSearch(target, top = 3, delay = 500) {
  const input = String(target || "").trim();
  if (input.length < 3) throw new ApiError("Kata kunci minimal 3 karakter.");
  if (input.length > 180) throw new ApiError("Kata kunci terlalu panjang.");

  const s = await apiSearch(input);
  const items = s.items || [];
  if (!items.length) return {
    success: false, mode: "pencarian_kata_kunci", input, total_hasil: 0,
    hasil_pencarian: [], semua_hasil_dipindai: [], total_link_preset: 0,
    pesan: "Tidak ada video yang ditemukan untuk kata kunci ini."
  };

  const out = {
    success: true, mode: "pencarian_kata_kunci", input, total_hasil: items.length,
    hasil_pencarian: items.map(mapSearchItem), semua_hasil_dipindai: []
  };
  const count = Math.min(Math.max(1, Number(top) || 3), items.length);
  for (let i = 0; i < count; i++) {
    const it = items[i];
    try {
      if (delay > 0) await sleep(delay);
      const r = await apiFind(it.url);
      out.semua_hasil_dipindai.push({ no: i + 1, url: it.url, data: mapFindResult(r) });
    } catch (e) {
      out.semua_hasil_dipindai.push({ no: i + 1, url: it.url, error: e.message || String(e) });
    }
  }
  out.total_link_preset = out.semua_hasil_dipindai.reduce(
    (sum, entry) => sum + ((entry.data && entry.data.link_preset && entry.data.link_preset.length) || 0), 0
  );
  out.success = out.total_link_preset > 0;
  return out;
}
