/* Lançamentos ↔ Veículos
   Permite lançar um abastecimento, manutenção ou despesa de veículo direto pela aba Lançamentos.
   O lançamento financeiro usa a conta/cartão escolhidos no bloco "Pagamento" e, ao salvar,
   também cria o registro correspondente na aba Veículos (os dois ficam ligados por uma marca nas observações). */
(function () {
  'use strict';
  const VH = window.VH, form = document.getElementById('transactionForm');
  if (!VH || !form || typeof sb === 'undefined' || !sb) return;
  const $ = id => document.getElementById(id);

  const FUELS = ['Gasolina', 'Etanol', 'Diesel', 'GNV', 'Gasolina aditivada'];
  const state = { rec: null, userOff: false };

  /* ---------- bloco no formulário ---------- */
  const fs = document.createElement('fieldset');
  fs.id = 'vlBox'; fs.className = 'vk-pay vk-link hidden';
  fs.innerHTML = `<legend>🚗 Veículo</legend>
    <label class="checkline"><input type="checkbox" id="vlOn"> Este gasto é de um veículo <small class="muted">— registra também na aba Veículos</small></label>
    <div id="vlBody" class="hidden">
      <div class="form-grid">
        <label>Veículo<select id="vlVeh"></select></label>
        <label>O que foi?<select id="vlType"><option value="fuel">Abastecimento</option><option value="manutencao">Manutenção</option><option value="despesa">Outra despesa do veículo</option></select></label>
        <label>Km atual<input id="vlKm" type="number" step="0.1" min="0" inputmode="decimal" placeholder="Odômetro"></label>
        <label data-vl="fuel">Litros<input id="vlL" type="number" step="0.001" min="0" inputmode="decimal"></label>
        <label data-vl="fuel">Combustível<select id="vlFuel">${FUELS.map(x => `<option>${x}</option>`).join('')}</select></label>
        <label data-vl="fuel">Posto (opcional)<input id="vlSt"></label>
        <label data-vl="fuel" class="checkline"><input type="checkbox" id="vlFull" checked> Tanque cheio</label>
        <label data-vl="exp">Categoria<select id="vlCat"></select></label>
        <label data-vl="manutencao">Próxima troca (km)<input id="vlNK" type="number" min="0"></label>
        <label data-vl="manutencao">Próxima troca (data)<input id="vlND" type="date"></label>
      </div>
      <small id="vlHint" class="muted"></small>
    </div>
    <p id="vlInfo" class="muted hidden"></p>`;
  form.insertBefore(fs, form.querySelector('.modal-actions'));

  const isExpense = () => typeof txKind !== 'undefined' && txKind === 'expense';
  const editing = () => !!$('transactionId').value;
  const active = () => $('transactionDialog').open && $('vlOn').checked && isExpense() && !editing();

  function fillCats() {
    const t = $('vlType').value, list = t === 'manutencao' ? VH.CATS.manutencao : VH.CATS.despesa;
    $('vlCat').innerHTML = list.map(x => `<option>${x}</option>`).join('');
  }
  function fillKm() {
    const v = VH.act().find(x => x.id === $('vlVeh').value);
    if (v) $('vlKm').value = VH.curKm(v) || '';
  }
  function showType() {
    const t = $('vlType').value;
    fs.querySelectorAll('[data-vl]').forEach(el => {
      const k = el.dataset.vl;
      el.classList.toggle('hidden', !(k === t || (k === 'exp' && t !== 'fuel')));
    });
    fillCats();
    updateHint();
  }
  function updateHint() {
    const t = $('vlType').value, a = Number($('txAmount').value), l = Number($('vlL').value);
    $('vlHint').textContent = t === 'fuel' && a > 0 && l > 0
      ? `Preço por litro: ${money(a / l)} (valor do lançamento ÷ litros)`
      : 'O valor, a data e a forma de pagamento vêm do formulário acima.';
  }
  function toggle() {
    const on = $('vlOn').checked;
    $('vlBody').classList.toggle('hidden', !on);
    $('transactionDialog').classList.toggle('vk-on', on);
    if (on) {
      if ($('dvToggle') && $('dvToggle').checked) { $('dvToggle').checked = false; $('dvToggle').dispatchEvent(new Event('change', { bubbles: true })); }
      if (!$('vlVeh').options.length) $('vlVeh').innerHTML = VH.act().map(v => `<option value="${v.id}">${esc(v.name)}</option>`).join('');
      showType(); fillKm();
    }
  }
  function sync() {
    const has = VH.act().length > 0, show = has && isExpense() && !editing();
    fs.classList.toggle('hidden', !(show || (editing() && linked(window.__vlEditing))));
    $('vlOn').closest('label').classList.toggle('hidden', !show);
    $('vlBody').classList.toggle('hidden', !(show && $('vlOn').checked));
    if (!show) $('vlOn').checked = false;
    $('transactionDialog').classList.toggle('vk-on', show && $('vlOn').checked);
  }
  const linked = t => t && /(fuel_record_id|vehicle_expense_id):/.test(String(t.notes || ''));

  $('vlOn').addEventListener('change', () => { state.userOff = !$('vlOn').checked; toggle(); });
  $('vlVeh').addEventListener('change', fillKm);
  $('vlType').addEventListener('change', showType);
  $('vlL').addEventListener('input', updateHint);
  $('txAmount').addEventListener('input', updateHint);
  form.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => setTimeout(sync, 0)));
  $('txCategory').addEventListener('change', () => {
    if (editing() || !isExpense() || state.userOff || !VH.act().length) return;
    if (['Veículos', 'Combustível'].includes($('txCategory').value) && !$('vlOn').checked) { $('vlOn').checked = true; sync(); toggle(); }
  });

  /* ---------- abertura do formulário ---------- */
  const prevOpen = window.openTransaction;
  window.openTransaction = function (t = null) {
    prevOpen(t);
    state.rec = null; state.userOff = false; window.__vlEditing = t;
    $('vlOn').checked = false;
    $('vlVeh').innerHTML = VH.act().map(v => `<option value="${v.id}">${esc(v.name)}</option>`).join('');
    $('vlType').value = 'fuel'; $('vlL').value = ''; $('vlSt').value = ''; $('vlNK').value = ''; $('vlND').value = ''; $('vlFull').checked = true;
    const info = $('vlInfo');
    if (t && linked(t)) {
      info.textContent = '🚗 Este lançamento está ligado a um registro da aba Veículos. Para mudar litros, km ou categoria, edite o registro por lá.';
      info.classList.remove('hidden');
    } else info.classList.add('hidden');
    sync();
  };

  /* ---------- validação antes de salvar ---------- */
  form.addEventListener('submit', e => {
    if (!active()) return;
    const stop = msg => { e.preventDefault(); e.stopImmediatePropagation(); toast(msg); };
    if (!$('vlVeh').value) return stop('Escolha o veículo.');
    if ($('vlType').value === 'fuel') {
      if (!(Number($('vlL').value) > 0)) return stop('Informe os litros do abastecimento.');
      if (!(Number($('vlKm').value) > 0)) return stop('Informe o km atual do veículo.');
    }
  }, true);

  /* ---------- grava o registro do veículo junto com o lançamento ---------- */
  async function createRecord(tx) {
    const v = VH.act().find(x => x.id === $('vlVeh').value), type = $('vlType').value;
    const amount = Number(tx.amount), date = tx.transaction_date, km = Number($('vlKm').value) || null;
    const base = { user_id: user.id, vehicle_id: v.id, ...(VH.drvReady() && v.driver_name ? { driver: v.driver_name } : {}) };
    if (type === 'fuel') {
      const liters = Number($('vlL').value);
      const row = { ...base, fuel_date: date, odometer: km, fuel_name: $('vlFuel').value, liters, price_per_liter: Number((amount / liters).toFixed(3)), total_amount: amount, station: $('vlSt').value.trim() || null, payment_method: tx.payment_method || 'Outro', full_tank: $('vlFull').checked };
      const r = await sb.from('fuel_records').insert(row).select('id').single();
      return r.error ? { error: r.error } : { table: 'fuel_records', id: r.data.id, marker: `fuel_record_id:${r.data.id}; origem:lancamentos` };
    }
    const row = { ...base, kind: type, expense_date: date, odometer: km, category: $('vlCat').value, description: tx.description || null, provider: null, amount, next_due_km: type === 'manutencao' ? (Number($('vlNK').value) || null) : null, next_due_date: type === 'manutencao' ? ($('vlND').value || null) : null };
    const r = await sb.from('vehicle_expenses').insert(row).select('id').single();
    return r.error ? { error: r.error } : { table: 'vehicle_expenses', id: r.data.id, marker: `vehicle_expense_id:${r.data.id}; origem:lancamentos` };
  }
  const rollback = async () => { if (state.rec) { await sb.from(state.rec.table).delete().eq('id', state.rec.id); state.rec = null; } };

  const baseFrom = sb.from.bind(sb);
  sb.from = table => {
    const q = baseFrom(table);
    if (table !== 'transactions') return q;
    const insert = q.insert.bind(q);
    q.insert = async payload => {
      if (!active()) return insert(payload);
      const rows = Array.isArray(payload) ? payload : [payload];
      if (rows.length !== 1) return { error: { message: 'Um lançamento de veículo não pode ser dividido entre contas. Desligue a divisão ou o vínculo com o veículo.' } };
      if (!state.rec) { const r = await createRecord(rows[0]); if (r.error) return { error: r.error }; state.rec = r; }
      const row = { ...rows[0], notes: [rows[0].notes, state.rec.marker].filter(Boolean).join(' · ') };
      const res = await insert(row);
      if (res.error) await rollback(); else state.rec = null;
      return res;
    };
    return q;
  };

  sync();
})();
