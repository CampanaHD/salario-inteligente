/* Calendário financeiro + previsão inteligente de combustível */
(()=>{
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parse=s=>{const [y,m,d]=String(s||'').split('-').map(Number);return new Date(y,(m||1)-1,d||1,12)};
  const brl=n=>money(Number(n)||0);
  const monthLabel=d=>d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const cal={month:today().slice(0,7),day:today(),view:'month'};
  const monthStart=()=>parse(cal.month+'-01');
  const monthEnd=()=>new Date(monthStart().getFullYear(),monthStart().getMonth()+1,0,12);
  const addMonths=(d,n)=>new Date(d.getFullYear(),d.getMonth()+n,Math.min(d.getDate(),new Date(d.getFullYear(),d.getMonth()+n+1,0).getDate()),12);
  function calendarEvents(){
    const start=monthStart(),end=monthEnd(),a=iso(start),z=iso(end),ev=[];
    transactions.filter(t=>t.transaction_date>=a&&t.transaction_date<=z&&!String(t.notes||'').includes('compra_id:')).forEach(t=>ev.push({date:t.transaction_date,title:t.description||t.category||'Lançamento',amount:(t.kind==='income'?1:-1)*Number(t.amount||0),kind:t.kind==='income'?'income':'expense',status:t.is_paid?'Pago':'Pendente',source:'Lançamento',category:t.category||'Outros',id:t.id}));
    bills.filter(b=>b.is_active!==false&&b.due_date).forEach(b=>{
      let d=parse(b.due_date),guard=0;while(d<=end&&guard++<240){if(d>=start){ev.push({date:iso(d),title:b.name,amount:-Number(b.amount||0),kind:'bill',status:'Vencimento previsto',source:'Conta',category:b.category||'Contas',id:b.id})}
        if(b.frequency==='once')break;if(b.frequency==='weekly')d.setDate(d.getDate()+7);else if(b.frequency==='yearly'){const anchor=d.getDate();d.setFullYear(d.getFullYear()+1);d.setDate(Math.min(anchor,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()))}else{const anchor=d.getDate(),next=new Date(d.getFullYear(),d.getMonth()+1,1,12);next.setDate(Math.min(anchor,new Date(next.getFullYear(),next.getMonth()+1,0).getDate()));d=next;}
      }
    });
    return ev.sort((x,y)=>x.date.localeCompare(y.date)||x.title.localeCompare(y.title,'pt-BR'));
  }
  const moneySum=(rows,k)=>rows.reduce((s,x)=>s+Number(x[k]||0),0);
  function eventRow(e){const sign=e.amount>=0?'+':'−';return `<div class="fc-event"><span class="fc-event-mark ${e.kind}">${e.kind==='income'?'↗':e.kind==='bill'?'▦':'↘'}</span><div class="fc-event-main"><b>${esc(e.title)}</b><small>${esc(e.source)} · ${esc(e.category)} · ${e.status}</small></div><strong class="${e.amount>=0?'positive':'negative'}">${sign} ${brl(Math.abs(e.amount))}</strong></div>`}
  function calendarHTML(){
    const events=calendarEvents(),start=monthStart(),end=monthEnd(),first=(start.getDay()+6)%7,days=end.getDate(),todayIso=today(),chosen=events.filter(e=>e.date===cal.day);
    const income=moneySum(events.filter(e=>e.kind==='income'),'amount'),expense=moneySum(events.filter(e=>e.kind==='expense'),'amount'),billsDue=moneySum(events.filter(e=>e.kind==='bill'),'amount')*-1;
    const map={};events.forEach(e=>(map[e.date]=map[e.date]||[]).push(e));
    const cells=[];for(let i=0;i<first;i++)cells.push('<div class="fc-day fc-empty"></div>');
    for(let n=1;n<=days;n++){const date=iso(new Date(start.getFullYear(),start.getMonth(),n,12)),list=map[date]||[],inc=list.filter(e=>e.amount>0).reduce((s,e)=>s+e.amount,0),out=list.filter(e=>e.amount<0).reduce((s,e)=>s+Math.abs(e.amount),0);cells.push(`<button type="button" class="fc-day ${date===cal.day?'selected':''} ${date===todayIso?'today':''}" data-cal-day="${date}"><span class="fc-day-num">${n}</span>${list.length?`<span class="fc-dots"><i class="${inc?'inc':''}"></i><i class="${out?'out':''}"></i></span>`:''}${list.length?`<small>${list.length} ${list.length===1?'evento':'eventos'}</small>`:''}${inc||out?`<em class="fc-day-total ${inc>=out?'':'negative'}">${inc-out>0?'+':inc-out<0?'−':''}${brl(Math.abs(inc-out))}</em>`:''}</button>`)}
    const agenda=events.map(eventRow).join('')||'<div class="fc-empty-state">Nenhum compromisso financeiro neste mês.</div>';
    const dayEvents=chosen.map(eventRow).join('')||'<div class="fc-empty-state">Nenhum lançamento ou vencimento neste dia.</div>';
    return `<section class="fc-hero"><div><span class="fc-eyebrow">PLANEJAMENTO FINANCEIRO</span><h2>Seu dinheiro, dia após dia.</h2><p>Visualize receitas, despesas e vencimentos em um calendário único.</p></div><div class="fc-hero-icon">▦</div></section>
    <div class="fc-summary"><article><small>Receitas do mês</small><b class="positive">${brl(income)}</b><span>Registradas no calendário</span></article><article><small>Despesas lançadas</small><b class="negative">${brl(expense)}</b><span>Pagas e pendentes</span></article><article><small>Contas a vencer</small><b>${brl(billsDue)}</b><span>Previsões das contas ativas</span></article><article><small>Saldo previsto</small><b class="${income-expense-billsDue>=0?'positive':'negative'}">${brl(income-expense-billsDue)}</b><span>Receitas menos saídas previstas</span></article></div>
    <div class="fc-layout"><section class="fc-calendar panel"><div class="fc-cal-head"><div><span class="fc-eyebrow">CALENDÁRIO</span><h3>${monthLabel(start)}</h3></div><div class="fc-nav"><button class="btn outline" data-cal="prev" aria-label="Mês anterior">‹</button><button class="btn outline" data-cal="today">Hoje</button><button class="btn outline" data-cal="next" aria-label="Próximo mês">›</button></div></div><div class="fc-weekdays">${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=>`<span>${x}</span>`).join('')}</div><div class="fc-grid">${cells.join('')}</div><div class="fc-legend"><span><i class="inc"></i> Receitas</span><span><i class="out"></i> Despesas e vencimentos</span><span>Selecione um dia para ver os detalhes</span></div></section>
    <aside class="fc-side panel"><div class="fc-side-head"><div><span class="fc-eyebrow">DETALHAMENTO</span><h3>${parse(cal.day).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}</h3></div><span class="fc-count">${chosen.length}</span></div><div class="fc-events">${dayEvents}</div><div class="fc-divider"></div><div class="fc-side-head"><h3>Agenda do mês</h3><button class="fc-link" data-cal="agenda">Ver tudo</button></div><div class="fc-events fc-agenda">${events.slice(0,7).map(eventRow).join('')||'<p class="muted">Sem eventos previstos.</p>'}</div></aside></div>
    <section class="fc-agenda-full panel"><div class="fc-side-head"><div><span class="fc-eyebrow">VISÃO GERAL</span><h3>Todos os eventos de ${monthLabel(start)}</h3></div><span class="muted">${events.length} registros</span></div><div class="fc-events">${agenda}</div></section>`;
  }
  function bindCalendar(){
    const host=$('pageContent');if(!host||currentPage!=='calendar')return;
    host.querySelectorAll('[data-cal]').forEach(b=>b.onclick=()=>{const a=b.dataset.cal;if(a==='prev'){cal.month=iso(addMonths(monthStart(),-1)).slice(0,7);cal.day=cal.month+'-01'}if(a==='next'){cal.month=iso(addMonths(monthStart(),1)).slice(0,7);cal.day=cal.month+'-01'}if(a==='today'){cal.month=today().slice(0,7);cal.day=today()}if(a==='agenda'){$('pageContent').querySelector('.fc-agenda-full')?.scrollIntoView({behavior:'smooth',block:'start'});return}renderPage()});
    host.querySelectorAll('[data-cal-day]').forEach(b=>b.onclick=()=>{cal.day=b.dataset.calDay;renderPage()});
  }
  function fuelForecastHTML(){
    if(typeof vehicles==='undefined'||!vehicles.length)return '';
    const active=vehicles.filter(v=>v.is_active!==false);if(!active.length)return '';
    const records=typeof fuelRecords==='undefined'?[]:fuelRecords;
    const intervals=typeof fzIntervals==='function'?fzIntervals():[];
    const kmRows=typeof dailyKm!=='undefined'?dailyKm:[];
    const avgPrice=records.length?records.slice().sort((a,b)=>b.fuel_date.localeCompare(a.fuel_date)).slice(0,8).reduce((s,r)=>s+Number(r.price_per_liter||0),0)/Math.min(8,records.length):0;
    const rows=active.map(v=>{
      const fr=records.filter(r=>r.vehicle_id===v.id).sort((a,b)=>a.fuel_date.localeCompare(b.fuel_date));
      const iv=intervals.filter(x=>x.vid===v.id).sort((a,b)=>a.date.localeCompare(b.date));
      const kml=iv.length?iv.reduce((s,x)=>s+x.km,0)/Math.max(.001,iv.reduce((s,x)=>s+x.l,0)):0;
      const priceRows=fr.slice(-8),price=priceRows.length?priceRows.reduce((s,r)=>s+Number(r.price_per_liter||0),0)/priceRows.length:avgPrice;
      const recentKm=kmRows.filter(x=>x.vehicle_id===v.id&&x.log_date>=iso(new Date(Date.now()-29*864e5))).map(x=>Number(x.km_driven||0));
      let perDay=recentKm.length?recentKm.reduce((s,x)=>s+x,0)/recentKm.length:0;
      if(!perDay&&iv.length){const last=iv[iv.length-1],prev=iv[iv.length-2];if(prev){const days=Math.max(1,(parse(last.date)-parse(prev.date))/864e5);perDay=last.km/days}}
      const dailyCost=kml&&perDay&&price?perDay/kml*price:0,monthCost=dailyCost*30.44;
      const lastFull=fr.slice().reverse().find(r=>r.full_tank),latest=fr[fr.length-1];
      const lastDaily=kmRows.filter(x=>x.vehicle_id===v.id).sort((a,b)=>b.log_date.localeCompare(a.log_date))[0];
      const currentOdo=lastDaily?Math.max(Number(lastDaily.evening_odometer||0),Number(latest?.odometer||0)):Number(latest?.odometer||v.initial_odometer||0);
      let nextDays=null,remainingKm=null,refillDate=null;
      if(lastFull&&kml&&perDay&&Number(v.tank_capacity)>0){const driven=Math.max(0,currentOdo-Number(lastFull.odometer||0));const partialAdded=fr.filter(r=>r.fuel_date>lastFull.fuel_date).reduce((s,r)=>s+Number(r.liters||0),0);const remainingLiters=Math.max(0,Math.min(Number(v.tank_capacity),Number(v.tank_capacity)*.9-driven/kml+partialAdded));remainingKm=Math.max(0,remainingLiters*kml);nextDays=Math.ceil(remainingKm/perDay);const dt=new Date();dt.setDate(dt.getDate()+nextDays);refillDate=dt}
      else if(iv.length>=2&&perDay){const last=iv[iv.length-1],prev=iv[iv.length-2],days=Math.max(1,(parse(last.date)-parse(prev.date))/864e5);nextDays=Math.max(0,Math.ceil(days-(Math.max(0,(currentOdo-Number(latest?.odometer||currentOdo))/perDay))))}
      return {v,kml,perDay,price,dailyCost,monthCost,nextDays,remainingKm,refillDate,hasData:!!(kml&&perDay&&price)};
    });
    const valid=rows.filter(x=>x.hasData),sumDaily=valid.reduce((s,x)=>s+x.dailyCost,0),sumMonth=valid.reduce((s,x)=>s+x.monthCost,0);
    const tile=(t,val,sub)=>`<article class="fz-forecast-tile"><small>${t}</small><b>${val}</b><span>${sub}</span></article>`;
    return `<section class="fz-forecast"><div class="fz-forecast-head"><div><span class="fc-eyebrow">PREVISÃO INTELIGENTE</span><h3>Quanto seu combustível vai custar?</h3><p>Estimativas com base nos abastecimentos e na quilometragem diária registrada.</p></div><span class="fz-forecast-icon">✦</span></div><div class="fz-forecast-kpis">${tile('Gasto estimado por dia',sumDaily?brl(sumDaily):'—','Média da frota acompanhada')}${tile('Projeção para 30 dias',sumMonth?brl(sumMonth):'—','Mantendo o ritmo atual')}${tile('Veículos com previsão',`${valid.length}/${active.length}`,'Com histórico suficiente')}</div><div class="fz-forecast-list">${rows.map(x=>`<article class="fz-forecast-row"><div class="fz-forecast-vehicle"><span>🚘</span><div><b>${esc(x.v.name)}</b><small>${x.kml?nf(x.kml,2)+' km/L':'Consumo ainda não calculado'}${x.perDay?' · '+nf(x.perDay,1)+' km/dia':''}</small></div></div><div class="fz-forecast-cost"><small>Combustível/dia</small><b>${x.dailyCost?brl(x.dailyCost):'—'}</b></div><div class="fz-forecast-cost"><small>Combustível/mês</small><b>${x.monthCost?brl(x.monthCost):'—'}</b></div><div class="fz-forecast-refill"><small>Próximo abastecimento</small><b>${x.nextDays===null?'Aguardando dados':x.nextDays===0?'Pode abastecer agora':`Em aproximadamente ${x.nextDays} dia${x.nextDays===1?'':'s'}`}</b><span>${x.refillDate?x.refillDate.toLocaleDateString('pt-BR'):x.remainingKm!==null?nf(x.remainingKm,0)+' km estimados restantes':'Registre tanque cheio, capacidade e km diários para estimar a data.'}</span></div></article>`).join('')}</div><p class="fz-forecast-note">A previsão é uma estimativa, não uma leitura do nível real do tanque. Para melhorar a precisão, registre a quilometragem diária e marque tanque cheio nos abastecimentos.</p></section>`;
  }
  if(typeof fuelProHTML==='function'){const baseFuel=fuelProHTML;fuelProHTML=function(){return baseFuel()+fuelForecastHTML()}}
  if(typeof enhancedReportsHTML==='function'){const baseReports=enhancedReportsHTML;enhancedReportsHTML=function(){return baseReports()+fuelForecastHTML()}}
  // Adiciona a aba sem alterar as funções atuais do aplicativo.
  function addCalendarNav(){
    const fin=document.querySelector('[data-nav-group="planning"]');
    if(fin&&!fin.querySelector('[data-page="calendar"]')){const b=document.createElement('button');b.className='nav-item';b.dataset.page='calendar';b.innerHTML='▦ <span>Calendário financeiro</span>';fin.appendChild(b)}
    const grid=document.querySelector('.mobile-more-grid');if(grid&&!grid.querySelector('[data-page="calendar"]')){const b=document.createElement('button');b.className='nav-item';b.dataset.page='calendar';b.innerHTML='▦ <span>Calendário financeiro</span>';grid.prepend(b)}
  }
  const oldRender=renderPage;renderPage=function(){addCalendarNav();if(user&&currentPage==='calendar'){$('pageContent').innerHTML=calendarHTML();bindPageActions();bindCalendar();return}oldRender()};
  const oldGo=goPage;goPage=function(page){const r=oldGo(page);if(page==='calendar')$('pageTitle').textContent='Calendário financeiro';return r};
  const oldBind=bindPageActions;bindPageActions=function(){oldBind();if(currentPage==='calendar')bindCalendar()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addCalendarNav);else addCalendarNav();
})();
