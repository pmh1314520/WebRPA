"""企业级控制中心 Web UI（/console/enterprise）

自包含单页（原生 JS 调用企业 REST API），覆盖 7 项能力的可视化操作：
登录会话、集群控制中心、用户与角色(RBAC)、审计日志、审批中心、凭据保险库、
文档智能 IDP、计算机使用 Agent、流程挖掘、SSO 与全局权限设置。
移动端友好；所有企业接口自动携带 x-webrpa-session 会话令牌。
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["enterprise-console"])

_HTML = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<title>WebRPA 企业控制中心</title>
<style>
:root{--bg:#0f172a;--card:#1e293b;--mut:#94a3b8;--txt:#e2e8f0;--brand:#3b82f6;--ok:#22c55e;--bad:#ef4444;--warn:#f59e0b;--bd:#334155}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--txt);font-size:14px}
header{position:sticky;top:0;background:linear-gradient(180deg,#1e293b,#0f172a);padding:12px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--bd);z-index:10}
header h1{font-size:16px;margin:0;flex:1;font-weight:700}
header .who{font-size:12px;color:var(--mut)}
nav{display:flex;gap:6px;overflow-x:auto;padding:10px 12px;border-bottom:1px solid var(--bd)}
nav button{flex:0 0 auto;background:var(--card);border:1px solid var(--bd);color:var(--txt);border-radius:20px;padding:7px 14px;font-size:13px;cursor:pointer}
nav button.on{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:600}
main{padding:14px;max-width:1000px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px}
.stat{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:14px}
.stat .n{font-size:24px;font-weight:700}.stat .l{color:var(--mut);font-size:12px;margin-top:4px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px;margin-bottom:10px}
.row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd)}
.row:last-child{border-bottom:0}
.tag{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600}
.tag.ok{background:rgba(34,197,94,.15);color:var(--ok)}.tag.bad{background:rgba(239,68,68,.15);color:var(--bad)}
.tag.warn{background:rgba(245,158,11,.15);color:var(--warn)}.tag.run{background:rgba(59,130,246,.15);color:var(--brand)}
.mut{color:var(--mut);font-size:12px}.flex1{flex:1;min-width:0}
.title{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
button.act{background:var(--brand);border:0;color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer}
button.act.gray{background:#475569}button.act.bad{background:var(--bad)}button.act:disabled{opacity:.5}
h3{margin:16px 0 8px;font-size:14px;color:var(--mut)}
.empty{color:var(--mut);text-align:center;padding:24px}
pre{white-space:pre-wrap;word-break:break-all;font-size:12px;background:#0b1220;padding:8px;border-radius:8px;max-height:260px;overflow:auto}
input,select,textarea{background:#0b1220;border:1px solid var(--bd);color:var(--txt);border-radius:8px;padding:8px;font-size:13px;width:100%;margin:4px 0}
label{font-size:12px;color:var(--mut);display:block;margin-top:6px}
.frm{display:grid;gap:6px}
.inline{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.login-wrap{max-width:360px;margin:60px auto}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0b1220;border:1px solid var(--bd);padding:10px 16px;border-radius:10px;z-index:50;font-size:13px;max-width:90%}
.field{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--bd)}
</style>
</head>
<body>
<header>
  <h1>WebRPA 企业控制中心</h1>
  <span class="who" id="who"></span>
  <button class="act gray" id="langBtn" onclick="toggleLang()">EN</button>
  <button class="act gray" id="logoutBtn" style="display:none" onclick="logout()">退出</button>
</header>
<nav id="nav" style="display:none"></nav>
<main id="view"><div class="empty">加载中…</div></main>
<div id="toast" class="toast" style="display:none"></div>
<script>
const SESS_KEY='webrpa_ent_session';
let session=localStorage.getItem(SESS_KEY)||'';
let me=null;
const TABS={cluster:'集群控制中心',rbac:'用户与角色',audit:'审计日志',approvals:'审批中心',vault:'凭据保险库',idp:'文档智能',cua:'电脑Agent',mining:'流程挖掘',settings:'系统设置'};
let tab='cluster';
const V=document.getElementById('view');
function setView(h){V.innerHTML=h}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',2600)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function hdr(extra){return Object.assign({'Content-Type':'application/json','x-webrpa-session':session},extra||{})}
async function api(path,opt){opt=opt||{};opt.headers=Object.assign(hdr(),opt.headers||{});const r=await fetch('/api'+path,opt);let j={};try{j=await r.json()}catch(e){}if(r.status===401){doLogout();throw new Error('会话已过期，请重新登录')}if(!r.ok){throw new Error(j.detail||('HTTP '+r.status))}return j}
function fmtMs(ms){ms=ms||0;return ms<1000?ms+'ms':(ms/1000).toFixed(1)+'s'}
function statusTag(s){const m={success:['ok','成功'],failed:['bad','失败'],assigned:['run','已分配'],running:['run','运行中'],queued:['warn','排队'],pending:['warn','待处理'],approved:['ok','已批准'],rejected:['bad','已驳回'],online:['ok','在线'],offline:['bad','离线'],disabled:['warn','停用']};const a=m[s]||['warn',s||'?'];return '<span class="tag '+a[0]+'">'+a[1]+'</span>'}

// ---------- 国际化（中/英，自包含运行时翻译）----------
let LANG=localStorage.getItem('webrpa_ent_lang')||((navigator.language||'zh').toLowerCase().indexOf('zh')===0?'zh':'en');
const DICT={
"WebRPA 企业控制中心":"WebRPA Enterprise Console","退出":"Logout","刷新":"Refresh","加载中…":"Loading…","加载失败：":"Load failed: ",
"会话已过期，请重新登录":"Session expired, please log in again","需要登录：请在 x-webrpa-session 头携带有效会话令牌":"Login required: provide a valid session token in the x-webrpa-session header",
"集群控制中心":"Cluster Center","用户与角色":"Users & Roles","审计日志":"Audit Log","审批中心":"Approvals","凭据保险库":"Credential Vault","文档智能":"Document IDP","电脑Agent":"Computer Agent","流程挖掘":"Process Mining","系统设置":"Settings",
"成功":"Success","失败":"Failed","已分配":"Assigned","运行中":"Running","排队":"Queued","待处理":"Pending","已批准":"Approved","已驳回":"Rejected","在线":"Online","离线":"Offline","停用":"Disabled",
"登录企业控制中心":"Log in to Enterprise Console","登录失败：":"Login failed: ","登录失败":"Login failed","SSO 登录失败":"SSO login failed","用户名":"Username","口令":"Password","登录":"Login","SSO 登录":"SSO Login","授权 code":"Authorization code","请输入用户名和口令":"Please enter username and password","请输入用户名":"Please enter username",
"首次使用：后端启动日志会打印初始管理员 admin 的随机口令。":"First use: the backend startup log prints the random password for the initial admin user.",
"企业目录登录（需先在系统设置配置 SSO）":"Enterprise directory login (configure SSO in Settings first)","钉钉":"DingTalk","企业微信":"WeCom","飞书":"Feishu",
"在线节点":"Online nodes","负载/容量":"Load/Capacity","利用率":"Utilization","运行中任务":"Running tasks","派发集群任务":"Dispatch cluster task","工作流文件名":"Workflow file name","标签约束（逗号分隔，可空）":"Tag constraints (comma-separated, optional)","能力约束（逗号分隔，可空）":"Capability constraints (comma-separated, optional)","派发":"Dispatch","执行机节点":"Robot nodes","暂无执行机。执行机可调用 /api/orchestrator/nodes/register 注册":"No robots yet. Robots register via /api/orchestrator/nodes/register","集群任务":"Cluster tasks","暂无任务":"No tasks","移除":"Remove","负载 ":"Load ","标签[":"tags[","能力[":"caps[","节点 ":"node ","尝试 ":"attempts ","已派发：":"Dispatched: ","请填写工作流文件名":"Please enter a workflow file name","确定移除该节点？":"Remove this node?","已移除":"Removed",
"需要 ":"Requires ","新建用户":"Create user","角色":"Roles","创建":"Create","用户":"Users","删除":"Delete","预置":"preset","权限：":"permissions: ","请填写用户名和口令":"Please fill in username and password","请至少选一个角色":"Select at least one role","已创建":"Created","删除用户 ":"Delete user ","已删除":"Deleted","角色[":"roles[",
"校验哈希链完整性":"Verify hash-chain integrity","共 ":"Total ","条审计记录":" audit records","暂无审计记录":"No audit records","链完整，共 ":"Chain intact, total ","条":" records","检测到篡改！断裂于 #":"Tampering detected! Broken at #",
"批准":"Approve","驳回":"Reject","发起 ":"by ","审批人 ":"approver ","暂无审批单":"No approval requests","驳回意见（可空）：":"Rejection comment (optional):","（已签发执行令牌）":" (grant token issued)","执行":"Execute"," · 已执行":" · executed","确认执行该已批准的危险操作？":"Execute this approved dangerous operation?","已执行：":"Executed: ",
"发起审批申请":"Submit approval request","危险操作":"Dangerous operation","删除工作流":"Delete workflow","移除集群节点":"Remove cluster node","批量派发任务":"Bulk dispatch tasks","申请理由":"Reason","说明为什么需要此操作":"Explain why this operation is needed","提交申请":"Submit","工作流文件名（逗号分隔）":"Workflow file names (comma-separated)","节点 ID":"Node ID","请填写节点 ID":"Please enter node ID","已提交申请":"Submitted"," 个工作流":" workflows",
"凭据值始终加密存储，此处仅管理「哪些角色可取用」，绝不显示明文。":"Credential values are always encrypted; here you only manage which roles can access them. Plaintext is never shown.","仅特权可取":"privileged only","允许角色：":"Allowed roles: ","（未授权普通角色）":"(no normal roles authorized)","设置":"Configure","凭据库为空。请先在编辑器凭据库新增凭据。":"Vault is empty. Add credentials in the editor first.","设置访问角色：":"Set access roles: ","保存":"Save","已保存":"Saved",
"文档抽取":"Document extraction","文档类型":"Document type","选择文档（图片或 PDF）":"Select document (image or PDF)","抽取字段":"Extract fields","需在编辑器全局配置中填写支持视觉的多模态模型。":"A vision-capable multimodal model must be configured in the editor's global settings.","字段模板":"Field templates","内置":"built-in","（自由抽取键值对）":"(free key-value extraction)","请选择文件":"Please select a file","抽取中，请稍候…":"Extracting, please wait…","抽取失败：":"Extraction failed: ","抽取结果":"Extraction result","校验问题":"Validation issues","页）":" pages)",
"让 Agent 操作电脑":"Let the Agent operate the computer","目标（越具体越好）":"Goal (the more specific the better)","最大步数":"Max steps","开始执行":"Start","需配置支持视觉的多模态模型。执行期间 Agent 会真实操作本机鼠标键盘，请勿干扰。":"A vision model is required. During execution the Agent really controls this machine's mouse/keyboard — do not interfere.","历史会话":"Past sessions","暂无会话":"No sessions","请填写目标":"Please enter a goal","Agent 将真实操作本机，确认开始？":"The Agent will really control this machine. Start?","执行中，可能需要一段时间…":"Running, this may take a while…","执行失败：":"Execution failed: ","动作历史":"Action history"," 步":" steps","步 · ":" steps · ",
"急停":"Stop","已请求停止，将在下一步前终止":"Stop requested; will terminate before the next step",
"执行记录 JSON 数组":"Execution records (JSON array)","分析":"Analyze","JSON 格式错误":"Invalid JSON format","分析失败：":"Analysis failed: ","轨迹数":"Traces","路径变体":"Variants","总步数":"Total steps","瓶颈步骤":"Bottleneck steps",
"全局权限强制":"Global permission enforcement","开启后，远程访问需登录并具备权限（本机豁免，编辑器照常用）":"When enabled, remote access requires login and permissions (local machine exempt; editor works as usual)","SSO / 企业目录":"SSO / Enterprise directory","配置 JSON（各渠道 enabled/参数）":"Config JSON (per-provider enabled/params)","保存 SSO 配置":"Save SSO config","修改我的口令":"Change my password","原口令":"Old password","新口令":"New password","修改":"Change","已修改":"Changed","需要 rbac.manage 权限":"Requires rbac.manage permission","需要 audit.view 权限":"Requires audit.view permission","需要 credential.view 权限":"Requires credential.view permission",
"优先级 ":"priority ","描述":"description",
"例如 demo.json":"e.g. demo.json","例如：打开记事本并输入 hello":"e.g. open Notepad and type hello","次":" times","请填写":"Please fill in","示例":"Example","打开":"open",
"未登录或会话已过期":"Not logged in or session expired","缺少权限：":"Missing permission: ","无权访问该凭据":"Not authorized to access this credential","凭据不存在":"Credential not found","审批单不存在":"Approval request not found","不能审批自己发起的请求":"Cannot approve your own request","目标不能为空":"Goal cannot be empty","节点不存在":"Node not found","任务不存在":"Task not found","用户已存在":"User already exists","用户不存在":"User not found","口令至少 6 位":"Password must be at least 6 characters","原口令错误":"Old password is incorrect","新口令至少 6 位":"New password must be at least 6 characters","目标用户名已存在":"Target username already exists","禁止删除内置 admin 用户":"Cannot delete built-in admin user","禁止删除预置角色":"Cannot delete preset role","文件为空":"File is empty","未知文档类型：":"Unknown document type: ","无法解析该文档（不支持的格式或文件损坏）":"Cannot parse this document (unsupported format or corrupted)","模型调用失败：":"Model call failed: ","未配置多模态 AI 模型":"Multimodal AI model not configured","请在全局配置填写支持视觉的模型":"please configure a vision-capable model in global settings","无法使用 Computer-Use":"cannot use Computer-Use","无法进行文档抽取":"cannot extract document","未配置 AI 模型，无法反推工作流":"AI model not configured; cannot infer workflow","请在全局配置填写模型 API":"please configure the model API in global settings","录制事件为空":"Recording events are empty","token 无效":"invalid token","节点未注册":"Node not registered","角色不存在：":"Role not found: ","未知权限：":"Unknown permission: ",
"（":"(","）":")","，":", ","、":", ","：":": "
};
const DKEYS=Object.keys(DICT).sort((a,b)=>b.length-a.length);
function trText(s){if(LANG!=='en'||!s)return s;let out=s;for(const k of DKEYS){if(out.indexOf(k)>=0)out=out.split(k).join(DICT[k])}return out}
let _obs=null;
function applyLang(root){if(LANG!=='en')return;root=root||document.body;
 const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);const ns=[];while(tw.nextNode())ns.push(tw.currentNode);
 ns.forEach(n=>{const v=n.nodeValue;if(v&&v.trim()){const t=trText(v);if(t!==v)n.nodeValue=t}});
 root.querySelectorAll&&root.querySelectorAll('[placeholder]').forEach(e=>{const t=trText(e.getAttribute('placeholder'));if(t!==e.getAttribute('placeholder'))e.setAttribute('placeholder',t)});}
function startObserver(){if(LANG!=='en')return;if(_obs)return;
 _obs=new MutationObserver(()=>{_obs.disconnect();applyLang(document.body);_obs.observe(document.body,{childList:true,subtree:true,characterData:true})});
 _obs.observe(document.body,{childList:true,subtree:true,characterData:true});}
function toggleLang(){LANG=(LANG==='en')?'zh':'en';localStorage.setItem('webrpa_ent_lang',LANG);location.reload()}
function initLang(){document.getElementById('langBtn').textContent=(LANG==='en')?'中文':'EN';if(LANG==='en'){document.documentElement.lang='en';document.title='WebRPA Enterprise Console';applyLang(document.body);startObserver()}}
initLang();

// ---------- 认证 ----------
function can(p){return me&&(me.permissions.indexOf('*')>=0||me.permissions.indexOf(p)>=0)}
function doLogout(){session='';me=null;localStorage.removeItem(SESS_KEY);document.getElementById('nav').style.display='none';document.getElementById('logoutBtn').style.display='none';document.getElementById('who').textContent='';renderLogin()}
async function logout(){try{await api('/rbac/logout',{method:'POST'})}catch(e){}doLogout()}
function renderLogin(){
 setView('<div class="login-wrap card"><h3 style="color:var(--txt)">登录企业控制中心</h3>'
 +'<div class="frm"><label>用户名</label><input id="lu" autocomplete="username"/>'
 +'<label>口令</label><input id="lp" type="password" autocomplete="current-password"/>'
 +'<button class="act" style="margin-top:10px;padding:10px" onclick="login()">登录</button></div>'
 +'<div class="mut" style="margin-top:10px">首次使用：后端启动日志会打印初始管理员 admin 的随机口令。</div>'
 +'<hr style="border-color:var(--bd);margin:14px 0"/><div class="mut">企业目录登录（需先在系统设置配置 SSO）</div>'
 +'<div class="inline" style="margin-top:6px"><select id="ssop"><option value="ldap">LDAP</option><option value="dingtalk">钉钉</option><option value="wework">企业微信</option><option value="feishu">飞书</option></select></div>'
 +'<div id="ssoFields"></div><button class="act gray" style="margin-top:8px" onclick="ssoLogin()">SSO 登录</button>'
 +'</div>');
 const sel=document.getElementById('ssop');const upd=()=>{const p=sel.value;document.getElementById('ssoFields').innerHTML=(p==='ldap')?'<label>用户名</label><input id="sl_u"/><label>口令</label><input id="sl_p" type="password"/>':'<label>授权 code</label><input id="sl_code"/>'};sel.onchange=upd;upd();
 const lp=document.getElementById('lp');lp.onkeydown=e=>{if(e.key==='Enter')login()};
}
async function login(){const u=document.getElementById('lu').value.trim();const p=document.getElementById('lp').value;
 if(!u||!p){toast('请输入用户名和口令');return}
 try{const r=await fetch('/api/rbac/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});const j=await r.json();if(!r.ok){toast(j.detail||'登录失败');return}session=j.token;localStorage.setItem(SESS_KEY,session);await boot()}catch(e){toast('登录失败：'+e.message)}}
async function ssoLogin(){const prov=document.getElementById('ssop').value;let payload={};
 if(prov==='ldap'){payload={username:(document.getElementById('sl_u').value||'').trim(),password:document.getElementById('sl_p').value}}else{payload={code:(document.getElementById('sl_code').value||'').trim()}}
 try{const r=await fetch('/api/rbac/sso/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:prov,payload:payload})});const j=await r.json();if(!r.ok){toast(j.detail||'SSO 登录失败');return}session=j.token;localStorage.setItem(SESS_KEY,session);await boot()}catch(e){toast('SSO 登录失败：'+e.message)}}

// ---------- 导航 ----------
function buildNav(){const n=document.getElementById('nav');n.innerHTML='';Object.keys(TABS).forEach(k=>{const b=document.createElement('button');b.textContent=TABS[k];if(k===tab)b.className='on';b.onclick=()=>{tab=k;buildNav();refresh()};n.appendChild(b)});n.style.display='flex'}
async function refresh(){try{const fn={cluster:vCluster,rbac:vRbac,audit:vAudit,approvals:vApprovals,vault:vVault,idp:vIdp,cua:vCua,mining:vMining,settings:vSettings}[tab];await fn()}catch(e){setView('<div class="empty">加载失败：'+esc(e.message)+'</div>')}}
async function boot(){try{const r=await api('/rbac/me');me=r.user;document.getElementById('who').textContent=me.display_name+' ('+me.roles.join(',')+')';document.getElementById('logoutBtn').style.display='';buildNav();await refresh()}catch(e){doLogout()}}
if(session){boot()}else{renderLogin()}

// ---------- 集群控制中心 ----------
async function vCluster(){
 const ov=await api('/orchestrator/overview');const o=ov.overview||{};
 const nodes=(await api('/orchestrator/nodes')).nodes||[];
 const tasks=(await api('/orchestrator/tasks?limit=30')).tasks||[];
 let h='<div class="grid">'
 +'<div class="stat"><div class="n">'+(o.nodes_online||0)+'/'+(o.nodes_total||0)+'</div><div class="l">在线节点</div></div>'
 +'<div class="stat"><div class="n">'+(o.current_load||0)+'/'+(o.capacity||0)+'</div><div class="l">负载/容量</div></div>'
 +'<div class="stat"><div class="n">'+Math.round((o.utilization||0)*100)+'%</div><div class="l">利用率</div></div>'
 +'<div class="stat"><div class="n">'+((o.tasks&&(o.tasks.running||0))||0)+'</div><div class="l">运行中任务</div></div></div>';
 if(can('cluster.dispatch')){h+='<div class="card"><h3 style="margin-top:0">派发集群任务</h3><div class="frm">'
 +'<label>工作流文件名</label><input id="cw" placeholder="例如 demo.json"/>'
 +'<label>标签约束（逗号分隔，可空）</label><input id="ct"/>'
 +'<label>能力约束（逗号分隔，可空）</label><input id="cc"/>'
 +'<button class="act" onclick="submitTask()">派发</button></div></div>'}
 h+='<h3>执行机节点</h3><div class="card">'+(nodes.length?nodes.map(n=>'<div class="row">'+statusTag(n.status)+'<div class="flex1"><div class="title">'+esc(n.name)+'</div><div class="mut">负载 '+(n.load||0)+'/'+(n.max_concurrency||0)+' · 标签['+esc((n.tags||[]).join(','))+'] · 能力['+esc((n.capabilities||[]).join(','))+']</div></div>'+(can('cluster.manage')?'<button class="act bad" onclick="rmNode(\''+n.node_id+'\')">移除</button>':'')+'</div>').join(''):'<div class="empty">暂无执行机。执行机可调用 /api/orchestrator/nodes/register 注册</div>')+'</div>';
 h+='<h3>集群任务</h3><div class="card">'+(tasks.length?tasks.map(t=>'<div class="row">'+statusTag(t.status)+'<div class="flex1"><div class="title">'+esc(t.workflow)+'</div><div class="mut">节点 '+esc(t.assigned_node||'-')+' · 尝试 '+(t.attempts||0)+' · '+esc(t.created_at||'')+'</div></div></div>').join(''):'<div class="empty">暂无任务</div>')+'</div>';
 setView(h);
}
async function submitTask(){const wf=document.getElementById('cw').value.trim();if(!wf){toast('请填写工作流文件名');return}
 const tags=document.getElementById('ct').value.split(',').map(s=>s.trim()).filter(Boolean);
 const caps=document.getElementById('cc').value.split(',').map(s=>s.trim()).filter(Boolean);
 const body={workflow:wf};const c={};if(tags.length)c.tags=tags;if(caps.length)c.capabilities=caps;if(Object.keys(c).length)body.constraints=c;
 try{const r=await api('/orchestrator/tasks',{method:'POST',body:JSON.stringify(body)});toast('已派发：'+r.status+(r.assigned_node?(' → '+r.assigned_node):''));refresh()}catch(e){toast(e.message)}}
async function rmNode(id){if(!confirm('确定移除该节点？'))return;try{await api('/orchestrator/nodes/'+id,{method:'DELETE'});toast('已移除');refresh()}catch(e){toast(e.message)}}

// ---------- 用户与角色 ----------
async function vRbac(){
 if(!can('rbac.manage')){setView('<div class="empty">需要 rbac.manage 权限</div>');return}
 const users=(await api('/rbac/users')).users||[];
 const roles=(await api('/rbac/roles')).roles||[];
 const roleNames=roles.map(r=>r.name);
 let h='<div class="card"><h3 style="margin-top:0">新建用户</h3><div class="frm">'
 +'<label>用户名</label><input id="nu"/><label>口令</label><input id="np" type="password"/>'
 +'<label>角色</label><select id="nr" multiple size="3">'+roleNames.map(r=>'<option value="'+esc(r)+'">'+esc(r)+'</option>').join('')+'</select>'
 +'<button class="act" onclick="createUser()">创建</button></div></div>';
 h+='<h3>用户</h3><div class="card">'+users.map(u=>'<div class="row">'+(u.disabled?statusTag('disabled'):statusTag('online'))+'<div class="flex1"><div class="title">'+esc(u.username)+' <span class="mut">'+esc(u.display_name||'')+'</span></div><div class="mut">角色['+esc(u.roles.join(','))+'] · '+esc(u.source)+'</div></div>'+(u.username!=='admin'?'<button class="act bad" onclick="delUser(\''+esc(u.username)+'\')">删除</button>':'')+'</div>').join('')+'</div>';
 h+='<h3>角色</h3><div class="card">'+roles.map(r=>'<div class="row"><div class="flex1"><div class="title">'+esc(r.name)+(r.preset?' <span class="tag warn">预置</span>':'')+'</div><div class="mut">'+esc(r.description||'')+' · 权限：'+esc(r.permissions.join(', '))+'</div></div></div>').join('')+'</div>';
 setView(h);
}
async function createUser(){const u=document.getElementById('nu').value.trim();const p=document.getElementById('np').value;const sel=document.getElementById('nr');const roles=Array.from(sel.selectedOptions).map(o=>o.value);
 if(!u||!p){toast('请填写用户名和口令');return}if(!roles.length){toast('请至少选一个角色');return}
 try{await api('/rbac/users',{method:'POST',body:JSON.stringify({username:u,password:p,roles:roles})});toast('已创建');refresh()}catch(e){toast(e.message)}}
async function delUser(u){if(!confirm('删除用户 '+u+'？'))return;try{await api('/rbac/users/'+encodeURIComponent(u),{method:'DELETE'});toast('已删除');refresh()}catch(e){toast(e.message)}}

// ---------- 审计日志 ----------
async function vAudit(){
 if(!can('audit.view')){setView('<div class="empty">需要 audit.view 权限</div>');return}
 const r=await api('/audit/logs?limit=120');const logs=r.logs||[];
 const st=(await api('/audit/stats')).stats||{};
 let h='<div class="inline" style="margin-bottom:8px"><button class="act gray" onclick="verifyChain()">校验哈希链完整性</button><span class="mut">共 '+(st.total||0)+' 条审计记录</span></div>';
 h+='<div class="card">'+(logs.length?logs.map(l=>'<div class="row"><div class="flex1"><div class="title">'+esc(l.action)+' <span class="mut">'+esc(l.target||'')+'</span></div><div class="mut">'+esc(l.actor)+' · '+esc(l.ts)+' · '+esc(l.result)+'</div></div></div>').join(''):'<div class="empty">暂无审计记录</div>')+'</div>';
 setView(h);
}
async function verifyChain(){try{const r=await api('/audit/verify');const v=r.result||{};toast(v.valid?('链完整，共 '+v.count+' 条'):('检测到篡改！断裂于 #'+(v.broken_at||'?')))}catch(e){toast(e.message)}}

// ---------- 审批中心 ----------
async function vApprovals(){
 const r=await api('/approvals');const reqs=r.requests||[];
 let h='';
 if(can('approval.create')){h+='<div class="card"><h3 style="margin-top:0">发起审批申请</h3><div class="frm">'
 +'<label>危险操作</label><select id="aac" onchange="aacFields()"><option value="workflow.delete">删除工作流</option><option value="node.remove">移除集群节点</option><option value="cluster.dispatch_bulk">批量派发任务</option></select>'
 +'<div id="aacFields"></div>'
 +'<label>申请理由</label><input id="aar" placeholder="说明为什么需要此操作"/>'
 +'<button class="act" onclick="createApproval()">提交申请</button></div></div>'}
 h+='<div class="card">'+(reqs.length?reqs.map(q=>{
  let btn='';if(q.status==='pending'&&can('approval.decide'))btn='<button class="act" onclick="decide(\''+q.id+'\',true)">批准</button><button class="act bad" onclick="decide(\''+q.id+'\',false)">驳回</button>';
  else if(q.status==='approved'&&!q.consumed&&can('approval.create'))btn='<button class="act" onclick="execApproval(\''+q.id+'\')">执行</button>';
  return '<div class="row">'+statusTag(q.status)+'<div class="flex1"><div class="title">'+esc(q.action)+' <span class="mut">'+esc(q.target)+'</span></div><div class="mut">发起 '+esc(q.requester)+' · '+esc(q.created_at)+(q.reason?(' · '+esc(q.reason)):'')+(q.approver?(' · 审批人 '+esc(q.approver)):'')+(q.consumed?' · 已执行':'')+'</div></div>'+btn+'</div>'}).join(''):'<div class="empty">暂无审批单</div>')+'</div>';
 setView(h);
 if(can('approval.create'))aacFields();
}
function aacFields(){const a=document.getElementById('aac');if(!a)return;const v=a.value;let f='';
 if(v==='workflow.delete')f='<label>工作流文件名</label><input id="aa_fn" placeholder="例如 demo.json"/>';
 else if(v==='node.remove')f='<label>节点 ID</label><input id="aa_nid"/>';
 else if(v==='cluster.dispatch_bulk')f='<label>工作流文件名（逗号分隔）</label><input id="aa_wfs"/><label>标签约束（逗号分隔，可空）</label><input id="aa_tags"/>';
 document.getElementById('aacFields').innerHTML=f;}
async function createApproval(){const action=document.getElementById('aac').value;const reason=document.getElementById('aar').value.trim();
 let target='';let payload={};
 if(action==='workflow.delete'){const fn=(document.getElementById('aa_fn').value||'').trim();if(!fn){toast('请填写工作流文件名');return}target=fn;payload={filename:fn}}
 else if(action==='node.remove'){const nid=(document.getElementById('aa_nid').value||'').trim();if(!nid){toast('请填写节点 ID');return}target=nid;payload={node_id:nid}}
 else if(action==='cluster.dispatch_bulk'){const wfs=(document.getElementById('aa_wfs').value||'').split(',').map(s=>s.trim()).filter(Boolean);if(!wfs.length){toast('请填写工作流文件名');return}target=wfs.length+' 个工作流';const tags=(document.getElementById('aa_tags').value||'').split(',').map(s=>s.trim()).filter(Boolean);payload={workflows:wfs};if(tags.length)payload.constraints={tags:tags}}
 try{await api('/approvals',{method:'POST',body:JSON.stringify({action:action,target:target,payload:payload,reason:reason})});toast('已提交申请');refresh()}catch(e){toast(e.message)}}
async function decide(rid,ok){let comment='';if(!ok){comment=prompt('驳回意见（可空）：')||'';if(comment===null)return}
 try{const r=await api('/approvals/'+rid+'/decide',{method:'POST',body:JSON.stringify({approved:ok,comment:comment})});toast('已'+(ok?'批准':'驳回')+(r.grant_token?'（已签发执行令牌）':''));refresh()}catch(e){toast(e.message)}}

// ---------- 凭据保险库 ----------
async function vVault(){
 if(!can('credential.view')){setView('<div class="empty">需要 credential.view 权限</div>');return}
 const r=await api('/vault/acl');const acls=r.acls||[];
 let roleNames=[];try{roleNames=(await api('/rbac/roles')).roles.map(x=>x.name)}catch(e){}
 let h='<div class="card"><div class="mut">凭据值始终加密存储，此处仅管理「哪些角色可取用」，绝不显示明文。</div></div>';
 h+='<div class="card">'+(acls.length?acls.map(a=>'<div class="row"><div class="flex1"><div class="title">'+esc(a.name)+(a.restricted?'':' <span class="tag warn">仅特权可取</span>')+'</div><div class="mut">允许角色：'+esc((a.allowed_roles||[]).join(', ')||'（未授权普通角色）')+'</div></div>'+(can('credential.manage')?'<button class="act gray" onclick="editAcl(\''+esc(a.name)+'\')">设置</button>':'')+'</div>').join(''):'<div class="empty">凭据库为空。请先在编辑器凭据库新增凭据。</div>')+'</div>';
 if(can('credential.manage')){h+='<div class="card" id="aclEditor" style="display:none"><h3 style="margin-top:0">设置访问角色：<span id="aclName"></span></h3><div id="aclRoles">'+roleNames.map(rn=>'<label class="inline"><input type="checkbox" style="width:auto" value="'+esc(rn)+'"/> '+esc(rn)+'</label>').join('')+'</div><button class="act" onclick="saveAcl()">保存</button></div>'}
 setView(h);window._roleNames=roleNames;
}
let _aclEditing='';
function editAcl(name){_aclEditing=name;document.getElementById('aclName').textContent=name;document.getElementById('aclEditor').style.display='block';document.querySelectorAll('#aclRoles input').forEach(c=>c.checked=false);
 api('/vault/acl').then(r=>{const a=(r.acls||[]).find(x=>x.name===name);const allowed=(a&&a.allowed_roles)||[];document.querySelectorAll('#aclRoles input').forEach(c=>{if(allowed.indexOf(c.value)>=0)c.checked=true})});
 document.getElementById('aclEditor').scrollIntoView({behavior:'smooth'})}
async function saveAcl(){const roles=Array.from(document.querySelectorAll('#aclRoles input')).filter(c=>c.checked).map(c=>c.value);
 try{await api('/vault/acl',{method:'PUT',body:JSON.stringify({name:_aclEditing,allowed_roles:roles})});toast('已保存');refresh()}catch(e){toast(e.message)}}

// ---------- 文档智能 IDP ----------
async function vIdp(){
 const tpls=(await api('/idp/templates')).templates||[];
 let h='<div class="card"><h3 style="margin-top:0">文档抽取</h3><div class="frm">'
 +'<label>文档类型</label><select id="idt">'+tpls.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.label)+'</option>').join('')+'</select>'
 +'<label>选择文档（图片或 PDF）</label><input type="file" id="idf" accept="image/*,.pdf"/>'
 +'<button class="act" onclick="idpExtract()">抽取字段</button></div>'
 +'<div class="mut">需在编辑器全局配置中填写支持视觉的多模态模型。</div></div><div id="idpOut"></div>';
 h+='<h3>字段模板</h3><div class="card">'+tpls.map(t=>'<div class="row"><div class="flex1"><div class="title">'+esc(t.label)+' <span class="mut">'+esc(t.key)+(t.builtin?' · 内置':'')+'</span></div><div class="mut">'+esc((t.fields||[]).map(f=>f.label+(f.required?'*':'')).join('、')||'（自由抽取键值对）')+'</div></div></div>').join('')+'</div>';
 setView(h);
}
async function idpExtract(){const f=document.getElementById('idf').files[0];const dt=document.getElementById('idt').value;const out=document.getElementById('idpOut');
 if(!f){toast('请选择文件');return}out.innerHTML='<div class="card mut">抽取中，请稍候…</div>';
 try{const fd=new FormData();fd.append('file',f);fd.append('doc_type',dt);
  const r=await fetch('/api/idp/extract',{method:'POST',headers:{'x-webrpa-session':session},body:fd});const j=await r.json();
  if(!r.ok){out.innerHTML='<div class="card">抽取失败：'+esc(j.detail||'')+'</div>';return}
  let rows=(j.fields||[]).map(fl=>'<div class="field"><span>'+esc(fl.name)+'</span><span>'+esc(typeof fl.value==='object'?JSON.stringify(fl.value):fl.value)+(fl.confidence!=null?' <span class="mut">('+fl.confidence+')</span>':'')+'</span></div>').join('');
  let issues=(j.issues||[]).map(i=>'<div class="mut" style="color:var(--'+(i.level==='error'?'bad':'warn')+')">'+esc(i.label||i.field)+'：'+esc(i.message)+'</div>').join('');
  out.innerHTML='<div class="card">'+(j.valid?statusTag('success'):statusTag('failed'))+' <b>抽取结果</b>（'+esc(j.doc_type)+'，'+(j.pages||1)+'页）'+rows+(issues?('<h3>校验问题</h3>'+issues):'')+'</div>'}catch(e){out.innerHTML='<div class="card">抽取失败：'+esc(e.message)+'</div>'}}

// ---------- 计算机使用 Agent ----------
async function vCua(){
 const sessions=(await api('/computer-use/sessions?limit=20')).sessions||[];
 let h='<div class="card"><h3 style="margin-top:0">让 Agent 操作电脑</h3><div class="frm">'
 +'<label>目标（越具体越好）</label><textarea id="cgoal" rows="2" placeholder="例如：打开记事本并输入 hello"></textarea>'
 +'<label>最大步数</label><input id="csteps" type="number" value="15" min="1" max="40"/>'
 +'<div class="inline"><button class="act" onclick="cuaRun()">开始执行</button><button class="act bad" onclick="cuaStop()">急停</button></div></div>'
 +'<div class="mut">需配置支持视觉的多模态模型。执行期间 Agent 会真实操作本机鼠标键盘，请勿干扰。</div></div><div id="cuaOut"></div>';
 h+='<h3>历史会话</h3><div class="card">'+(sessions.length?sessions.map(s=>'<div class="row">'+statusTag(s.status==='success'?'success':'failed')+'<div class="flex1"><div class="title">'+esc(s.goal)+'</div><div class="mut">'+(s.steps||0)+' 步 · '+esc(s.reason||'')+'</div></div></div>').join(''):'<div class="empty">暂无会话</div>')+'</div>';
 setView(h);
}
async function cuaStop(){try{await api('/computer-use/stop',{method:'POST'});toast('已请求停止，将在下一步前终止')}catch(e){toast(e.message)}}
async function cuaRun(){const goal=document.getElementById('cgoal').value.trim();const steps=parseInt(document.getElementById('csteps').value)||15;const out=document.getElementById('cuaOut');if(!goal){toast('请填写目标');return}if(!confirm('Agent 将真实操作本机，确认开始？'))return;
 out.innerHTML='<div class="card mut">执行中，可能需要一段时间…</div>';
 try{const r=await api('/computer-use/run',{method:'POST',body:JSON.stringify({goal:goal,max_steps:steps})});
  let hist=(r.history||[]).map((s,i)=>'<div class="field"><span>'+(i+1)+'. '+esc(s.action)+'</span><span class="mut">'+esc(s.reason||'')+'</span></div>').join('');
  out.innerHTML='<div class="card">'+statusTag(r.success?'success':'failed')+' <b>'+esc(r.status)+'</b> '+esc(r.reason||'')+'<h3>动作历史</h3>'+hist+'</div>'}catch(e){out.innerHTML='<div class="card">执行失败：'+esc(e.message)+'</div>'}}

// ---------- 流程挖掘 ----------
async function vMining(){
 let h='<div class="card"><h3 style="margin-top:0">流程挖掘</h3><div class="frm">'
 +'<label>执行记录 JSON 数组</label><textarea id="mrec" rows="8" placeholder=\'[{"trace_id":"t1","steps":[{"name":"打开","duration_ms":100,"status":"ok"}]}]\'></textarea>'
 +'<button class="act" onclick="runMine()">分析</button></div></div><div id="mineOut"></div>';
 setView(h);
}
async function runMine(){const out=document.getElementById('mineOut');let recs;
 try{recs=JSON.parse(document.getElementById('mrec').value)}catch(e){toast('JSON 格式错误');return}
 try{const r=await api('/process-mining/mine',{method:'POST',body:JSON.stringify({records:recs})});
  let bn=(r.bottlenecks||[]).map(b=>'<div class="field"><span>'+esc(b.step)+'</span><span>'+fmtMs(b.avg_duration_ms)+'</span></div>').join('');
  let va=(r.variants||[]).map(v=>'<div class="field"><span>'+esc(v.path.join(' → '))+'</span><span>'+v.count+'次</span></div>').join('');
  out.innerHTML='<div class="grid"><div class="stat"><div class="n">'+r.total_traces+'</div><div class="l">轨迹数</div></div><div class="stat"><div class="n">'+r.variant_count+'</div><div class="l">路径变体</div></div><div class="stat"><div class="n">'+r.total_steps+'</div><div class="l">总步数</div></div></div><div class="card"><h3 style="margin-top:0">瓶颈步骤</h3>'+bn+'<h3>路径变体</h3>'+va+'</div>'}catch(e){out.innerHTML='<div class="card">分析失败：'+esc(e.message)+'</div>'}}

// ---------- 系统设置 ----------
async function vSettings(){
 if(!can('rbac.manage')){setView('<div class="empty">需要 rbac.manage 权限</div>');return}
 let enf=false;try{enf=(await api('/rbac/enforcement')).enabled}catch(e){}
 let sso={};try{sso=(await api('/rbac/sso/config')).config||{}}catch(e){}
 let h='<div class="card"><h3 style="margin-top:0">全局权限强制</h3><label class="inline"><input type="checkbox" id="enf" style="width:auto" '+(enf?'checked':'')+'/> 开启后，远程访问需登录并具备权限（本机豁免，编辑器照常用）</label><button class="act" onclick="saveEnf()">保存</button></div>';
 h+='<div class="card"><h3 style="margin-top:0">SSO / 企业目录</h3><div class="frm"><label>配置 JSON（各渠道 enabled/参数）</label><textarea id="ssocfg" rows="10">'+esc(JSON.stringify(sso,null,2))+'</textarea><button class="act" onclick="saveSso()">保存 SSO 配置</button></div>'
 +'<div class="mut">示例：{"ldap":{"enabled":true,"server":"ldap://host","user_dn_template":"uid={username},ou=people,dc=x","default_roles":["viewer"]},"feishu":{"enabled":true,"app_key":"..","app_secret":"..","default_roles":["operator"]}}</div></div>';
 h+='<div class="card"><h3 style="margin-top:0">修改我的口令</h3><div class="frm"><label>原口令</label><input id="op" type="password"/><label>新口令</label><input id="npw" type="password"/><button class="act" onclick="changePwd()">修改</button></div></div>';
 setView(h);
}
async function saveEnf(){try{await api('/rbac/enforcement',{method:'PUT',body:JSON.stringify({enabled:document.getElementById('enf').checked})});toast('已保存')}catch(e){toast(e.message)}}
async function saveSso(){let cfg;try{cfg=JSON.parse(document.getElementById('ssocfg').value)}catch(e){toast('JSON 格式错误');return}try{await api('/rbac/sso/config',{method:'PUT',body:JSON.stringify({config:cfg})});toast('已保存')}catch(e){toast(e.message)}}
async function changePwd(){const o=document.getElementById('op').value;const n=document.getElementById('npw').value;if(!o||!n){toast('请填写');return}try{await api('/rbac/change-password',{method:'POST',body:JSON.stringify({old_password:o,new_password:n})});toast('已修改')}catch(e){toast(e.message)}}
</script>
</body>
</html>"""


@router.get("/console/enterprise", response_class=HTMLResponse)
async def enterprise_console():
    return HTMLResponse(content=_HTML)
