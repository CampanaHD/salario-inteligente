/* Pagamento e divisão entre contas — Salário Inteligente
   Substitui as versões anteriores da divisão (melhorias.js) por uma única, consistente:
   - seção "Pagamento" no formulário de lançamento: forma de pagamento, cartão, conta ou divisão
   - 2 a 4 partes, cada uma com conta, valor, botão "Completar", saldo da conta e aviso de saldo
   - barra de progresso colorida pelas contas e conferência do total antes de salvar
   - grava a subcategoria e identifica as partes ("Parte 1/2") para aparecer na lista */
(function(){
  const wrap = $('txAcctWrap'), form = $('transactionForm');
  if (!wrap || !form) return;

  const MAX_PARTS = 4;
  const accounts = () => (window.CT?.accts?.() || []).filter(a => a.is_active !== false && a.kind !== 'beneficio');
  const balOf = a => { try { return Number(window.CT?.bal?.(a)); } catch (e) { return NaN; } };
  const cents = v => Math.round(Number(v || 0) * 100);
  const fmt = c => money(c / 100);
  const total = () => cents($('txAmount')?.value);
  const methodNow = () => $('txMethod')?.value || '';
  const colorOf = id => accounts().find(a => a.id === id)?.color || '#9b9ba8';

  const S = {on:false, parts:[]};

  /* ---------- monta a seção "Pagamento" uma única vez ---------- */
  const methodLabel = $('txMethod').closest('label'), cardLabel = $('txCardLbl'), accLabel = $('txAccount').closest('label'), hint = $('txAcctHint');
  const oldSplitLabel = $('txSplit')?.closest('label'), oldRows = $('txSplitRows');

  const legacy = document.createElement('div');            // guarda os elementos antigos (ficam ocultos)
  legacy.className = 'hidden';
  if (oldSplitLabel) legacy.append(oldSplitLabel);
  if (oldRows) legacy.append(oldRows);

  const dummy = document.createElement('label');            // protege o 1º <label> do wrapper de ocultações antigas
  dummy.id = 'dvDummy'; dummy.setAttribute('aria-hidden','true');

  const box = document.createElement('fieldset');
  box.className = 'dv-pay'; box.id = 'dvPay';
  box.innerHTML =
    `<legend>Pagamento</legend>
     <div class="dv-top" id="dvTop"></div>
     <div class="dv-single" id="dvSingle"></div>
     <label class="dv-switch" id="dvSwitchWrap">
       <span class="switch"><input type="checkbox" id="dvToggle"><i></i></span>
       <span class="dv-switch-text"><b>Dividir entre contas</b><small>Pague uma parte em cada conta.</small></span>
     </label>
     <div class="dv-parts hidden" id="dvParts" aria-live="polite"></div>`;
  box.querySelector('#dvTop').append(methodLabel, cardLabel);
  box.querySelector('#dvSingle').append(accLabel, hint);
  wrap.textContent = '';
  wrap.append(dummy, legacy, box);

  const parts = $('dvParts'), toggle = $('dvToggle'), switchWrap = $('dvSwitchWrap');

  /* ---------- regras de exibição ---------- */
  const editing = () => !!$('transactionId')?.value;
  const canSplit = () => accounts().length >= 2 && !editing() && $('txPaid')?.checked && !['Crédito','Benefício'].includes(methodNow());
  function sync(){
    const ok = canSplit();
    switchWrap.classList.toggle('hidden', !ok);
    if (!ok && S.on) { S.on = false; toggle.checked = false; }
    parts.classList.toggle('hidden', !S.on);
    $('dvSingle').classList.toggle('hidden', S.on || methodNow() === 'Crédito');
    if (S.on) renderParts();
  }

  /* ---------- divisão ---------- */
  function equalSplit(n, t){
    const base = Math.floor(t / n), out = Array(n).fill(base);
    out[n - 1] += t - base * n;
    return out;
  }
  function start(){
    const list = accounts(), first = $('txAccount')?.value && list.some(a => a.id === $('txAccount').value) ? $('txAccount').value : list[0]?.id;
    const second = list.find(a => a.id !== first)?.id;
    const t = total(), [c1, c2] = equalSplit(2, t);
    S.parts = [{acc:first, c:c1, touched:false}, {acc:second, c:c2, touched:false}];
  }
  function redistributeIfPristine(){
    if (!S.on || S.parts.some(p => p.touched)) return;
    equalSplit(S.parts.length, total()).forEach((c, i) => S.parts[i].c = c);
    renderParts();
  }
  const sumParts = () => S.parts.reduce((s, p) => s + p.c, 0);
  const maxParts = () => Math.min(MAX_PARTS, accounts().length);

  function rowHTML(p, i){
    const list = accounts(), used = S.parts.filter((_, j) => j !== i).map(x => x.acc), a = list.find(x => x.id === p.acc), bal = a ? balOf(a) : NaN;
    const over = Number.isFinite(bal) && p.c > 0 && p.c / 100 > bal + .005;
    return `<div class="dv-part" data-i="${i}" style="--c:${colorOf(p.acc)}">
      <div class="dv-part-head">
        <span class="dv-dot" aria-hidden="true"></span>
        <select class="dv-acc" aria-label="Conta da parte ${i+1}">${list.map(x => `<option value="${x.id}" ${x.id===p.acc?'selected':''} ${used.includes(x.id)?'disabled':''}>${esc(x.name)}${used.includes(x.id)?' (já usada)':''}</option>`).join('')}</select>
        ${S.parts.length > 2 ? `<button type="button" class="dv-x" aria-label="Remover a parte ${i+1}">×</button>` : ''}
      </div>
      <div class="dv-part-body">
        <label class="dv-money"><span>R$</span><input class="dv-val" type="number" inputmode="decimal" min="0" step="0.01" value="${p.c ? (p.c/100).toFixed(2) : ''}" placeholder="0,00" aria-label="Valor da parte ${i+1}"></label>
        <button type="button" class="dv-fill">Completar</button>
      </div>
      <small class="dv-bal${over?' warn':''}">${Number.isFinite(bal) ? (over ? 'Acima do saldo atual · ' : 'Saldo atual · ') + money(bal) : ''}</small>
    </div>`;
  }
  function renderParts(){
    parts.innerHTML =
      S.parts.map(rowHTML).join('') +
      `<div class="dv-actions">
         <button type="button" class="btn outline" id="dvAdd" ${S.parts.length >= maxParts() ? 'disabled' : ''}>＋ Adicionar conta</button>
         <button type="button" class="btn outline" id="dvEqual">Dividir igualmente</button>
       </div>
       <div class="dv-meter"><div class="dv-bar" id="dvBar"></div><div class="dv-status" id="dvStatus"></div></div>`;
    updateMeter();
  }
  function updateMeter(){
    const t = total(), s = sumParts(), diff = t - s, bar = $('dvBar'), st = $('dvStatus');
    if (!bar || !st) return;
    const scale = Math.max(t, s, 1);
    bar.innerHTML = S.parts.map(p => `<i style="width:${Math.min(100, p.c / scale * 100)}%;background:${colorOf(p.acc)}"></i>`).join('');
    let cls = 'ok', txt;
    if (t <= 0) { cls = 'idle'; txt = 'Informe o valor do lançamento para dividir.'; }
    else if (diff === 0) txt = `Tudo distribuído · ${fmt(t)}`;
    else if (diff > 0) { cls = 'warn'; txt = `Falta distribuir ${fmt(diff)} de ${fmt(t)}`; }
    else { cls = 'over'; txt = `Passou ${fmt(-diff)} do valor de ${fmt(t)}`; }
    st.className = 'dv-status ' + cls; st.textContent = txt;
  }

  toggle.addEventListener('change', () => {
    S.on = toggle.checked;
    if (S.on) start();
    sync();
  });
  parts.addEventListener('input', e => {
    const row = e.target.closest('.dv-part'); if (!row || !e.target.classList.contains('dv-val')) return;
    const p = S.parts[Number(row.dataset.i)]; p.c = cents(e.target.value); p.touched = true;
    const small = row.querySelector('.dv-bal'), a = accounts().find(x => x.id === p.acc), bal = a ? balOf(a) : NaN, over = Number.isFinite(bal) && p.c > 0 && p.c / 100 > bal + .005;
    if (small && Number.isFinite(bal)) { small.classList.toggle('warn', over); small.textContent = (over ? 'Acima do saldo atual · ' : 'Saldo atual · ') + money(bal); }
    updateMeter();
  });
  parts.addEventListener('change', e => {
    const row = e.target.closest('.dv-part'); if (!row || !e.target.classList.contains('dv-acc')) return;
    S.parts[Number(row.dataset.i)].acc = e.target.value;
    renderParts();
  });
  parts.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const row = b.closest('.dv-part'), i = row ? Number(row.dataset.i) : -1;
    if (b.classList.contains('dv-x')) { S.parts.splice(i, 1); redistributeIfPristine(); renderParts(); }
    else if (b.classList.contains('dv-fill')) {
      const others = S.parts.reduce((s, p, j) => j === i ? s : s + p.c, 0);
      S.parts[i].c = Math.max(0, total() - others); S.parts[i].touched = true; renderParts();
    }
    else if (b.id === 'dvAdd') {
      if (S.parts.length >= maxParts()) return toast('A divisão permite até '+maxParts()+' contas.');
      const free = accounts().find(a => !S.parts.some(p => p.acc === a.id));
      S.parts.push({acc:free?.id, c:Math.max(0, total() - sumParts()), touched:true}); renderParts();
    }
    else if (b.id === 'dvEqual') {
      equalSplit(S.parts.length, total()).forEach((c, k) => { S.parts[k].c = c; S.parts[k].touched = false; }); renderParts();
    }
  });
  $('txAmount').addEventListener('input', () => { if (S.on) { redistributeIfPristine(); updateMeter(); } });
  $('txMethod').addEventListener('change', sync);
  $('txPaid').addEventListener('change', sync);

  /* ---------- abertura do formulário ---------- */
  const previous = window.openTransaction;
  window.openTransaction = function(t = null){
    previous(t);
    accLabel.classList.remove('hidden');                   // versões antigas podiam deixar este campo oculto
    if ($('txSplit')) $('txSplit').checked = false;       // garante que a divisão antiga nunca fique ligada
    S.on = false; S.parts = []; toggle.checked = false;
    sync();
  };

  /* ---------- salvar ---------- */
  form.onsubmit = async e => {
    e.preventDefault();
    const id = $('transactionId').value, amount = Number($('txAmount').value), method = methodNow() || 'Débito', isPaid = $('txPaid').checked;
    const splitting = S.on && !id && isPaid && method !== 'Crédito';
    let list = [];
    if (splitting) {
      list = S.parts.map(p => ({account_id:p.acc, amount:p.c / 100}));
      if (list.some(p => !p.account_id || !(p.amount > 0))) return toast('Escolha a conta e informe um valor maior que zero em cada parte.');
      if (new Set(list.map(p => p.account_id)).size !== list.length) return toast('Cada conta só pode aparecer uma vez na divisão.');
      const diff = cents(amount) - sumParts();
      if (diff !== 0) return toast(diff > 0 ? `Ainda faltam ${fmt(diff)} para completar o valor.` : `A divisão passou ${fmt(-diff)} do valor do lançamento.`);
    }

    const sub = $('txSubcategory')?.value || null;
    const base = {user_id:user.id, description:$('txDescription').value.trim(), category:$('txCategory').value, transaction_date:$('txDate').value, due_date:$('txDueDate')?.value || null, kind:txKind, is_paid:isPaid, notes:$('txNotes').value.trim()};
    const card = method === 'Crédito' ? ($('txCard')?.value || null) : null;

    const run = withSub => {
      const b = withSub ? {...base, subcategory:sub} : base;
      if (id) return sb.from('transactions').update({...b, amount, account_id:$('txAccount')?.value || null, payment_method:method, card_id:card}).eq('id', id);
      if (list.length > 1) {
        const group = '[divisao:' + Date.now() + ']';
        return sb.from('transactions').insert(list.map((p, i) => ({...b, amount:p.amount, account_id:p.account_id, payment_method:method, card_id:null, notes:[base.notes, group, `Parte ${i+1}/${list.length}`].filter(Boolean).join(' · ')})));
      }
      return sb.from('transactions').insert({...b, amount, account_id:method === 'Crédito' ? null : ($('txAccount')?.value || null), payment_method:method, card_id:card});
    };
    // Se o banco ainda não tem a coluna "subcategory", salva sem ela e avisa.
    let r = await run(true), noSub = false;
    if (r.error && /subcategory/i.test(r.error.message || '')) { r = await run(false); noSub = !r.error; }
    if (r.error) return toast(r.error.message);

    const share = !!$('txShareFamily')?.checked;
    if (!id && share && familyOwnerId) {
      const sr = await sb.from('family_transactions').insert({family_owner_id:familyOwnerId, created_by:user.id, description:base.description, category:base.category, amount, transaction_date:base.transaction_date, kind:base.kind, notes:base.notes || 'Lançamento compartilhado'});
      if (sr.error) toast('Lançamento salvo, mas não compartilhado: ' + sr.error.message);
    }
    $('transactionDialog').close();
    await loadData(); if (share) await loadFamily(); renderPage();
    toast(noSub ? 'Lançamento salvo sem subcategoria. Execute supabase-categorias-personalizadas.sql para habilitá-la.'
        : list.length > 1 ? `Lançamento dividido em ${list.length} contas.` : 'Lançamento salvo.');
  };

  // Etiqueta "Dividido 1/2" para as listas de lançamentos.
  window.dvTag = t => {
    const m = String(t?.notes || '').match(/Parte (\d+)\/(\d+)/);
    return m ? `<span class="lt-tag dv-tag">Dividido ${m[1]}/${m[2]}</span>` : '';
  };
})();
