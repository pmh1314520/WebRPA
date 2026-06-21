"""轻量 Web 控制台（手机/电脑浏览器可访问）

访问 http://<后端地址>:<端口>/console 即可：看执行仪表盘、运行历史、远程触发已发布的工作流、
看运行队列与健康探针。自包含单页（原生 JS 调用现有 API），移动端友好。

跨设备访问时若后端开启了访问令牌，页面右上角填入 token 即可（本机访问免令牌）。
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["console"])

_HTML = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<title>WebRPA 控制台</title>
<style>
:root{--bg:#0f172a;--card:#1e293b;--mut:#94a3b8;--txt:#e2e8f0;--brand:#3b82f6;--ok:#22c55e;--bad:#ef4444;--warn:#f59e0b;--bd:#334155}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--txt);font-size:14px}
header{position:sticky;top:0;background:linear-gradient(180deg,#1e293b,#0f172a);padding:12px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--bd);z-index:10}
header h1{font-size:16px;margin:0;flex:1;font-weight:700}
header input{background:#0b1220;border:1px solid var(--bd);color:var(--txt);border-radius:8px;padding:6px 8px;width:120px;font-size:12px}
nav{display:flex;gap:6px;overflow-x:auto;padding:10px 12px;border-bottom:1px solid var(--bd)}
nav button{flex:0 0 auto;background:var(--card);border:1px solid var(--bd);color:var(--txt);border-radius:20px;padding:7px 14px;font-size:13px;cursor:pointer}
nav button.on{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:600}
main{padding:14px}
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
button.act:disabled{opacity:.5}
h3{margin:16px 0 8px;font-size:14px;color:var(--mut)}
.empty{color:var(--mut);text-align:center;padding:24px}
pre{white-space:pre-wrap;word-break:break-all;font-size:12px;background:#0b1220;padding:8px;border-radius:8px;max-height:200px;overflow:auto}
</style>
</head>
<body>
<header>
  <h1>WebRPA 控制台</h1>
  <input id="tok" placeholder="访问令牌(可选)"/>
  <button class="act" onclick="location.href='/console/enterprise'">企业控制中心</button>
  <button class="act" onclick="refresh()">刷新</button>
</header>
<nav id="nav"></nav>
<main id="view"><div class="empty">加载中…</div></main>
<script>
const T={dash:'仪表盘',runs:'运行历史',api:'已发布API',queue:'运行队列',probes:'健康探针'};
let tab='dash';
const tokEl=document.getElementById('tok');
tokEl.value=localStorage.getItem('webrpa_token')||'';
tokEl.onchange=()=>localStorage.setItem('webrpa_token',tokEl.value.trim());
function hdr(){const t=(tokEl.value||'').trim();return t?{'X-WebRPA-Token':t}:{}}
async function api(path,opt={}){opt.headers=Object.assign({'Content-Type':'application/json'},hdr(),opt.headers||{});const r=await fetch('/api'+path,opt);return r.json()}
function el(h){const d=document.createElement('div');d.innerHTML=h;return d.firstElementChild}
function fmtMs(ms){ms=ms||0;return ms<1000?ms+'ms':(ms/1000).toFixed(1)+'s'}
function statusTag(s){const m={success:['ok','成功'],failed:['bad','失败'],stopped:['warn','停止'],running:['run','运行中'],queued:['run','排队'],canceled:['warn','取消']};const[c,l]=m[s]||['warn',s||'?'];return `<span class="tag ${c}">${l}</span>`}
function buildNav(){const n=document.getElementById('nav');n.innerHTML='';Object.keys(T).forEach(k=>{const b=el(`<button class="${k===tab?'on':''}">${T[k]}</button>`);b.onclick=()=>{tab=k;buildNav();refresh()};n.appendChild(b)})}
const V=document.getElementById('view');
function setView(h){V.innerHTML=h}
async function refresh(){try{await ({dash:vDash,runs:vRuns,api:vApi,queue:vQueue,probes:vProbes}[tab])()}catch(e){setView(`<div class="empty">加载失败：${e}</div>`)}}
async function vDash(){const s=await api('/dashboard/stats?days=7');const o=s.overview||{};
 let h=`<div class="grid">
 <div class="stat"><div class="n">${o.total||0}</div><div class="l">7天运行数</div></div>
 <div class="stat"><div class="n" style="color:var(--ok)">${o.success_rate||0}%</div><div class="l">成功率</div></div>
 <div class="stat"><div class="n" style="color:var(--bad)">${o.failed||0}</div><div class="l">失败次数</div></div>
 <div class="stat"><div class="n">${fmtMs(o.avg_ms)}</div><div class="l">平均耗时</div></div></div>`;
 h+='<h3>失败 TOP</h3><div class="card">';const ft=s.failure_top||[];
 h+= ft.length?ft.map(w=>`<div class="row"><div class="flex1"><div class="title">${w.workflow_name}</div><div class="mut">失败 ${w.failed}/${w.runs} 次 · 失败率 ${w.fail_rate}%</div></div></div>`).join(''):'<div class="empty">暂无失败记录</div>';
 h+='</div><h3>最慢 TOP</h3><div class="card">';const st=s.slowest_top||[];
 h+= st.length?st.map(w=>`<div class="row"><div class="flex1"><div class="title">${w.workflow_name}</div><div class="mut">平均 ${fmtMs(w.avg_ms)} · ${w.runs} 次</div></div></div>`).join(''):'<div class="empty">暂无数据</div>';
 h+='</div>';setView(h)}
async function vRuns(){const r=await api('/dashboard/runs?limit=50');const runs=r.runs||[];
 setView('<div class="card">'+(runs.length?runs.map(x=>`<div class="row">${statusTag(x.status)}<div class="flex1"><div class="title">${x.workflow_name}</div><div class="mut">${x.ts} · ${fmtMs(x.duration_ms)} · ${x.source}</div>${x.error?`<div class="mut" style="color:var(--bad)">${x.error}</div>`:''}</div></div>`).join(''):'<div class="empty">暂无运行历史</div>')+'</div>')}
async function vApi(){const r=await api('/published');const items=r.published||[];
 let h='<div class="card">'+(items.length?items.map(x=>`<div class="row"><div class="flex1"><div class="title">${x.slug}</div><div class="mut">${x.workflow} · 调用 ${x.call_count} 次${x.require_token?' · 需token':''}</div></div><button class="act" onclick="trigger('${x.slug}',${x.require_token})">触发</button></div>`).join(''):'<div class="empty">暂无已发布的工作流 API</div>')+'</div><div id="tout"></div>';setView(h)}
async function trigger(slug,needTok){const out=document.getElementById('tout');out.innerHTML='<div class="mut">触发中…</div>';
 let tk='';if(needTok){tk=prompt('该端点需要 token：');if(tk===null){out.innerHTML='';return}}
 try{const r=await fetch('/api/run/'+slug+(tk?('?token='+encodeURIComponent(tk)):''),{method:'POST',headers:Object.assign({'Content-Type':'application/json'},hdr()),body:'{}'});const j=await r.json();out.innerHTML='<div class="card"><b>'+(j.success?'成功':'失败')+'</b> 状态='+(j.status||'?')+'，数据 '+((j.data||[]).length)+' 行<pre>'+JSON.stringify(j,null,2).slice(0,1500)+'</pre></div>'}catch(e){out.innerHTML='<div class="card">触发失败：'+e+'</div>'}}
async function vQueue(){const q=await api('/orchestration/queue');
 let h=`<div class="grid"><div class="stat"><div class="n">${q.running||0}</div><div class="l">运行中</div></div><div class="stat"><div class="n">${q.queued||0}</div><div class="l">排队中</div></div><div class="stat"><div class="n">${q.max_concurrency||0}</div><div class="l">最大并发</div></div></div>`;
 const jobs=q.jobs||[];h+='<div class="card">'+(jobs.length?jobs.map(j=>`<div class="row">${statusTag(j.status)}<div class="flex1"><div class="title">${j.workflow}</div><div class="mut">优先级 ${j.priority}${j.error?(' · '+j.error):''}</div></div></div>`).join(''):'<div class="empty">队列为空</div>')+'</div>';setView(h)}
async function vProbes(){const r=await api('/orchestration/probes');const ps=r.probes||[];
 setView('<div class="card">'+(ps.length?ps.map(p=>`<div class="row">${statusTag(p.last_status||'')}<div class="flex1"><div class="title">${p.name}</div><div class="mut">${p.workflow} · 每${p.interval_sec}s · ${p.enabled?'启用':'停用'}${p.consecutive_failures?(' · 连续失败'+p.consecutive_failures):''}</div></div><button class="act" onclick="runProbe('${p.id}')">探活</button></div>`).join(''):'<div class="empty">暂无健康探针</div>')+'</div>')}
async function runProbe(id){try{await api('/orchestration/probes/'+id+'/run',{method:'POST'});setTimeout(refresh,800)}catch(e){alert('失败：'+e)}}
buildNav();refresh();
setInterval(()=>{if(tab==='dash'||tab==='queue')refresh()},10000);
</script>
</body>
</html>"""


@router.get("/console", response_class=HTMLResponse)
async def web_console():
    return HTMLResponse(content=_HTML)
