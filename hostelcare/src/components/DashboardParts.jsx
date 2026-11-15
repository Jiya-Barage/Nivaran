import {html,useState,useMemo,useEffect,Fragment} from '../lib/html.js';
import {P,ic} from './Icon.jsx';
import {CATS,PRIS,STS,HOS,SC,SK,PC,STAFF,STAFFL,WARD,STG,DAY,NOW,now,fd,ft,NAMES,STU,T,SEED,NOTES,USERS,NAV,hrs,fh,avgRes,wk,count} from '../data/mockData.js';
import {Badge,Pri,Modal,Confirm,Field,Stat,Head,Empty,Demo,Toasts} from './ui.jsx';
import {Donut,Bars,Line,Heat} from './charts.jsx';
import {COL,flt,FBar,CTable,Timeline} from './ComplaintTable.jsx';

export const Banner=({x,sub,children})=>html`<div class="photo mb-6 rounded-2xl p-6 text-white sm:p-8"><h1 class="text-2xl font-extrabold sm:text-3xl">Welcome back, ${x.user.name.replace(/^(Dr|Mr|Prof)\. /,'').split(' ')[0]}</h1><p class="mt-1 max-w-xl text-blue-100">${sub}</p><div class="mt-5 flex flex-wrap gap-2">${children}</div></div>`;

export const Cards=({cs,x,go})=>html`<div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><${Stat} label="Total complaints" value=${cs.length} icon="file" color="#172554" onClick=${()=>go('mine')}/><${Stat} label="Pending" value=${cs.filter(c=>c.status==='Pending').length} icon="clock" color="#F59E0B" onClick=${()=>go('mine')}/><${Stat} label="In progress" value=${cs.filter(c=>c.status==='In Progress').length} icon="wrench" color="#2563EB" onClick=${()=>go('mine')}/><${Stat} label="Resolved" value=${cs.filter(c=>c.status==='Resolved').length} icon="check" color="#16A34A" onClick=${()=>go('mine')}/></div>`;

export const RecentList=({rows,x})=>html`<div class="card"><div class="px-4 pt-4 font-bold text-navy">Recent complaints</div><ul class="divide-y divide-slate-100">${rows.slice(0,5).map(c=>html`<li><button class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50" onClick=${()=>x.open(c.id)}><div class="min-w-0 flex-1"><div class="truncate text-sm font-semibold text-slate-800">${c.title}</div><div class="text-xs text-slate-500">${c.id} - ${fd(c.date)}</div></div><${Badge} s=${c.status}/></button></li>`)}</ul></div>`;

