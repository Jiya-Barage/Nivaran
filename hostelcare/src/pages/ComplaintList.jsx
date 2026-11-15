import {html,useState,useMemo,useEffect,Fragment} from '../lib/html.js';
import {P,ic} from '../components/Icon.jsx';
import {CATS,PRIS,STS,HOS,SC,SK,PC,STAFF,STAFFL,WARD,STG,DAY,NOW,now,fd,ft,NAMES,STU,T,SEED,NOTES,USERS,NAV,hrs,fh,avgRes,wk,count} from '../data/mockData.js';
import {Badge,Pri,Modal,Confirm,Field,Stat,Head,Empty,Demo,Toasts} from '../components/ui.jsx';
import {Donut,Bars,Line,Heat} from '../components/charts.jsx';
import {COL,flt,FBar,CTable,Timeline} from '../components/ComplaintTable.jsx';
import {Banner,Cards,RecentList} from '../components/DashboardParts.jsx';
import {Detail} from '../components/ComplaintDetail.jsx';

export function MyC({x,rows,title,sub,show,cols,extra}){const [f,setF]=useState({sort:'new'});return html`<div><${Head} t=${title} sub=${sub}>${x.user.role==='student'&&html`<button class="bt" onClick=${()=>x.go('register')}>${ic('plus',16)}New complaint</button>`}</${Head}><${CTable} rows=${rows} cols=${cols} x=${x} f=${f} setF=${setF} show=${show} extra=${extra}/></div>`}
