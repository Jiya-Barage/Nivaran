
export const CATS=['Electrical','Plumbing','Cleaning','Internet/Wi-Fi','Furniture','Water Supply','Security','Other'],PRIS=['Low','Medium','High','Emergency'],STS=['Pending','In Progress','Resolved','Rejected'],HOS=['Sahyadri','Godavari','Krishna','Bhima'];

export const SC={Pending:'bg-amber-100 text-amber-800','In Progress':'bg-blue-100 text-blue-800',Resolved:'bg-green-100 text-green-800',Rejected:'bg-red-100 text-red-800'},SK={Pending:'#F59E0B','In Progress':'#2563EB',Resolved:'#16A34A',Rejected:'#DC2626'};

export const PC={Low:'bg-slate-100 text-slate-700',Medium:'bg-sky-100 text-sky-800',High:'bg-orange-100 text-orange-800',Emergency:'bg-red-600 text-white'};

export const STAFF={Electrical:'Ramesh Pawar (Electrician)',Plumbing:'Sunil Gaikwad (Plumber)',Cleaning:'Kavita More (Housekeeping)','Internet/Wi-Fi':'Imran Shaikh (Network)',Furniture:'Dattu Jadhav (Carpenter)','Water Supply':'Sunil Gaikwad (Plumber)',Security:'Capt. Bhalerao (Security)',Other:'Ramesh Pawar (Electrician)'};

export const STAFFL=[...new Set(Object.values(STAFF))];

export const WARD={Sahyadri:'Dr. Meera Deshpande',Godavari:'Dr. Meera Deshpande',Krishna:'Mr. Rahul Joshi',Bhima:'Mr. Rahul Joshi'};

export const STG=[['Complaint submitted','Your complaint was logged and sent to the hostel warden.'],['Reviewed by warden','The warden reviewed and accepted the complaint.'],['Assigned to maintenance','A maintenance staff member has been assigned.'],['Work in progress','Maintenance work has started on site.'],['Complaint resolved','The issue was fixed and the complaint closed.']];

export const DAY=864e5,NOW=new Date('2026-11-02T10:00:00').getTime(),now=()=>new Date().toISOString();

export const fd=d=>new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),ft=d=>new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});

export const NAMES=['Aarav Kulkarni','Isha Patil','Rohan Deshmukh','Sneha Joshi','Karan Mehta','Ananya Iyer','Vikram Shinde','Priya Nair','Omkar Bhosale','Meera Reddy'];

export const STU=NAMES.map((n,i)=>({name:n,prn:String(22110451+i*13),hostel:HOS[i%4],room:i?String(100*(1+i%3)+1+i*7):'204',phone:'98'+(21000000+i*173911),email:n.toLowerCase().split(' ')[0]+'.'+n.toLowerCase().split(' ')[1]+'@mitcoe.edu.in',year:['FY','SY','TY','BTech'][i%4]}));

export const T=[['Electrical','Tube light flickering in corridor'],['Plumbing','Water leakage from bathroom tap'],['Cleaning','Washroom not cleaned for 3 days'],['Internet/Wi-Fi','Wi-Fi router down on 2nd floor'],['Furniture','Study table drawer broken'],['Water Supply','No hot water in the morning'],['Security','Main gate lock is faulty'],['Electrical','Ceiling fan making loud noise'],['Plumbing','Flush tank not filling'],['Internet/Wi-Fi','Very slow internet in the evening'],['Cleaning','Mess area needs deep cleaning'],['Furniture','Mattress is torn and sagging'],['Water Supply','Low water pressure on 3rd floor']];

export const SEED=Array.from({length:26},(_,i)=>{const [cat,title]=T[i%T.length],mine=i%3==0,si=mine?0:1+i%9,hostel=mine?HOS[0]:HOS[[0,0,1,0,2,1,3,0][i%8]],status=STS[[2,2,0,1,2,0,1,2,3,0,2,1][i%12]],d=NOW-i*1.6*DAY-36e5,hr=k=>new Date(d+k*36e5).toISOString(),t={0:hr(0)};
 if(status!=='Pending')t[1]=hr(3);if(status==='In Progress'||status==='Resolved'){t[2]=hr(8);t[3]=hr(14)}if(status==='Resolved')t[4]=hr(20+(i%6)*9);
 const room=mine?'204':String(100*(1+i%3)+1+i*7%28);return{id:'HC-'+(1040+i),title,cat,pri:PRIS[[0,1,1,2,3][i%5]],hostel,room,student:NAMES[si],prn:STU[si].prn,status,warden:WARD[hostel],staff:t[2]?STAFF[cat]:'',date:new Date(d).toISOString(),desc:`${title}. This has been affecting room ${room} for the last few days and needs attention from the maintenance team.`,t,rating:0,remarks:status==='Resolved'?'Issue fixed and verified with the student.':''}});

export const NOTES=[{id:1,txt:'Complaint HC-1040 was marked as resolved. Please rate your experience.',time:new Date(NOW-36e5).toISOString(),read:false,type:'status',to:['student']},{id:2,txt:'Water supply will be off in all blocks on Sunday, 8 Nov, 10 AM to 1 PM for tank cleaning.',time:new Date(NOW-8*36e5).toISOString(),read:false,type:'notice',to:['student','warden','admin']},{id:3,txt:'Emergency complaint HC-1043 reported in Sahyadri Hostel.',time:new Date(NOW-20*36e5).toISOString(),read:false,type:'alert',to:['warden','admin']},{id:4,txt:'Monthly complaint report for October is ready to download.',time:new Date(NOW-2*DAY).toISOString(),read:true,type:'notice',to:['admin']}];

export const USERS={student:{role:'student',...STU[0],title:'Student'},admin:{role:'admin',name:'Prof. Sanjay Kulkarni',title:'Hostel Administrator',email:'admin@mitcoe.edu.in',phone:'9822001122'},warden:{role:'warden',name:'Dr. Meera Deshpande',title:'Warden, Sahyadri & Godavari',email:'meera.d@mitcoe.edu.in',phone:'9822003344'}};

export const NAV={student:[['overview','Overview','home'],['register','Register complaint','plus'],['mine','My complaints','list'],['track','Track complaint','pin'],['notes','Notifications','bell'],['profile','Profile','user']],admin:[['overview','Overview','home'],['students','Students','users'],['hostels','Hostels & rooms','bld'],['all','All complaints','file'],['analytics','Complaint analytics','chart'],['wardens','Warden management','shield'],['reports','Reports','down'],['notes','Notifications','bell'],['settings','Settings','cog']],warden:[['overview','Overview','home'],['assigned','Assigned complaints','list'],['all','All hostel complaints','file'],['update','Update status','wrench'],['students','Student details','users'],['notes','Notifications','bell'],['profile','Profile','user']]};

export const hrs=c=>(new Date(c.t[4])-new Date(c.t[0]))/36e5,fh=h=>h>=48?(h/24).toFixed(1)+' days':h.toFixed(1)+' hrs';

export const avgRes=cs=>{const r=cs.filter(c=>c.t[4]);return r.length?r.reduce((a,c)=>a+hrs(c),0)/r.length:0};

export const wk=(cs,f)=>[5,4,3,2,1,0].map(w=>{const a=NOW-(w+1)*7*DAY,b=NOW-w*7*DAY;return[w?w+'w ago':'This wk',cs.filter(c=>{const v=f(c);return v&&+new Date(v)>a&&+new Date(v)<=b}).length]});

export const count=(cs,k,list)=>list.map(l=>[l,cs.filter(c=>c[k]===l).length]);

