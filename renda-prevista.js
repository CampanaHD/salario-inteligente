/* Renda prevista + projeção inteligente: receitas extras, histórico e cenários de hora extra. */
(function(){
  'use strict';
  const br=n=>money(Number(n)||0), escp=s=>esc(String(s??'')), iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const startOfMonth=(y,m)=>new Date(y,m,1,12), endOfMonth=(y,m)=>new Date(y,m+1,0,12);
  const avg=(arr)=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
  const hist=()=>{const n=new Date(),keys=[];for(let i=1;i<=3;i++)keys.push(monthKey(startOfMonth(n.getFullYear(),n.getMonth()-i)));const rows=keys.map(k=>transactions.filter(t=>(t.transaction_date||'').slice(0,7)===k&&t.is_paid));const inc=rows.map(r=>r.filter(t=>t.kind==='income').reduce((a,t)=>a+Number(t.amount||0),0));const exp=rows.map(r=>r.filter(t=>t.kind==='expense').reduce((a,t)=>a+Number(t.amount||0),0));return{income:avg(inc),expense:avg(exp),months:keys.length,inc,exp}};
  const overtime=()=>window.siOvertimeForecast?window.siOvertimeForecast():{hourlyRate:Number(profile.salary_amount||0)/220,extraPct:50,average:0,current:0};
  function forecastRows(){
    const h=hist(),ot=overtime(),now=new Date(),out=[];
    for(let i=0;i<6;i++){
      const d=startOfMonth(now.getFullYear(),now.getMonth()+i),key=monthKey(d),end=iso(endOfMonth(d.getFullYear(),d.getMonth()));
      const pending=transactions.filter(t=>(t.transaction_date||'').slice(0,7)===key&&!t.is_paid&&!String(t.notes||'').includes('compra_id:'));
      const paid=transactions.filter(t=>(t.transaction_date||'').slice(0,7)===key&&t.is_paid);
      let salary=0;try{const p=projectedSalaryForMonth(d.getFullYear(),d.getMonth());salary=Number(p?.total||0)}catch(e){salary=Number(profile.salary_amount||0)}
      const salaryPending=pending.filter(t=>t.kind==='income'&&/sal[aá]rio/i.test((t.description||'')+' '+(t.category||''))).reduce((a,t)=>a+Number(t.amount||0),0);
      if(salaryPending>0)salary=salaryPending;
      const otherPendingIn=pending.filter(t=>t.kind==='income'&&!/sal[aá]rio|hora extra/i.test((t.description||'')+' '+(t.category||''))).reduce((a,t)=>a+Number(t.amount||0),0);
      const pendingOut=pending.filter(t=>t.kind==='expense').reduce((a,t)=>a+Number(t.amount||0),0);
      let recurring=0;bills.filter(b=>b.is_active!==false&&b.due_date).forEach(b=>{const due=new Date(b.due_date+'T12:00:00'),freq=b.frequency||'once';if(freq==='monthly')recurring+=Number(b.amount||0);else if(due.getFullYear()===d.getFullYear()&&due.getMonth()===d.getMonth())recurring+=Number(b.amount||0)});
      const card=typeof cardPurchases!=='undefined'?cardPurchases.filter(p=>p.status!=='cancelled').reduce((a,p)=>{const st=new Date((p.purchase_date||today())+'T12:00:00'),off=(d.getFullYear()-st.getFullYear())*12+d.getMonth()-st.getMonth();return off>=0&&off<Number(p.installments_total)-Number(p.installments_paid||0)?a+Number(p.installment_amount||0):a},0):0;
      const monthOT=pending.filter(t=>t.kind==='income'&&/hora extra/i.test((t.description||'')+' '+(t.category||''))).reduce((a,t)=>a+Number(t.amount||0),0);
      const otForecast=monthOT>0?monthOT:(i===0?Math.max(0,ot.current):ot.average);
      const paidOtherIncome=i===0?paid.filter(t=>t.kind==='income'&&!/sal[aá]rio|hora extra/i.test((t.description||'')+' '+(t.category||''))).reduce((a,t)=>a+Number(t.amount||0),0):0;
      const otherFuture=otherPendingIn;
      const income=salary+otherFuture+paidOtherIncome+(monthOT>0?0:otForecast);
      // Histórico de despesas pagas é referência; compromissos cadastrados são exibidos separadamente.
      const currentPaidExpense=paid.filter(t=>t.kind==='expense').reduce((a,t)=>a+Number(t.amount||0),0);
      const elapsed=Math.max(1,now.getDate()),remaining=Math.max(0,endOfMonth(d.getFullYear(),d.getMonth()).getDate()-now.getDate());
      const historicExpense=i===0?currentPaidExpense+(h.expense/30)*remaining:h.expense;
      const scheduled=Math.max(pendingOut+recurring+card,historicExpense);
      out.push({key,label:d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),salary,otherFuture,otForecast,income,expense:scheduled,net:income-scheduled,pendingOut,recurring,card,historicExpense,manual:pending.filter(t=>t.kind==='income'&&String(t.notes||'').includes('si_forecast_income:manual'))});
    }
    return{rows:out,h,ot};
  }
  function incomePanel(){
    const {rows,ot}=forecastRows();
    const items=transactions.filter(t=>t.kind==='income'&&String(t.notes||'').includes('si_forecast_income:manual')).sort((a,b)=>(a.transaction_date||'').localeCompare(b.transaction_date||''));
    const extraRows=items.map(t=>`<div class="vh-item"><div class="grow"><b>${escp(t.description)}</b><br><small class="muted">${dateBR(t.transaction_date)} · ${t.is_paid?'Recebido':'Previsto'}</small>${t.notes?.split(' | ')[1]?`<br><small class="muted">${escp(t.notes.split(' | ')[1])}</small>`:''}</div><div style="text-align:right"><b class="positive">${br(t.amount)}</b><br>${!t.is_paid?`<button class="mini-btn" data-rp-received="${t.id}">Marcar recebido</button>`:''} <button class="mini-btn danger" data-rp-delete="${t.id}">Excluir</button></div></div>`).join('');
    return `<section class="vh-card" style="margin:0 0 16px;border:1px solid var(--accent,#16a36a)">
      <div class="vh-hero" style="margin:0 0 12px"><div><div class="eyebrow">PREVISÃO INTEGRADA AO DÉFICIT</div><h3>Entradas previstas e renda extra</h3><p>Cadastre aqui serviços, sites, sistemas e outras receitas. Elas entram no saldo projetado do mês correspondente, sem serem tratadas como dinheiro recebido.</p></div></div>
      <details open class="vh-card" style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:800;padding:4px 0">＋ Cadastrar receita prevista</summary><form id="rpIncomeForm" class="vh-form" style="margin-top:12px"><div class="form-grid"><label>Descrição<input id="rpName" required maxlength="100" placeholder="Ex.: Criação de site"></label><label>Valor esperado (R$)<input id="rpAmount" required type="number" min="0.01" step="0.01" placeholder="850,00"></label><label>Data prevista para receber<input id="rpDate" required type="date" value="${iso(new Date())}"></label><label>Cliente / observação (opcional)<input id="rpNote" placeholder="Cliente, etapa ou condição"></label></div><div class="modal-actions" style="justify-content:flex-end"><button class="btn primary" type="submit">Salvar receita no planejamento</button></div></form></details>
      <div class="vh-card" style="margin-bottom:12px"><h3 style="margin:0 0 8px">Simular horas extras adicionais</h3><p class="muted" style="margin:0 0 10px">A simulação usa o valor da hora e o adicional configurados na aba Hora extra. O valor estimado aparece nas projeções futuras, sem virar recebimento confirmado.</p><div class="form-grid"><label>Horas extras a mais no mês<input id="rpHours" type="number" min="0" step="0.5" value="10"></label><label>Adicional (%)<input id="rpPct" type="number" min="0" step="1" value="${Number(ot.extraPct||50)}"></label></div><div id="rpScenario" class="vh-calc"></div></div>
      <h3 class="vh-h">Déficit / saldo previsto — próximos 6 meses</h3><p class="muted">Este quadro reúne salário, receitas por fora cadastradas, horas extras estimadas, contas, parcelas e despesas projetadas.</p>
      <div class="grid forecast-grid">${rows.map(r=>`<section class="vh-card"><b style="text-transform:capitalize">${escp(r.label)}</b><div class="forecast-net ${r.net<0?'negative':'positive'}" style="font-size:25px;font-weight:850;margin:8px 0">${br(r.net)}</div><div class="muted small">${r.net<0?'Déficit previsto':'Saldo previsto'}</div><div class="forecast-line"><span>Salário previsto</span><b>${br(r.salary)}</b></div><div class="forecast-line"><span>Receitas por fora</span><b class="positive">${br(r.otherFuture)}</b></div><div class="forecast-line"><span>Horas extras previstas</span><b class="positive">${br(r.otForecast)}</b></div><div class="forecast-line"><span>Total de entradas</span><b>${br(r.income)}</b></div><div class="forecast-line"><span>Despesas projetadas</span><b class="negative">${br(r.expense)}</b></div><div class="forecast-line"><span>Contas + parcelas cadastradas</span><b>${br(r.pendingOut+r.recurring+r.card)}</b></div></section>`).join('')}</div>
      <h3 class="vh-h" style="margin-top:16px">Receitas extras cadastradas</h3><div class="vh-list">${extraRows||'<div class="vh-empty">Nenhuma receita por fora cadastrada. Use “Cadastrar receita prevista” acima.</div>'}</div>
      <div class="vh-alert soon" style="margin-top:12px"><b>🔔 Lembretes de recebimento</b><span>Receitas com data vencida continuam pendentes até você marcar como recebidas. O aviso aparece aqui dentro do sistema.</span></div></section>`;
  }
  const oldPlanning=planningHTML;planningHTML=function(){return incomePanel()+oldPlanning()};
  const oldBind=bindPageActions;bindPageActions=function(){oldBind();if(currentPage!=='planning')return;
    const form=document.getElementById('rpIncomeForm');if(form)form.onsubmit=async e=>{e.preventDefault();if(!user||!sb)return toast('Entre na sua conta para salvar.');const description=document.getElementById('rpName').value.trim(),amount=Number(document.getElementById('rpAmount').value),date=document.getElementById('rpDate').value,note=document.getElementById('rpNote').value.trim();if(!description||!(amount>0)||!date)return toast('Preencha descrição, valor e data prevista.');const r=await sb.from('transactions').insert({user_id:user.id,description,category:'Renda extra',amount,transaction_date:date,kind:'income',is_paid:false,notes:'si_forecast_income:manual'+(note?' | '+note:'')});if(r.error)return toast('Não foi possível salvar: '+r.error.message);await loadData();renderPage();toast('Receita prevista cadastrada e incluída no planejamento.');};
    document.querySelectorAll('[data-rp-received]').forEach(b=>b.onclick=async()=>{const id=b.dataset.rpReceived;if(!confirm('Confirmar que esta receita foi recebida?'))return;const r=await sb.from('transactions').update({is_paid:true}).eq('id',id);if(r.error)return toast(r.error.message);await loadData();renderPage();toast('Receita marcada como recebida.');});
    document.querySelectorAll('[data-rp-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir esta receita prevista?'))return;const r=await sb.from('transactions').delete().eq('id',b.dataset.rpDelete);if(r.error)return toast(r.error.message);await loadData();renderPage();toast('Receita excluída.');});
    const upd=()=>{const h=Number(document.getElementById('rpHours')?.value)||0,p=Number(document.getElementById('rpPct')?.value)||0,o=overtime(),v=h*Number(o.hourlyRate||0)*(1+p/100),box=document.getElementById('rpScenario');if(box)box.innerHTML=`<div class="vh-tile"><small>Valor adicional estimado</small><b class="positive">${br(v)}</b></div><div class="vh-tile"><small>Total de renda extra com a média</small><b>${br(v+o.average)}</b></div><small class="muted">Estimativa bruta, sem descontos e sem DSR adicional.</small>`};['rpHours','rpPct'].forEach(id=>document.getElementById(id)?.addEventListener('input',upd));upd();
  };
})();
