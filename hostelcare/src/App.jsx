import {html,useState,useMemo,useEffect,Fragment} from './lib/html.js';
import {api} from './lib/api.js';
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

const normalizeAuthUser = u => {
  const role = (u && (u.role || '')).toLowerCase();
  return {
    ...u,
    role,
    name: u?.name || u?.fullName || u?.username || 'User',
    title: role === 'warden' ? 'Warden' : role === 'admin' ? 'Admin' : 'Student',
  };
};

const DEMO_DATA_KEY='hostelcare-demo-data';

function readDemoData(){if(!import.meta.env.DEV)return{complaints:SEED,notes:NOTES};try{const saved=localStorage.getItem(DEMO_DATA_KEY);if(!saved)return{complaints:SEED,notes:NOTES};const data=JSON.parse(saved);return{complaints:Array.isArray(data.complaints)?data.complaints:SEED,notes:Array.isArray(data.notes)?data.notes:NOTES};}catch(error){console.error('Could not load saved demo data:',error);return{complaints:SEED,notes:NOTES};}}

function writeDemoData(data){try{const saved=JSON.parse(localStorage.getItem(DEMO_DATA_KEY)||'{}');localStorage.setItem(DEMO_DATA_KEY,JSON.stringify({...data,deletedComplaints:Array.isArray(saved.deletedComplaints)?saved.deletedComplaints:[]}));}catch(error){console.error('Could not save demo data:',error);}}

export default function App(){const [initialDemoData]=useState(readDemoData),[user,setUser]=useState(null),[page,setPage]=useState('overview'),[stack,setStack]=useState([]),[cs,setCs]=useState(initialDemoData.complaints),[notes,setNotes]=useState(initialDemoData.notes),[toasts,setT]=useState([]),[openId,setOpen]=useState(null),[menu,setMenu]=useState(false),[tid,setTid]=useState(null),[lo,setLo]=useState(false),[dl,setDl]=useState(null),[authReady,setAuthReady]=useState(false);
 const toast=(m,undo,type)=>{const id=Math.random();setT(t=>[...t,{id,m,undo,type}]);setTimeout(()=>setT(t=>t.filter(a=>a.id!==id)),5500)};
 const note=(txt,to=['student','warden','admin'],type='status')=>setNotes(n=>[{id:Math.random(),txt,time:now(),read:false,type,to},...n]);
 const act=async(id,fn,msg,nt)=>{const prev=cs.find(c=>c.id===id);if(!prev)return;const next=fn({...prev});try{const saved=await api.updateComplaint(id,next);setCs(p=>p.map(c=>c.id===id?saved:c));toast(msg,async()=>{try{const restored=await api.updateComplaint(id,prev);setCs(p=>p.map(c=>c.id===id?restored:c));toast('Action undone')}catch(error){toast('Could not undo update: '+error.message)}});nt&&note(nt)}catch(error){toast('Could not save complaint update: '+error.message)}};
 const del=async id=>{const prev=cs.find(c=>c.id===id);if(!prev)return;try{await api.deleteComplaint(id);setCs(p=>p.filter(c=>c.id!==id));toast(id+' deleted',async()=>{try{const restored=await api.restoreComplaint(id);setCs(p=>[restored,...p]);toast('Complaint restored')}catch(error){toast('Could not restore complaint: '+error.message)}})}catch(error){toast('Could not delete complaint: '+error.message)}};
 const addC=async c=>{const saved=await api.createComplaint(c);setCs(p=>[saved,...p.filter(item=>item.id!==saved.id)]);note('New complaint '+saved.id+' ('+saved.pri+'): '+saved.title,['warden','admin'],saved.pri==='Emergency'?'alert':'status');toast('Complaint '+saved.id+' submitted');return saved};
 const go=p=>{setStack(s=>[...s,page]);setPage(p);setMenu(false);scrollTo(0,0)},back=()=>{const s=[...stack],p=s.pop();if(p){setStack(s);setPage(p);setMenu(false)}};

 useEffect(()=>{if(import.meta.env.DEV)writeDemoData({complaints:cs,notes});},[cs,notes]);
 useEffect(()=>{if(!import.meta.env.DEV)return;const syncDemoData=e=>{if(e.key!==DEMO_DATA_KEY)return;if(!e.newValue){setCs(SEED);setNotes(NOTES);return;}try{const data=JSON.parse(e.newValue);if(Array.isArray(data.complaints)&&Array.isArray(data.notes)){setCs(data.complaints);setNotes(data.notes);}}catch(error){console.error('Could not sync saved demo data:',error);}};window.addEventListener('storage',syncDemoData);return()=>window.removeEventListener('storage',syncDemoData);},[]);

 useEffect(()=>{let active=true;const loadSession=async()=>{try{const {user:sessionUser}=await api.getCurrentUser();if(active&&sessionUser){const complaints=await api.getComplaints();if(active&&Array.isArray(complaints))setCs(complaints);if(active)setUser(normalizeAuthUser(sessionUser));}}catch(e){if(active)setUser(null);}finally{if(active)setAuthReady(true);}};loadSession();return()=>{active=false};},[]);

 const login=async credentials=>{const {user:nextUser}=await api.login(credentials);const authUser=normalizeAuthUser(nextUser);const complaints=await api.getComplaints();if(Array.isArray(complaints))setCs(complaints);setUser(authUser);setPage('overview');setStack([]);setTid(null);toast('Signed in as '+authUser.name);return authUser};
 const register=async payload=>{await api.register(payload);return true};
 const logoutUser=async()=>{try{await api.logout();}finally{setUser(null);setOpen(null);setPage('overview');setStack([]);}};
 if(!authReady)return html`<${Fragment}><div class="grid min-h-screen place-items-center bg-slate-100 text-lg font-semibold text-slate-700">Loading HostelCare...</div><${Toasts} toasts=${toasts} setT=${setT}/><//>`;
 if(!user)return html`<${Fragment}><${Login} onLogin=${login} onRegister=${register}/><${Toasts} toasts=${toasts} setT=${setT}/><//>`;
 const unread=notes.filter(n=>n.to.includes(user.role)&&!n.read).length,r=user.role,wardenComplaints=r==='warden'?cs:[],x={user,setUser,cs,setCs,notes,setNotes,page,go,back,stack,menu,setMenu,unread,act,del,addC,toast,note,tid,setTid,open:setOpen,setDel:setDl,setLogout:setLo,wardenComplaints},mine=r==='student'?cs.filter(c=>c.studentUserId!=null?String(c.studentUserId)===String(user.userId):c.student===user.name):r==='warden'?wardenComplaints:cs;
 const S={overview:{student:SOverview,admin:AOverview,warden:WOverview},register:{student:SRegister},track:{student:STrack},notes:{student:Notes,admin:Notes,warden:Notes},profile:{student:Profile,warden:Profile},students:{admin:Students,warden:Students},hostels:{admin:Hostels},analytics:{admin:Analytics},wardens:{admin:Wardens},reports:{admin:Reports},settings:{admin:Settings},update:{warden:WUpdate}};
 let body;const cc=cs.find(c=>c.id===openId);
 if(page==='mine')body=html`<${MyC} x=${x} rows=${mine} title="My complaints" sub="Search, filter and sort everything you have reported" show=${['cat','pri','status','sort']} cols=${['id','title','cat','pri','date','warden','status']}/>`;
 else if(page==='assigned')body=html`<${MyC} x=${x} rows=${mine} title="Assigned complaints" sub="Complaints for your hostels" show=${['cat','pri','status','sort']} cols=${['id','title','student','room','pri','date','status']}/>`;
 else if(page==='all')body=html`<${MyC} x=${x} rows=${cs} title=${r==='admin'?'All complaints':'All hostel complaints'} sub="Every complaint across the hostels" show=${['cat','pri','status','hostel','range','sort']} cols=${['id','student','room','cat','pri','staff','status','date']} extra=${r==='admin'?(c=>html`<button class="bg !px-2.5 !py-1 !text-red-600" aria-label=${'Delete '+c.id} onClick=${()=>setDl(c.id)}>${ic('trash',15)}</button>`):null}/>`;
 else{const C=S[page]&&S[page][r];body=C?html`<${C} x=${x}/>`:html`<${Empty} t="Page not available" s="Use the menu to go to another page."/>`}
 return html`<${Fragment}><${Shell} x=${x}>${body}<//>${cc&&html`<${Detail} key=${cc.id} c=${cc} x=${x} onClose=${()=>setOpen(null)}/>`}${lo&&html`<${Confirm} title="Log out?" msg="You will return to the sign-in page. Your demo changes are saved in this browser." label="Log out" onNo=${()=>setLo(false)} onYes=${async()=>{setLo(false);await logoutUser();}}/>`}${dl&&html`<${Confirm} title=${'Delete '+dl+'?'} msg="This removes the complaint from the demo list. You can undo it for a few seconds." label="Delete" danger onNo=${()=>setDl(null)} onYes=${()=>{del(dl);setDl(null)}}/>`}<${Toasts} toasts=${toasts} setT=${setT}/><//>`}
