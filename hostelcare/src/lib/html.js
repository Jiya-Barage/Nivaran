import React from 'react';
import htm from 'htm';

// Tiny adapter so the htm templates behave like JSX in React.
const toStyle=s=>Object.fromEntries(s.split(';').filter(Boolean).map(r=>{const [k,...v]=r.split(':');return[k.trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v.join(':').trim()]}));
function h(type,props,...kids){
  let p=props?{...props}:null;
  if(p&&typeof type==='string'){
    if('class' in p){p.className=p.class;delete p.class}
    if(p.onInput&&!p.onChange&&(type==='input'||type==='textarea')){p.onChange=p.onInput;delete p.onInput}
    if(typeof p.style==='string')p.style=toStyle(p.style);
    for(const k of Object.keys(p))if(k.includes('-')&&!/^(data|aria)-/.test(k)){p[k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=p[k];delete p[k]}
  }
  return React.createElement(type,p,...kids.flat(Infinity));
}
const bound=htm.bind(h);
export const html=(...a)=>{const r=bound(...a);return Array.isArray(r)?React.createElement(React.Fragment,null,...r):r};
export const {useState,useMemo,useEffect,Fragment}=React;
