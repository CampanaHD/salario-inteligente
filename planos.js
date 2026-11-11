/* ===== Planos de assinatura: Gratuito, Premium e Completo =====
   O plano vem da tabela `subscriptions` (somente leitura para o usuário; só o administrador/gateway altera).
   Mapeamento com a coluna existente: free = Gratuito · individual = Premium · family = Completo.
   Para mudar preços, textos ou o que cada plano libera, edite só este bloco de configuração. */
(function(){
const PLAN_CONFIG={
  /* Cole aqui os links de pagamento (Mercado Pago, Stripe, Kiwify etc.). Vazio = mostra aviso. */
  checkout:{individual:'',family:''},
  /* Opcional: link de contato para pedir a assinatura, ex.: 'https://wa.me/5514999999999' */
  contato:'https://wa.me/5514996953220'
};
const RANK={free:0,individual:1,family:2};
const PLANS={
  free:{name:'Gratuito',price:0,tag:'Para começar',items:['Painel e visão geral','Lançamentos de receitas e despesas','Contas e parcelas','Metas','Configurações e salário']},
  individual:{name:'Premium',price:9.9,tag:'Mais escolhido',items:['Tudo do Gratuito','Cartões de crédito (limite e fatura)','Contas bancárias e saldos','Veículos e abastecimento','Hora extra','Relatórios financeiros']},
  family:{name:'Completo',price:19.9,tag:'Tudo liberado',items:['Tudo do Premium','Investimentos','Planejamento futuro','Painel Plus','Família (grupo compartilhado)','Backup completo dos dados']}
};
/* plano mínimo para abrir cada aba (abas que não aparecem aqui são do plano Gratuito) */
const PAGE_PLAN={cards:'individual',accounts:'individual',fuel:'individual',overtime:'individual',reports:'individual',
  investments:'family',planning:'family',plus:'family',family:'family'};
const PAGE_NAME={cards:'Cartões de crédito',accounts:'Contas bancárias',fuel:'Veículos e abastecimento',overtime:'Hora extra',reports:'Relatórios financeiros',
  investments:'Investimentos',planning:'Planejamento futuro',plus:'Painel Plus',family:'Família'};

const g=id=>document.getElementById(id);
const brl=v=>v===0?'Grátis':'R$ '+v.toFixed(2).replace('.',',');
let sub=null,loaded=false,loading=false,failed=false,subUser=null;

function effective(){
  if(failed)return 'family';              /* tabela indisponível (SQL ainda não executado): não trava o sistema */
  if(!sub||!RANK[sub.plan])return 'free';
  const ok=['active','trialing'].includes(sub.status)&&(!sub.current_period_end||new Date(sub.current_period_end)>new Date());
  return ok?sub.plan:'free';
}
window.currentPlan=effective;
window.hasPlan=p=>RANK[effective()]>=RANK[p];

function ensureSub(){
  if(!user)return;
  if(subUser!==user.id){subUser=user.id;sub=null;loaded=false;loading=false;failed=false}
  if(loaded||loading)return;
  if(typeof sb==='undefined'||!sb){failed=true;loaded=true;return}
  loading=true;
  Promise.resolve(sb.from('subscriptions').select('*').eq('user_id',user.id).maybeSingle())
   .then(r=>{if(r&&r.error){failed=true;console.warn('Planos: tabela subscriptions indisponível',r.error.message)}else sub=r&&r.data||null})
   .catch(e=>{failed=true;console.warn('Planos:',e)})
   .finally(()=>{loaded=true;loading=false;renderPage()});
}

function lockedHTML(page,need){
  const p=PLANS[need];
  return `<div class="plan-locked"><div class="plan-lock-ico">🔒</div>
    <h3>${PAGE_NAME[page]||'Esta área'} faz parte do plano ${p.name}</h3>
    <p class="muted">Seu plano atual é o <b>${PLANS[effective()].name}</b>. Faça upgrade para o ${p.name} (${brl(p.price)}/mês) e libere esta e outras áreas.</p>
    <div class="plan-locked-acts"><button class="btn primary" data-plan-go="plans">Ver planos</button><button class="btn outline" data-plan-buy="${need}">Assinar ${p.name}</button></div></div>`;
}
function fmtDate(d){try{return new Date(d).toLocaleDateString('pt-BR')}catch(e){return ''}}
function plansHTML(){
  const cur=effective(),active=cur!=='free'&&sub&&sub.current_period_end;
  const card=k=>{const p=PLANS[k],mine=k===cur,up=RANK[k]>RANK[cur];
    return `<div class="plan-card2 ${k==='individual'?'featured':''} ${mine?'current':''}">
      ${k==='individual'?'<span class="plan-ribbon">'+p.tag+'</span>':''}
      <div class="plan-name">${p.name}</div>
      <div class="plan-price"><b>${brl(p.price)}</b>${p.price?'<small>/mês</small>':''}</div>
      <p class="muted plan-sub">${k==='free'?p.tag:(k==='family'?'Sem limites: todas as áreas':'Quase tudo, pelo menor preço')}</p>
      <ul>${p.items.map(i=>'<li>'+i+'</li>').join('')}</ul>
      ${mine?'<button class="btn outline full" disabled>Seu plano atual</button>':up?`<button class="btn primary full" data-plan-buy="${k}">Assinar ${p.name}</button>`:'<button class="btn outline full" disabled>Incluído no seu plano</button>'}
    </div>`};
  return `<div class="page-intro"><div><h3>Planos e assinatura</h3><p class="muted">Seu plano atual: <b>${PLANS[cur].name}</b>${active?' · válido até '+fmtDate(sub.current_period_end):''}</p></div></div>
    <div class="plan-grid">${['free','individual','family'].map(card).join('')}</div>
    <p class="muted small plan-foot">Cobrança mensal. Depois do pagamento, o plano é liberado na sua conta. Dúvidas? Fale com o suporte.</p>`;
}
function buy(k){
  const url=PLAN_CONFIG.checkout[k],p=PLANS[k];
  if(url){window.open(url+(url.includes('?')?'&':'?')+'client_reference_id='+encodeURIComponent(user.id)+'&prefilled_email='+encodeURIComponent(user.email||''),'_blank','noopener');return}
  if(PLAN_CONFIG.contato){window.open(PLAN_CONFIG.contato+(PLAN_CONFIG.contato.includes('?')?'&':'?')+'text='+encodeURIComponent('Olá! Quero assinar o plano '+p.name+' do Salário Inteligente. Meu e-mail: '+(user.email||'')),'_blank','noopener');return}
  toast('A assinatura online ainda não foi configurada. Peça a ativação do plano '+p.name+' ao administrador.');
}
function bindPlans(){
  document.querySelectorAll('[data-plan-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.planBuy));
  document.querySelectorAll('[data-plan-go]').forEach(b=>b.onclick=()=>goPage(b.dataset.planGo));
}
function decorate(){
  const cur=RANK[effective()];
  document.querySelectorAll('.nav-item[data-page]').forEach(b=>{
    const need=PAGE_PLAN[b.dataset.page],locked=need&&cur<RANK[need];
    b.classList.toggle('is-locked',!!locked);
    let t=b.querySelector('.plan-lock');
    if(locked&&!t){t=document.createElement('em');t.className='plan-lock';t.textContent='🔒';b.appendChild(t)}
    if(!locked&&t)t.remove();
  });
  const um=document.querySelector('.user-mini > div:not(.avatar)');
  if(um){let c=um.querySelector('.plan-chip');if(!c){c=document.createElement('span');c.className='plan-chip';um.appendChild(c)}
    c.textContent='Plano '+PLANS[effective()].name;c.dataset.plan=effective()}
}
function addNav(){
  const secs=document.querySelectorAll('.nav-section'),last=secs[secs.length-1];
  if(last&&!last.querySelector('[data-page="plans"]')){const b=document.createElement('button');b.className='nav-item';b.dataset.page='plans';b.innerHTML='💎 <span>Planos</span>';last.insertBefore(b,last.querySelector('.nav-item'))}
  const grid=document.querySelector('.mobile-more-grid');
  if(grid&&!grid.querySelector('[data-page="plans"]')){const b=document.createElement('button');b.className='nav-item';b.dataset.page='plans';b.innerHTML='💎 <span>Planos</span>';grid.appendChild(b)}
}
addNav();

const _rp=renderPage;
renderPage=function(){
  if(!user)return _rp();
  ensureSub();addNav();
  const c=g('pageContent'),need=PAGE_PLAN[currentPage];
  if(currentPage==='plans'){c.innerHTML=plansHTML();bindPlans();decorate();return}
  if(need&&!loaded){c.innerHTML='<div class="plan-locked"><p class="muted">Verificando seu plano…</p></div>';decorate();return}
  if(need&&RANK[effective()]<RANK[need]){c.innerHTML=lockedHTML(currentPage,need);bindPlans();decorate();return}
  _rp();decorate();
};
const _gp=goPage;
goPage=async function(page){
  const r=await _gp(page);
  if(page==='plans'&&g('pageTitle'))g('pageTitle').textContent='Planos';
  else if(PAGE_NAME[page]&&g('pageTitle'))g('pageTitle').textContent=PAGE_NAME[page];
  return r;
};
/* backup completo: só no plano Completo */
if(typeof exportFullBackup==='function'){const _eb=exportFullBackup;exportFullBackup=function(){
  if(!hasPlan('family'))return toast('O backup completo faz parte do plano Completo.');
  return _eb.apply(this,arguments)}}
})();
