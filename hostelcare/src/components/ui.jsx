import {html,useState,useMemo,useEffect,Fragment} from '../lib/html.js';
import {P,ic} from './Icon.jsx';
import {CATS,PRIS,STS,HOS,SC,SK,PC,STAFF,STAFFL,WARD,STG,DAY,NOW,now,fd,ft,NAMES,STU,T,SEED,NOTES,USERS,NAV,hrs,fh,avgRes,wk,count} from '../data/mockData.js';

export const Badge=({s})=>html`<span class=${'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold '+SC[s]}><i class="h-1.5 w-1.5 rounded-full" style=${{background:SK[s]}}/>${s}</span>`;

export const Pri=({p})=>html`<span class=${'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold '+PC[p]}>${(p==='Emergency'||p==='High')&&ic('alert',12)}${p}</span>`;

export const Modal=({title,onClose,children,w='max-w-lg'})=>{useEffect(()=>{const k=e=>e.key==='Escape'&&onClose();addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[]);return html`<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4" onClick=${e=>e.target===e.currentTarget&&onClose()} role="dialog" aria-modal="true"><div class=${'slide card w-full max-h-[92vh] overflow-y-auto '+w}><div class="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 class="font-bold text-navy">${title}</h3><button class="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close" onClick=${onClose}>${ic('x')}</button></div><div class="p-5">${children}</div></div></div>`};

export const Confirm=({title,msg,label='Confirm',danger,onYes,onNo})=>html`<${Modal} title=${title} onClose=${onNo} w="max-w-sm"><p class="text-sm text-slate-600">${msg}</p><div class="mt-5 flex justify-end gap-2"><button class="bg" onClick=${onNo}>Cancel</button><button class=${danger?'bd':'bp'} onClick=${onYes}>${label}</button></div><//>`;

export const Field=({label,err,hint,children})=>html`<label class="block"><span class="mb-1 block text-sm font-semibold text-slate-700">${label}</span>${children}${err?html`<span class="mt-1 flex items-center gap-1 text-xs font-medium text-red-600" role="alert">${ic('alert',12)}${err}</span>`:hint&&html`<span class="mt-1 block text-xs text-slate-500">${hint}</span>`}</label>`;

export const Stat=({label,value,icon,color,sub,onClick})=>html`<button onClick=${onClick} class="card flex items-center gap-4 p-4 text-left transition hover:border-teal hover:shadow-md"><span class="grid h-11 w-11 place-items-center rounded-lg text-white" style=${{background:color}}>${ic(icon,20)}</span><span><span class="block text-2xl font-extrabold text-navy leading-none">${value}</span><span class="mt-1 block text-xs font-medium text-slate-500">${label}</span>${sub&&html`<span class="block text-[11px] text-slate-400">${sub}</span>`}</span></button>`;

export const Head=({t,sub,children})=>html`<div class="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 class="text-xl font-extrabold text-navy sm:text-2xl">${t}</h1>${sub&&html`<p class="text-sm text-slate-500">${sub}</p>`}</div><div class="flex gap-2">${children}</div></div>`;

export const Empty=({t,s})=>html`<div class="p-10 text-center"><div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">${ic('search',22)}</div><p class="font-semibold text-slate-700">${t}</p><p class="text-sm text-slate-500">${s}</p></div>`;

export const Demo=()=>html`<span class="rounded bg-amber/20 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Demo data</span>`;


export const Toasts=({toasts,setT})=>html`<div class="fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">${toasts.map(t=>html`<div class=${'slide flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg '+(t.type==='err'?'bg-red-600':'bg-navy')}><span class=${t.type==='err'?'':'text-green-400'}>${ic(t.type==='err'?'alert':'check',18)}</span><span class="flex-1">${t.m}</span>${t.undo&&html`<button class="flex items-center gap-1 rounded bg-white/15 px-2 py-1 text-xs font-bold hover:bg-white/25" onClick=${()=>{t.undo();setT(a=>a.filter(z=>z.id!==t.id))}}>${ic('undo',13)}Undo</button>`}</div>`)}</div>`;

