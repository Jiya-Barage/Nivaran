import {html,useState,useMemo,useEffect,Fragment} from '../lib/html.js';
import {P,ic} from './Icon.jsx';
import {CATS,PRIS,STS,HOS,SC,SK,PC,STAFF,STAFFL,WARD,STG,DAY,NOW,now,fd,ft,NAMES,STU,T,SEED,NOTES,USERS,NAV,hrs,fh,avgRes,wk,count,distinctValues} from '../data/mockData.js';
import {Badge,Pri,Modal,Confirm,Field,Stat,Head,Empty,Demo,Toasts} from './ui.jsx';
import {Donut,Bars,Line,Heat} from './charts.jsx';

export const COL={id:['Complaint ID',c=>html`<b class="text-navy">${c.id}</b>`],title:['Title',c=>html`<span class="block max-w-[220px] truncate" title=${c.title}>${c.title}</span>`],student:['Student',c=>c.student],room:['Room',c=>c.hostel+' '+c.room],cat:['Category',c=>c.cat],pri:['Priority',c=>html`<${Pri} p=${c.pri}/>`],date:['Date',c=>fd(c.date)],warden:['Assigned warden',c=>c.warden],staff:['Assigned to',c=>c.staff||html`<span class="text-slate-400">Not assigned</span>`],status:['Status',c=>html`<${Badge} s=${c.status}/>`]};

export const flt=(rows,f)=>{const q=(f.q||'').toLowerCase();let r=rows.filter(c=>(!q||(c.id+c.title+c.student+c.room).toLowerCase().includes(q))&&(!f.cat||c.cat===f.cat)&&(!f.pri||c.pri===f.pri)&&(!f.status||c.status===f.status)&&(!f.hostel||c.hostel===f.hostel)&&(!f.range||NOW-new Date(c.date)<=f.range*DAY));return[...r].sort((a,b)=>f.sort==='old'?new Date(a.date)-new Date(b.date):f.sort==='pri'?PRIS.indexOf(b.pri)-PRIS.indexOf(a.pri):new Date(b.date)-new Date(a.date))};

export const FBar=({f,set,show=['cat','pri','status'],rows=[]})=>{
 const categories=distinctValues(rows,'cat',CATS),priorities=distinctValues(rows,'pri',PRIS),statuses=distinctValues(rows,'status',STS),hostels=distinctValues(rows,'hostel',HOS);
 const S=(k,l,o)=>html`<select class="inp !w-auto" aria-label=${l} value=${f[k]||''} onChange=${e=>set({...f,[k]:e.target.value})}><option value="">${l}</option>${o.map(x=>html`<option>${x}</option>`)}</select>`;
 const act=Object.values(f).some(v=>v&&v!=='new');
 return html`<div class="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
  <div class="relative min-w-[180px] flex-1"><span class="pointer-events-none absolute left-3 top-2.5 text-slate-400">${ic('search',16)}</span><input class="inp !pl-9" placeholder="Search by ID, title, student or room" aria-label="Search complaints" value=${f.q||''} onInput=${e=>set({...f,q:e.target.value})}/></div>
  ${show.includes('cat')&&S('cat','All categories',categories)}
  ${show.includes('pri')&&S('pri','All priorities',priorities)}
  ${show.includes('status')&&S('status','All statuses',statuses)}
  ${show.includes('hostel')&&S('hostel','All hostels',hostels)}
  ${show.includes('range')&&html`<select class="inp !w-auto" aria-label="Date range" value=${f.range||''} onChange=${e=>set({...f,range:+e.target.value||''})}><option value="">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select>`}
  ${show.includes('sort')&&html`<select class="inp !w-auto" aria-label="Sort" value=${f.sort||'new'} onChange=${e=>set({...f,sort:e.target.value})}><option value="new">Newest first</option><option value="old">Oldest first</option><option value="pri">Highest priority</option></select>`}
  ${act&&html`<button class="bg" onClick=${()=>set({})}>${ic('x',14)}Clear</button>`}
 </div>`;
};

export const CTable=({rows,cols,x,extra,f,setF,show,title,pageSize=10})=>{
 const [n,setN]=useState(pageSize),r=flt(rows,f||{});
 return html`<div class="card overflow-hidden">${title&&html`<div class="flex items-center justify-between px-4 pt-4"><h2 class="font-bold text-navy">${title}</h2><span class="text-xs text-slate-500">${r.length} of ${rows.length}</span></div>`}${f&&html`<${FBar} f=${f} set=${setF} show=${show} rows=${rows}/>`}${r.length?html`<div class="overflow-x-auto"><table class="w-full"><thead><tr>${cols.map(k=>html`<th class="th">${COL[k][0]}</th>`)}<th class="th text-right">Actions</th></tr></thead><tbody class="divide-y divide-slate-100">${r.slice(0,n).map(c=>html`<tr class=${'hover:bg-slate-50 '+((c.pri==='Emergency'&&c.status!=='Resolved')?'bg-red-50/60':'')}>${cols.map(k=>html`<td class="td">${COL[k][1](c)}</td>`)}<td class="td"><div class="flex justify-end gap-1"><button class="bg !px-2.5 !py-1" onClick=${()=>x.open(c.id)} aria-label=${'View '+c.id}>${ic('eye',15)}View</button>${extra&&extra(c)}</div></td></tr>`)}</tbody></table></div>${r.length>n&&html`<div class="border-t border-slate-100 p-3 text-center"><button class="bg" onClick=${()=>setN(n+10)}>Show more (${r.length-n} left)</button></div>`}`:html`<${Empty} t="No complaints match" s="Try clearing a filter or searching with different words."/>`}</div>`;
};

export const Timeline=({c})=>html`<ol class="relative ml-3 border-l-2 border-slate-200">${STG.map(([t,d],i)=>{const done=!!c.t[i],cur=done&&!c.t[i+1]&&c.status!=='Resolved'&&c.status!=='Rejected';return html`<li class="mb-5 ml-6 last:mb-0"><span class=${'absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full ring-4 ring-white '+(done?'bg-teal text-white':'bg-slate-200 text-slate-400')}>${done?ic('check',14):html`<i class="h-1.5 w-1.5 rounded-full bg-slate-400"/>`}</span><div class="flex flex-wrap items-center gap-2"><b class=${done?'text-navy':'text-slate-400'}>${t}</b>${cur&&html`<span class="rounded bg-amber/20 px-1.5 text-[11px] font-semibold text-amber-800">Current</span>`}</div><p class=${'text-sm '+(done?'text-slate-600':'text-slate-400')}>${done?d:'Waiting for this step.'}</p>${done&&html`<p class="text-xs text-slate-400">${ft(c.t[i])}</p>`}</li>`})}${c.status==='Rejected'&&html`<li class="ml-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">This complaint was rejected. Please contact the warden for details.</li>`}</ol>`;

