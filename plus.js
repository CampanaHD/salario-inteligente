/* Salário Inteligente Plus — extensão sem mudanças no banco: usa os dados já carregados pelo app.js */
(function(){
const R=n=>money(n),sum=a=>a.reduce((s,x)=>s+Number(x.amount||0),0),clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ym=d=>(d||'').slice(0,7),prevYm=()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.toLocaleDateString('en-CA').slice(0,7)};
const paid=(k)=>transactions.filter(t=>t.kind===k&&t.is_paid);
function byMonth(k){const m={};paid(k).forEach(t=>{m[ym(t.transaction_date)]=(m[ym(t.transaction_date)]||0)+Number(t.amount)});return m}
function byCat(month){const m={};paid('expense').filter(t=>ym(t.transaction_date)===month).forEach(t=>m[t.category]=(m[t.category]||0)+Number(t.amount));return m}
function metrics(){
  const cur=today().slice(0,7),inc=byMonth('income')[cur]||0,exp=byMonth('expense')[cur]||0;
  const eMonths=Object.entries(byMonth('expense')).filter(([k])=>k<cur).slice(-3).map(x=>x[1]);
  const avgExp=eMonths.length?eMonths.reduce((a,b)=>a+b,0)/eMonths.length:exp;
  const d=new Date(),day=d.getDate(),dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const projExp=day>0?exp/day*dim:exp,s=sums();
  const overdue=bills.filter(b=>b.is_active&&b.due_date<today()),soon=bills.filter(b=>b.is_active&&b.due_date>=today()&&b.due_date<=new Date(Date.now()+3*864e5).toLocaleDateString('en-CA'));
  const budgets=profile.category_budgets||{},cats=byCat(cur),bk=Object.keys(budgets);
  const over=bk.filter(c=>(cats[c]||0)>budgets[c]),near=bk.filter(c=>(cats[c]||0)>budgets[c]*.8&&(cats[c]||0)<=budgets[c]);
  return {inc,exp,avgExp,projExp,s,overdue,soon,budgets,cats,bk,over,near,rate:inc>0?(inc-exp)/inc:0,projEnd:s.balance-Math.max(0,projExp-exp)}
}
function score(m){
  const rows=[],add=(n,p,max)=>rows.push({n,p:Math.round(p),max});
  add('Taxa de poupança (meta 20%)',clamp(m.rate/.2,0,1)*30,30);
  add('Reserva de emergência (6 meses)',m.avgExp>0?clamp(Number(profile.reserve_amount||0)/(m.avgExp*6),0,1)*25:12,25);
  add('Contas em dia',m.overdue.length?Math.max(0,20-6*m.overdue.length):20,20);
  add('Orçamento por categoria',m.bk.length?(1-m.over.length/m.bk.length)*15:10,15);
  add('Saldo livre positivo',m.s.available>0?10:0,10);
  return {total:rows.reduce((s,r)=>s+r.p,0),rows}
}
function subs(){
  const g={};paid('expense').forEach(t=>{const k=(t.description||'').trim().toLowerCase();(g[k]=g[k]||[]).push(t)});
  return Object.values(g).map(a=>{const ms=new Set(a.map(t=>ym(t.transaction_date))),v=a.map(t=>Number(t.amount)),avg=v.reduce((x,y)=>x+y,0)/v.length;
    return ms.size>=3&&v.every(x=>Math.abs(x-avg)<=avg*.1)?{name:a[0].description,avg,months:ms.size}:null}).filter(Boolean).sort((a,b)=>b.avg-a.avg)
}
function anomalies(){
  const cur=today().slice(0,7),hist={};paid('expense').filter(t=>ym(t.transaction_date)<cur).forEach(t=>(hist[t.category]=hist[t.category]||[]).push(Number(t.amount)));
  return paid('expense').filter(t=>ym(t.transaction_date)===cur).filter(t=>{const h=hist[t.category];if(!h||h.length<3)return false;const a=h.reduce((x,y)=>x+y,0)/h.length;return t.amount>=100&&t.amount>a*2.5}).slice(0,5)
}
function plusHTML(){
  const m=metrics(),sc=score(m),col=sc.total>=70?'var(--teal)':sc.total>=45?'var(--amber)':'var(--red)';
  const label=sc.total>=70?'Saudável':sc.total>=45?'Atenção':'Crítico';
  const alerts=[...m.overdue.map(b=>`<div class="pl-alert bad">⚠ <b>${esc(b.name)}</b> venceu em ${dateBR(b.due_date)} (${R(b.amount)})</div>`),
    ...m.soon.map(b=>`<div class="pl-alert">⏰ <b>${esc(b.name)}</b> vence em ${dateBR(b.due_date)} (${R(b.amount)})</div>`),
    ...m.over.map(c=>`<div class="pl-alert bad">📊 Orçamento de <b>${esc(c)}</b> estourado: ${R(m.cats[c])} de ${R(m.budgets[c])}</div>`),
    ...m.near.map(c=>`<div class="pl-alert">📊 <b>${esc(c)}</b> já usou ${Math.round(m.cats[c]/m.budgets[c]*100)}% do orçamento</div>`),
    ...anomalies().map(t=>`<div class="pl-alert">🔎 Gasto atípico: <b>${esc(t.description)}</b> (${R(t.amount)}) em ${esc(t.category)}</div>`)].join('')||'<div class="pl-alert">✅ Nenhum alerta. Tudo sob controle.</div>';
  const pc=byCat(today().slice(0,7)),pp=byCat(prevYm());
  const cmp=Object.keys(pc).sort((a,b)=>pc[b]-pc[a]).slice(0,6).map(c=>{const p=pp[c]||0,d=p?Math.round((pc[c]-p)/p*100):null;return `<li><span>${esc(c)}</span><span>${R(pc[c])} ${d===null?'':`<small class="${d>0?'pl-up':'pl-down'}">${d>0?'▲':'▼'} ${Math.abs(d)}%</small>`}</span></li>`}).join('')||'<li>Sem despesas pagas neste mês.</li>';
  const sb2=subs().slice(0,6).map(s=>`<li><span>${esc(s.name)}</span><span>${R(s.avg)} · ${s.months} meses</span></li>`).join('')||'<li>Nenhum gasto recorrente detectado ainda.</li>';
  const sal=Number(profile.salary_amount||0);
  return `<div class="pl-card" style="margin-bottom:16px"><h3>⚡ Lançamento rápido</h3><p class="sub">Digite como fala: <i>mercado 45,90</i> · <i>uber 23</i> · <i>+salário 5000</i> (o “+” cria receita)</p><form id="plQuick" class="pl-quick"><input id="plQuickText" placeholder="descrição valor" autocomplete="off"><button class="btn primary">Adicionar</button></form></div>
  <div class="pl-grid">
   <div class="pl-card"><h3>Saúde financeira</h3><p class="sub">Pontuação calculada com seus dados reais</p><div class="pl-score"><div class="pl-ring" style="--v:${sc.total};--c:${col}"><b>${sc.total}</b></div><div><b style="color:${col};font-size:18px">${label}</b><br><small class="muted">de 100 pontos</small></div></div><ul class="pl-list" style="margin-top:12px">${sc.rows.map(r=>`<li><span>${r.n}</span><span>${r.p}/${r.max}</span></li>`).join('')}</ul></div>
   <div class="pl-card"><h3>Previsão do mês</h3><p class="sub">Estimativa pelo ritmo de gastos até hoje</p><ul class="pl-list"><li><span>Receitas no mês</span><b>${R(m.inc)}</b></li><li><span>Despesas até agora</span><b>${R(m.exp)}</b></li><li><span>Despesa projetada</span><b>${R(m.projExp)}</b></li><li><span>Saldo estimado no fim do mês</span><b class="${m.projEnd<0?'pl-up':''}">${R(m.projEnd)}</b></li><li><span>Taxa de poupança</span><b>${(m.rate*100).toFixed(1)}%</b></li><li><span>Média de despesas (3 meses)</span><b>${R(m.avgExp)}</b></li></ul></div>
   <div class="pl-card"><h3>Alertas inteligentes</h3><p class="sub">Vencimentos, orçamentos e gastos fora do padrão</p>${alerts}</div>
   <div class="pl-card"><h3>Categorias vs. mês anterior</h3><p class="sub">Onde seu dinheiro está indo</p><ul class="pl-list">${cmp}</ul></div>
   <div class="pl-card"><h3>Gastos recorrentes detectados</h3><p class="sub">Mesmo valor em 3+ meses (assinaturas, mensalidades)</p><ul class="pl-list">${sb2}</ul></div>
   <div class="pl-card"><h3>Regra 50/30/20</h3><p class="sub">Sobre o salário cadastrado (${R(sal)})</p><ul class="pl-list"><li><span>Necessidades (50%)</span><b>${R(sal*.5)}</b></li><li><span>Desejos (30%)</span><b>${R(sal*.3)}</b></li><li><span>Poupar/investir (20%)</span><b>${R(sal*.2)}</b></li><li><span>Reserva ideal (6 meses)</span><b>${R(m.avgExp*6)}</b></li><li><span>Reserva atual</span><b>${R(profile.reserve_amount||0)}</b></li></ul></div>
   <div class="pl-card"><h3>Simulador de juros compostos</h3><p class="sub">Quanto seus aportes podem render</p><div class="pl-form"><label>Inicial (R$)<input id="jcI" type="number" value="1000"></label><label>Mensal (R$)<input id="jcM" type="number" value="300"></label><label>Taxa % ao ano<input id="jcT" type="number" value="10" step="0.1"></label><label>Anos<input id="jcA" type="number" value="10"></label></div><div id="jcOut" class="pl-alert"></div></div>
  </div>
  <div class="pl-noprint" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn outline" id="plPrint">🖨 Imprimir / salvar PDF</button><button class="btn outline" id="plSearchBtn">🔎 Buscar (Ctrl+K)</button></div>`
}
function jc(){const g=id=>Number($(id).value)||0,i=g('jcI'),mo=g('jcM'),t=g('jcT'),a=g('jcA'),r=Math.pow(1+t/100,1/12)-1;let v=i;for(let k=0;k<a*12;k++)v=v*(1+r)+mo;const inv=i+mo*a*12;$('jcOut').innerHTML=`Total investido <b>${R(inv)}</b> → valor final <b>${R(v)}</b> · rendimento <b>${R(v-inv)}</b> <small>(simulação, não garante retorno)</small>`}
const KW={Alimentação:/mercado|pizza|lanche|restaurante|ifood|padaria|almoço|jantar|café/i,Transporte:/uber|99|gasolina|combust|ônibus|metrô|estacion|pedágio/i,Saúde:/farmácia|remédio|médico|consulta|dentista|exame/i,Lazer:/cinema|netflix|spotify|bar|show|viagem|jogo/i,Moradia:/aluguel|condom|luz|água|gás|internet/i,Educação:/curso|escola|faculdade|livro/i};
async function quickAdd(e){e.preventDefault();const raw=$('plQuickText').value.trim(),mt=raw.match(/^([+-])?\s*(.+?)\s+(?:R\$\s*)?(\d[\d.]*(?:,\d{1,2})?|\d+\.\d{1,2})$/);
  if(!mt)return toast('Use o formato: descrição valor (ex.: mercado 45,90)');
  let num=mt[3];num=num.includes(',')?num.replace(/\./g,'').replace(',','.'):num;const amount=Number(num);if(!(amount>0))return toast('Valor inválido.');
  const kind=mt[1]==='+'?'income':'expense',desc=mt[2],cat=kind==='income'?'Salário':(Object.keys(KW).find(k=>KW[k].test(desc))||'Outros');
  const {error}=await sb.from('transactions').insert({user_id:user.id,description:desc,category:cat,amount,transaction_date:today(),kind,is_paid:true,notes:'Lançamento rápido'});
  if(error)return toast(error.message);toast(`${kind==='income'?'Receita':'Despesa'} de ${R(amount)} adicionada em ${cat}.`);await loadData();renderPage()}
function bindPlus(){$('plQuick').onsubmit=quickAdd;['jcI','jcM','jcT','jcA'].forEach(i=>$(i).oninput=jc);jc();$('plPrint').onclick=()=>window.print();$('plSearchBtn').onclick=openSearch}
function openSearch(){let d=$('plusSearch');if(!d){d=document.createElement('dialog');d.id='plusSearch';d.innerHTML='<input id="plQ" placeholder="Buscar lançamentos e contas…" autocomplete="off"><ul id="plRes" class="pl-list"></ul>';document.body.appendChild(d);d.addEventListener('click',e=>{if(e.target===d)d.close()});
  $('plQ').oninput=()=>{const q=$('plQ').value.trim().toLowerCase();if(!q){$('plRes').innerHTML='';return}
    const a=transactions.filter(t=>(t.description+' '+t.category+' '+(t.notes||'')).toLowerCase().includes(q)).slice(0,8).map(t=>`<li><span>${esc(t.description)} <small class="muted">${dateBR(t.transaction_date)} · ${esc(t.category)}</small></span><b class="${t.kind==='income'?'pl-down':''}">${t.kind==='income'?'+':'−'}${R(t.amount)}</b></li>`),
    b=bills.filter(x=>(x.name+' '+(x.category||'')).toLowerCase().includes(q)).slice(0,5).map(x=>`<li><span>📅 ${esc(x.name)} <small class="muted">vence ${dateBR(x.due_date)}</small></span><b>${R(x.amount)}</b></li>`);
    $('plRes').innerHTML=[...a,...b].join('')||'<li>Nada encontrado.</li>'}}
  d.showModal();$('plQ').value='';$('plRes').innerHTML='';$('plQ').focus()}
/* privacidade: oculta valores em R$ */
const priv=()=>localStorage.getItem('si_priv')==='1';
function applyPrivacy(){const root=$('pageContent');if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),hit=[];while(w.nextNode()){const n=w.currentNode;if(/R\$\s?[\d.,-]+/.test(n.nodeValue)&&n.parentElement&&!n.parentElement.closest('input,select,textarea,script,style'))hit.push(n)}
  hit.forEach(n=>{if(!priv())return;const f=document.createDocumentFragment();n.nodeValue.split(/(R\$\s?[\d.,-]+)/).forEach(p=>{if(/^R\$/.test(p)){const s=document.createElement('span');s.className='pv-hide';s.textContent=p;f.appendChild(s)}else if(p)f.appendChild(document.createTextNode(p))});n.replaceWith(f)})}
/* integração com o app existente */
const _render=renderPage,_go=goPage;
renderPage=function(){if(user&&currentPage==='plus'){$('pageContent').innerHTML=plusHTML();bindPlus()}else _render();applyPrivacy()};
goPage=function(p){_go(p);if(p==='plus')$('pageTitle').textContent='Painel Plus'};
function inject(){const mk=()=>{const b=document.createElement('button');b.className='nav-item';b.dataset.page='plus';b.innerHTML='✦ <span>Painel Plus</span>';return b};
  const sec=document.querySelector('.nav-section');if(sec)sec.insertBefore(mk(),sec.children[1]);const g=document.querySelector('.mobile-more-grid');if(g)g.prepend(mk());
  const ta=document.querySelector('.top-actions');if(ta){const e=document.createElement('button');e.className='icon-btn';e.title='Ocultar/mostrar valores';e.textContent=priv()?'🙈':'👁';e.onclick=()=>{localStorage.setItem('si_priv',priv()?'0':'1');e.textContent=priv()?'🙈':'👁';renderPage()};ta.prepend(e)}}
inject();
document.addEventListener('keydown',e=>{const t=e.target.tagName,typing=/INPUT|TEXTAREA|SELECT/.test(t);if(!user)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}else if(!typing&&e.key==='n'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();openTransaction()}});
})();
