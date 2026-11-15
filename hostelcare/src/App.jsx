import {html,useState,useMemo,useEffect,Fragment} from './lib/html.js';
import {P,ic} from './components/Icon.jsx';
import {CATS,PRIS,STS,HOS,SC,SK,PC,STAFF,STAFFL,WARD,STG,DAY,NOW,now,fd,ft,NAMES,STU,T,SEED,NOTES,USERS,NAV,hrs,fh,avgRes,wk,count} from './data/mockData.js';
import {Badge,Pri,Modal,Confirm,Field,Stat,Head,Empty,Demo,Toasts} from './components/ui.jsx';
import {Donut,Bars,Line,Heat} from './components/charts.jsx';
import {COL,flt,FBar,CTable,Timeline} from './components/ComplaintTable.jsx';
import {Banner,Cards,RecentList} from './components/DashboardParts.jsx';
import {Detail} from './components/ComplaintDetail.jsx';
import {Shell} from './layouts/Shell.jsx';
import {Login} from './pages/Login.jsx';
import {MyC} from './pages/ComplaintList.jsx';
import {Notes,Profile,Students} from './pages/SharedPages.jsx';
import {SOverview,SRegister,STrack} from './dashboards/StudentDashboard.jsx';
import {Insights,Perf,AOverview,Analytics,Hostels,Wardens,Reports,Settings} from './dashboards/AdminDashboard.jsx';
import {WOverview,WUpdate} from './dashboards/WardenDashboard.jsx';

export default function App(){const [user,setUser]=useState(null),[page,setPage]=useState('overview'),[stack,setStack]=useState([]),[cs,setCs]=useState(SEED),[notes,setNotes]=useState(NOTES),[toasts,setT]=useState([]),[openId,setOpen]=useState(null),[menu,setMenu]=useState(false),[tid,setTid]=useState(null),[lo,setLo]=useState(false),[dl,setDl]=useState(null);
 const toast=(m,undo,type)=>{const id=Math.random();setT(t=>[...t,{id,m,undo,type}]);setTimeout(()=>setT(t=>t.filter(a=>a.id!==id)),5500)};
 const note=(txt,to=['student','warden','admin'],type='status')=>setNotes(n=>[{id:Math.random(),txt,time:now(),read:false,type,to},...n]);
 const act=(id,fn,msg,nt)=>{const prev=cs;setCs(p=>p.map(c=>c.id===id?fn({...c}):c));toast(msg,()=>{setCs(prev);toast('Action undone')});nt&&note(nt)};
 const del=id=>{const prev=cs;setCs(p=>p.filter(c=>c.id!==id));toast(id+' deleted',()=>{setCs(prev);toast('Complaint restored')})};
 const addC=c=>{setCs(p=>[c,...p]);note('New complaint '+c.id+' ('+c.pri+'): '+c.title,['warden','admin'],c.pri==='Emergency'?'alert':'status');toast('Complaint '+c.id+' submitted')};
 const go=p=>{setStack(s=>[...s,page]);setPage(p);setMenu(false);scrollTo(0,0)},back=()=>{const s=[...stack],p=s.pop();if(p){setStack(s);setPage(p);setMenu(false)}};
 const login=r=>{setUser(USERS[r]);setPage('overview');setStack([]);setTid(null);toast('Signed in as '+USERS[r].name)};
 if(!user)return html`<${Fragment}><${Login} onLogin=${login}/><${Toasts} toasts=${toasts} setT=${setT}/><//>`;
 const unread=notes.filter(n=>n.to.includes(user.role)&&!n.read).length,x={user,setUser,cs,setCs,notes,setNotes,page,go,back,stack,menu,setMenu,unread,act,del,addC,toast,note,tid,setTid,open:setOpen,setDel:setDl,setLogout:setLo},r=user.role,mine=r==='student'?cs.filter(c=>c.student===user.name):r==='warden'?cs.filter(c=>c.warden===user.name):cs;
 const S={overview:{student:SOverview,admin:AOverview,warden:WOverview},register:{student:SRegister},track:{student:STrack},notes:{student:Notes,admin:Notes,warden:Notes},profile:{student:Profile,warden:Profile},students:{admin:Students,warden:Students},hostels:{admin:Hostels},analytics:{admin:Analytics},wardens:{admin:Wardens},reports:{admin:Reports},settings:{admin:Settings},update:{warden:WUpdate}};
 let body;const cc=cs.find(c=>c.id===openId);
 if(page==='mine')body=html`<${MyC} x=${x} rows=${mine} title="My complaints" sub="Search, filter and sort everything you have reported" show=${['cat','pri','status','sort']} cols=${['id','title','cat','pri','date','warden','status']}/>`;
 else if(page==='assigned')body=html`<${MyC} x=${x} rows=${mine} title="Assigned complaints" sub="Complaints for your hostels" show=${['cat','pri','status','sort']} cols=${['id','title','student','room','pri','date','status']}/>`;
 else if(page==='all')body=html`<${MyC} x=${x} rows=${cs} title=${r==='admin'?'All complaints':'All hostel complaints'} sub="Every complaint across the hostels" show=${['cat','pri','status','hostel','range','sort']} cols=${['id','student','room','cat','pri','staff','status','date']} extra=${r==='admin'?(c=>html`<button class="bg !px-2.5 !py-1 !text-red-600" aria-label=${'Delete '+c.id} onClick=${()=>setDl(c.id)}>${ic('trash',15)}</button>`):null}/>`;
 else{const C=S[page]&&S[page][r];body=C?html`<${C} x=${x}/>`:html`<${Empty} t="Page not available" s="Use the menu to go to another page."/>`}
 return html`<${Fragment}><${Shell} x=${x}>${body}<//>${cc&&html`<${Detail} key=${cc.id} c=${cc} x=${x} onClose=${()=>setOpen(null)}/>`}${lo&&html`<${Confirm} title="Log out?" msg="You will return to the sign-in page. Your demo changes stay until you refresh." label="Log out" onNo=${()=>setLo(false)} onYes=${()=>{setLo(false);setUser(null);setOpen(null)}}/>`}${dl&&html`<${Confirm} title=${'Delete '+dl+'?'} msg="This removes the complaint from the demo list. You can undo it for a few seconds." label="Delete" danger onNo=${()=>setDl(null)} onYes=${()=>{del(dl);setDl(null)}}/>`}<${Toasts} toasts=${toasts} setT=${setT}/><//>`}
