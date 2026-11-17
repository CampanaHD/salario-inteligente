/* Veículos · Calculadora
   - registro de km diário (odômetro manhã/noite ou só km rodados)
   - relatório de quanto você roda (e gasta) em cada dia da semana
   - previsão do próximo abastecimento (padrão da semana ou média diária)
   Depende de window.VH, exposto por veiculos.js. */
(function () {
  'use strict';
  const VH = window.VH;
  if (!VH) return;

  const WD = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const WS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const PERIODS = [[30, 'Últimos 30 dias'], [60, 'Últimos 60 dias'], [90, 'Últimos 90 dias'], [0, 'Todo o histórico']];

  const N = (n, d = 1) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
  const KM = n => N(n, 0) + ' km';
  const R = n => money(Number(n) || 0);
  const iso = d => d.toLocaleDateString('en-CA');
  const parse = s => new Date(s + 'T12:00:00');
  const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
  const dm = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const sumBy = (a, f) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  const rd = (n, d) => Math.round(n * 10 ** d) / 10 ** d;
  const g = id => document.getElementById(id);

  /* ---------- preferências (guardadas só neste aparelho) ---------- */
  const SK = 'si_vk_state', PK = 'si_vk_params';
  const read = (k, def) => { try { return { ...def, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch (e) { return { ...def }; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignora */ } };
  const S = read(SK, { veh: '', period: 30, mode: 'week', zero: false, kmode: 'odo' });
  const P = read(PK, {});
  const persist = () => write(SK, S);

  /* =====================================================================
     Cálculos puros (sem acesso à tela) — também expostos em VHC.core
     ===================================================================== */

  /** Estatística por dia da semana a partir dos registros de km diário. */
  function weekStats(logs, zero, todayISO) {
    const rows = WD.map((name, i) => ({ dow: i, name, short: WS[i], sum: 0, days: 0, avg: 0 }));
    const byDay = {};
    logs.forEach(x => { byDay[x.log_date] = (byDay[x.log_date] || 0) + Number(x.km_driven || 0); });
    const dates = Object.keys(byDay).sort();
    if (!dates.length) return { rows, total: 0, days: 0, avgDay: 0, avgWeek: 0, perDow: Array(7).fill(0), first: null };

    dates.forEach(d => { const r = rows[parse(d).getDay()]; r.sum += byDay[d]; r.days += 1; });
    const first = dates[0];
    if (zero) {
      // dias sem registro contam como 0 km: conta todos os dias do intervalo
      let last = byDay[todayISO] !== undefined ? todayISO : iso(addDays(parse(todayISO), -1));
      if (last < dates[dates.length - 1]) last = dates[dates.length - 1];
      rows.forEach(r => { r.days = 0; });
      for (let d = parse(first); iso(d) <= last; d = addDays(d, 1)) rows[d.getDay()].days += 1;
    }
    rows.forEach(r => { r.avg = r.days ? r.sum / r.days : 0; });
    const total = sumBy(rows, r => r.sum), days = sumBy(rows, r => r.days);
    const avgDay = days ? total / days : 0;
    const perDow = rows.map(r => (r.days ? r.avg : avgDay));
    return { rows, total, days, avgDay, avgWeek: sumBy(perDow, x => x), perDow, first };
  }

  /** Quanto combustível deve haver no tanque agora e quantos km dá para rodar até a reserva. */
  function tankState({ fr, odo, kml, tank, reserve }) {
    if (!fr.length) return null;
    const res = Math.max(0, Math.min(60, Number(reserve) || 0)) / 100;
    const last = fr[fr.length - 1];
    let lastFull = null, idx = -1;
    for (let i = fr.length - 1; i >= 0; i--) if (fr[i].full_tank) { lastFull = fr[i]; idx = i; break; }

    if (lastFull && kml > 0 && tank > 0) {
      const added = sumBy(fr.slice(idx + 1), r => r.liters);        // abastecimentos parciais depois do último tanque cheio
      const driven = Math.max(0, odo - Number(lastFull.odometer));
      const liters = Math.max(0, Math.min(tank, tank - driven / kml + added));
      const reserveL = tank * res;
      return { method: 'tank', liters, pct: liters / tank * 100, reserveL, usableKm: Math.max(0, (liters - reserveL) * kml), driven, basis: lastFull };
    }
    // sem tanque cheio ou sem capacidade: usa a distância média entre abastecimentos
    const gaps = [];
    for (let i = 1; i < fr.length; i++) { const d = Number(fr[i].odometer) - Number(fr[i - 1].odometer); if (d > 0) gaps.push(d); }
    const recent = gaps.slice(-6);
    if (!recent.length) return null;
    const avgGap = sumBy(recent, x => x) / recent.length;
    const driven = Math.max(0, odo - Number(last.odometer));
    return { method: 'interval', avgGap, driven, pct: Math.max(0, (1 - driven / avgGap) * 100), usableKm: Math.max(0, avgGap * (1 - res) - driven), basis: last };
  }

  /** Anda dia a dia gastando km até chegar na reserva. Retorna null se nunca chega (sem rodagem). */
  function simulate(usableKm, perDow, avgDay, mode, start, maxDays = 400) {
    if (usableKm <= 0) return { due: true, days: 0, date: start, timeline: [] };
    const use = d => (mode === 'week' ? perDow[d.getDay()] : avgDay);
    const timeline = [];
    let km = usableKm;
    for (let i = 1; i <= maxDays; i++) {
      const d = addDays(start, i), u = use(d);
      km -= u;
      if (timeline.length < 10) timeline.push({ date: d, used: u, left: Math.max(0, km), frac: Math.max(0, km) / usableKm });
      if (km <= 0) return { due: false, days: i, date: d, timeline };
    }
    return null;
  }

  /* =====================================================================
     Dados do sistema
     ===================================================================== */
  const vehicle = () => VH.act().find(v => v.id === S.veh) || VH.act()[0];
  const fuelOf = v => fuelRecords.filter(r => r.vehicle_id === v.id).sort((a, b) => (a.odometer - b.odometer) || a.fuel_date.localeCompare(b.fuel_date));
  const logsOf = (v, days) => {
    const since = days ? iso(addDays(new Date(), -(days - 1))) : '0000-00-00';
    return VH.dailyKm().filter(x => x.vehicle_id === v.id && x.log_date >= since);
  };

  /** Maior km conhecido ANTES da data (dias anteriores, abastecimentos e manutenções). */
  function odoBefore(v, date) {
    const c = [Number(v.initial_odometer || 0)];
    VH.dailyKm().filter(x => x.vehicle_id === v.id && x.log_date < date).forEach(x => c.push(Number(x.evening_odometer)));
    fuelRecords.filter(r => r.vehicle_id === v.id && r.fuel_date < date).forEach(r => c.push(Number(r.odometer)));
    VH.exp().filter(e => e.vehicle_id === v.id && e.odometer && e.expense_date < date).forEach(e => c.push(Number(e.odometer)));
    return Math.max(...c);
  }

  /** Valores calculados do histórico (consumo, preço, tanque). */
  function defaults(v) {
    const fr = fuelOf(v);
    const iv = (typeof fzIntervals === 'function' ? fzIntervals() : []).filter(i => i.vid === v.id);
    const L = sumBy(iv, i => i.l), K = sumBy(iv, i => i.km);
    let kml, src;
    if (L > 0 && K > 0) { kml = K / L; src = `histórico de abastecimentos (${iv.length} medições)`; }
    else {
      const km = fr.length >= 2 ? Number(fr[fr.length - 1].odometer) - Number(fr[0].odometer) : 0;
      const l = sumBy(fr.slice(1), r => r.liters);
      if (km > 0 && l > 0) { kml = km / l; src = 'estimado pelos abastecimentos'; }
      else { kml = v.vehicle_type === 'moto' ? 30 : 10; src = 'valor padrão — ajuste para o seu veículo'; }
    }
    const recent = fr.slice().sort((a, b) => b.fuel_date.localeCompare(a.fuel_date)).slice(0, 3);
    const price = recent.length ? sumBy(recent, r => r.price_per_liter) / recent.length : 0;
    return { kml: rd(kml, 2), price: rd(price, 3), tank: Number(v.tank_capacity) || 0, reserve: 15, src };
  }
  const params = v => {
    const o = P[v.id] || {}, d = defaults(v), out = { ...d };
    ['kml', 'price', 'tank', 'reserve'].forEach(k => { if (Number.isFinite(o[k])) out[k] = o[k]; });
    return out;
  };
  const cost = (km, p) => (p.kml > 0 && p.price > 0 ? km / p.kml * p.price : null);
  const costTxt = c => (c === null ? '—' : R(c));

  /** Ritmo de rodagem: km diários registrados ou, sem eles, o ritmo entre abastecimentos. */
  function pattern(v) {
    const logs = logsOf(v, S.period);
    if (logs.length) {
      const w = weekStats(logs, S.zero, today());
      return { w, src: 'nos km diários registrados', perDow: w.perDow, avgDay: w.avgDay };
    }
    const fr = fuelOf(v);
    if (fr.length >= 2) {
      const km = Number(fr[fr.length - 1].odometer) - Number(fr[0].odometer);
      const days = Math.max(1, (parse(fr[fr.length - 1].fuel_date) - parse(fr[0].fuel_date)) / 864e5);
      if (km > 0) { const a = km / days; return { w: null, src: 'no ritmo entre os abastecimentos (registre km diários para melhorar)', perDow: Array(7).fill(a), avgDay: a }; }
    }
    return null;
  }

  /* =====================================================================
     Telas
     ===================================================================== */
  const empty = t => `<div class="vh-empty">${t}</div>`;

  function reportHTML(v, p) {
    const logs = logsOf(v, S.period);
    if (!logs.length) return `<div class="vh-card"><h3 class="vk-h">Quanto você roda em cada dia da semana</h3>${empty('Registre os km de alguns dias acima para ver o relatório por dia da semana.')}</div>`;
    const w = weekStats(logs, S.zero, today());
    const max = Math.max(...w.rows.map(r => r.avg), 1);
    const withData = w.rows.filter(r => r.days > 0);
    const top = withData.slice().sort((a, b) => b.avg - a.avg)[0];
    const low = withData.slice().sort((a, b) => a.avg - b.avg)[0];
    const weekCost = cost(w.avgWeek, p);
    const bars = w.rows.map(r => {
      const isTop = top && r.dow === top.dow && withData.length > 1, isLow = low && r.dow === low.dow && withData.length > 1;
      return `<div class="vk-col ${isTop ? 'top' : ''} ${isLow ? 'low' : ''}">
        <b>${r.days ? KM(r.avg) : '—'}</b>
        <div class="vk-bar"><i style="height:${r.days ? Math.max(4, r.avg / max * 100) : 0}%"></i></div>
        <span class="vk-dn">${r.short}</span>
        <small>${r.days ? costTxt(cost(r.avg, p)) : 'sem dados'}</small>
        <small class="muted">${r.days} dia${r.days === 1 ? '' : 's'}</small>
      </div>`;
    }).join('');
    const insight = withData.length > 1
      ? `Você roda mais na <b>${top.name.toLowerCase()}</b> (média de ${KM(top.avg)}${cost(top.avg, p) !== null ? ', cerca de ' + R(cost(top.avg, p)) + ' de combustível' : ''}) e menos no(a) <b>${low.name.toLowerCase()}</b> (${KM(low.avg)}).`
      : 'Registre mais dias, de dias da semana diferentes, para comparar.';
    const rows = w.rows.map(r => `<tr><td>${r.name}</td><td>${r.days}</td><td>${r.days ? KM(r.avg) : '—'}</td><td>${KM(r.sum)}</td><td>${r.days ? costTxt(cost(r.avg, p)) : '—'}</td></tr>`).join('');
    const tile = (a, b, s) => `<div class="vh-tile"><small>${a}</small><b>${b}</b><span>${s}</span></div>`;
    return `<div class="vh-card">
      <h3 class="vk-h">Quanto você roda em cada dia da semana</h3>
      <p class="muted vk-sub">${w.days} dia${w.days === 1 ? '' : 's'} considerado${w.days === 1 ? '' : 's'} · ${S.zero ? 'dias sem registro contam como 0 km' : 'só dias com registro'} · gasto estimado com ${N(p.kml, 1)} km/L e ${p.price ? R(p.price) + '/L' : 'preço do litro não informado'}</p>
      <div class="vk-week">${bars}</div>
      <p class="vk-insight">${insight}</p>
      <div class="vh-calc">
        ${tile('Média por dia', KM(w.avgDay), costTxt(cost(w.avgDay, p)) + ' de combustível')}
        ${tile('Média por semana', KM(w.avgWeek), costTxt(weekCost) + ' de combustível')}
        ${tile('Projeção do mês', KM(w.avgWeek * 52 / 12), costTxt(weekCost === null ? null : weekCost * 52 / 12))}
        ${tile('Total no período', KM(w.total), costTxt(cost(w.total, p)))}
      </div>
      <details class="vk-det"><summary>Ver tabela por dia da semana</summary>
        <div class="table-wrap"><table><thead><tr><th>Dia</th><th>Dias</th><th>Média</th><th>Total</th><th>Gasto médio</th></tr></thead><tbody>${rows}</tbody></table></div>
      </details>
    </div>`;
  }

  function forecastHTML(v, p) {
    const head = `<div class="vh-card-h"><div class="vh-ico">⛽</div><div><h3>Próximo abastecimento</h3><small>Quando o tanque deve chegar na reserva</small></div></div>`;
    const toggle = `<div class="vk-seg" role="group" aria-label="Base da previsão">${[['week', 'Padrão da semana'], ['avg', 'Média diária']].map(([k, l]) => `<button type="button" data-vk-mode="${k}" class="${S.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const wrap = body => `<div class="vh-card vk-fc">${head}${toggle}${body}</div>`;

    const pat = pattern(v);
    if (!pat) return wrap(empty('Registre os km diários (ou pelo menos dois abastecimentos) para calcular a previsão.'));
    const fr = fuelOf(v);
    if (!fr.length) return wrap(empty('Registre um abastecimento para saber quando será o próximo.'));
    const ts = tankState({ fr, odo: VH.curKm(v), kml: p.kml, tank: p.tank, reserve: p.reserve });
    if (!ts) return wrap(empty('Faltam dados: registre ao menos dois abastecimentos ou informe a capacidade do tanque em “Ajustar consumo, preço e tanque”.'));

    const sim = simulate(ts.usableKm, pat.perDow, pat.avgDay, S.mode, new Date());
    let big, when;
    if (!sim) { big = 'Sem previsão'; when = 'Nenhum km rodado nos registros — informe a quilometragem dos dias.'; }
    else if (sim.due) { big = 'Abasteça agora'; when = ts.method === 'tank' ? 'O tanque deve estar na reserva ou perto dela.' : 'Você já rodou a distância média entre abastecimentos.'; }
    else { big = `${WD[sim.date.getDay()]}, ${dm(sim.date)}`; when = `em ${sim.days} dia${sim.days === 1 ? '' : 's'}`; }

    const litersAtRefill = ts.method === 'tank'
      ? (sim && sim.due ? p.tank - ts.liters : p.tank - ts.reserveL)
      : sumBy(fr.slice(-5), r => r.liters) / Math.max(1, fr.slice(-5).length);
    const refillCost = p.price > 0 && litersAtRefill > 0 ? litersAtRefill * p.price : null;
    const weekKm = S.mode === 'week' ? sumBy(pat.perDow, x => x) : pat.avgDay * 7;
    const tile = (a, b, s) => `<div class="vh-tile"><small>${a}</small><b>${b}</b><span>${s}</span></div>`;

    const tiles = [
      ts.method === 'tank'
        ? tile('No tanque agora', N(ts.liters, 1) + ' L', `${N(ts.pct, 0)}% de ${N(p.tank, 0)} L`)
        : tile('Desde o último abastecimento', KM(ts.driven), `média entre abastecimentos: ${KM(ts.avgGap)}`),
      tile('Km até a reserva', KM(ts.usableKm), ts.method === 'tank' ? `reserva de ${N(p.reserve, 0)}% (${N(ts.reserveL, 1)} L)` : 'estimativa pela distância média'),
      tile('Custo do próximo abastecimento', costTxt(refillCost), litersAtRefill > 0 ? '≈ ' + N(litersAtRefill, 1) + ' L' + (p.price ? ' × ' + R(p.price) : '') : ''),
      tile('Combustível por semana', costTxt(cost(weekKm, p)), KM(weekKm) + ' por semana')
    ].join('');

    const bar = ts.method === 'tank'
      ? `<div class="vk-tank" title="Nível estimado do tanque"><i class="${ts.pct <= p.reserve ? 'hot' : ''}" style="width:${Math.min(100, ts.pct)}%"></i><s style="left:${Math.min(100, p.reserve)}%"></s></div><small class="muted">Nível estimado: ${N(ts.pct, 0)}% · a marca indica a reserva</small>`
      : '';

    const line = sim && sim.timeline.length
      ? `<div class="vk-days">${sim.timeline.map((t, i) => `<div class="vk-day ${i === sim.timeline.length - 1 && !sim.due ? 'last' : ''}"><small>${WS[t.date.getDay()]} ${dm(t.date)}</small><div class="vk-mini"><i style="height:${Math.max(3, t.frac * 100)}%"></i></div><b>${KM(t.used)}</b></div>`).join('')}</div><small class="muted">Km previstos por dia até o abastecimento (a barra mostra quanto ainda resta até a reserva).</small>`
      : '';

    const basis = S.mode === 'week'
      ? `Previsão com base no seu padrão da semana ${pat.src}.`
      : `Previsão com base na média de ${N(pat.avgDay, 1)} km por dia ${pat.src}.`;
    return wrap(`<div class="vk-big"><b>${big}</b><span>${when}</span></div><p class="muted vk-sub">${basis}</p>${tiles ? `<div class="vh-calc">${tiles}</div>` : ''}${bar}${line}<p class="fz-forecast-note">É uma estimativa, não a leitura do tanque. Quanto mais km diários e abastecimentos com tanque cheio você registrar, mais precisa fica.</p>`);
  }

  function logsHTML(v) {
    const rows = VH.dailyKm().filter(x => x.vehicle_id === v.id).sort((a, b) => b.log_date.localeCompare(a.log_date)).slice(0, 14);
    if (!rows.length) return '<p class="muted">Nenhum registro de km deste veículo ainda.</p>';
    return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Dia</th><th>Manhã</th><th>Noite</th><th>Rodado</th><th></th></tr></thead><tbody>${rows.map(x => `<tr><td>${dateBR(x.log_date)}</td><td>${WS[parse(x.log_date).getDay()]}</td><td>${N(x.morning_odometer, 1)} km</td><td>${N(x.evening_odometer, 1)} km</td><td><b>${N(x.km_driven, 1)} km</b></td><td class="vk-acts"><button class="mini-btn" data-vk-edit="${x.log_date}">Editar</button><button class="mini-btn danger" data-vk-del="${x.id}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  function html() {
    const vs = VH.act();
    if (!vs.length) return empty('Cadastre um veículo para usar a calculadora.');
    if (!vs.some(v => v.id === S.veh)) { S.veh = vs[0].id; persist(); }
    const ready = VH.dkReady();
    return `<div class="vk" id="vkRoot">
      <div class="vh-card vk-top">
        <div class="vk-filters">
          <label>Veículo<select id="vkVeh">${vs.map(x => `<option value="${x.id}" ${x.id === S.veh ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label>Período analisado<select id="vkPer">${PERIODS.map(o => `<option value="${o[0]}" ${S.period === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>
        </div>
        <label class="checkline vk-zero"><input type="checkbox" id="vkZero" ${S.zero ? 'checked' : ''}> Contar dias sem registro como 0 km <small class="muted">(use se você não registra os dias em que o veículo fica parado)</small></label>
        <details class="vk-det vk-params"><summary>Ajustar consumo, preço e tanque</summary>
          <div class="form-grid">
            <label>Consumo médio (km/L)<input id="vkKml" type="number" step="0.1" min="0" inputmode="decimal"></label>
            <label>Preço do litro (R$)<input id="vkPrice" type="number" step="0.001" min="0" inputmode="decimal"></label>
            <label>Capacidade do tanque (L)<input id="vkTank" type="number" step="0.1" min="0" inputmode="decimal"></label>
            <label>Abastecer quando restar (%)<input id="vkRes" type="number" step="1" min="0" max="60" inputmode="numeric"></label>
          </div>
          <small class="muted" id="vkSrc"></small> <button type="button" class="mini-btn" id="vkReset">Voltar ao automático</button>
        </details>
      </div>

      <div class="vh-card">
        <h3 class="vk-h">Registrar km do dia</h3>
        ${ready ? '' : '<div class="vh-alert late"><b>Ative o histórico diário</b><span>Execute o arquivo supabase-completo.sql no Supabase para criar a tabela vehicle_daily_km.</span></div>'}
        <div class="vk-seg" role="group" aria-label="Como informar">
          <button type="button" data-vk-kmode="odo" class="${S.kmode === 'odo' ? 'on' : ''}">Odômetro (manhã e noite)</button>
          <button type="button" data-vk-kmode="km" class="${S.kmode === 'km' ? 'on' : ''}">Só os km rodados</button>
        </div>
        <form id="vkForm" class="vh-form">
          <div class="form-grid">
            <label>Data<input id="vkDate" type="date" value="${today()}"></label>
            <label class="vk-odo ${S.kmode === 'odo' ? '' : 'hidden'}">Km pela manhã<input id="vkMorn" type="number" step="0.1" min="0" inputmode="decimal" placeholder="Ex.: 125430"></label>
            <label class="vk-odo ${S.kmode === 'odo' ? '' : 'hidden'}">Km à noite<input id="vkEve" type="number" step="0.1" min="0" inputmode="decimal" placeholder="Ex.: 125482"></label>
            <label class="vk-only ${S.kmode === 'km' ? '' : 'hidden'}">Km rodados no dia<input id="vkKmIn" type="number" step="0.1" min="0" inputmode="decimal" placeholder="Ex.: 52"></label>
            <label>Observação (opcional)<input id="vkNotes" placeholder="Ex.: viagem, trânsito"></label>
          </div>
          <div class="vk-live" id="vkLive"></div>
          <button class="btn primary" type="submit" id="vkSave" ${ready ? '' : 'disabled'}>Salvar km do dia</button>
        </form>
      </div>

      <div id="vkForecast"></div>
      <div id="vkReport"></div>
      <div class="vh-card"><h3 class="vk-h">Últimos registros</h3><div id="vkLogs"></div></div>

      <details class="vh-card vk-quick"><summary><b>Calculadora rápida</b> <small class="muted">— quanto gastei desde o último abastecimento</small></summary>
        <div class="vh-form"><div class="form-grid">
          <label>Km rodados desde o abastecimento<input id="qcKm" type="number" step="0.1" inputmode="decimal" placeholder="Ex.: 330"></label>
          <label>Preço do litro (R$)<input id="qcP" type="number" step="0.001"></label>
          <label>Consumo médio (km/L)<input id="qcC" type="number" step="0.1"></label>
          <label>Capacidade do tanque (L)<input id="qcT" type="number" step="0.1"></label>
          <label class="checkline"><input id="qcF" type="checkbox" checked> Último abastecimento foi tanque cheio</label>
        </div></div>
        <div id="qcOut"></div>
      </details>
    </div>`;
  }

  /* =====================================================================
     Ligações com a tela
     ===================================================================== */
  function refresh() {
    const v = vehicle();
    if (!v || !g('vkForecast')) return;
    const p = params(v);
    g('vkForecast').innerHTML = forecastHTML(v, p);
    g('vkReport').innerHTML = reportHTML(v, p);
    g('vkLogs').innerHTML = logsHTML(v);
    quick();
  }

  function fillParams() {
    const v = vehicle(); if (!v) return;
    const p = params(v), d = defaults(v);
    g('vkKml').value = p.kml || ''; g('vkPrice').value = p.price || ''; g('vkTank').value = p.tank || ''; g('vkRes').value = p.reserve;
    g('vkSrc').textContent = `Consumo: ${d.src}. Preço: média dos últimos abastecimentos.`;
    g('qcP').value = p.price || ''; g('qcC').value = p.kml || ''; g('qcT').value = p.tank || '';
  }

  function liveKm() {
    const v = vehicle(), date = g('vkDate').value || today();
    if (S.kmode === 'km') return g('vkKmIn').value === '' ? null : Number(g('vkKmIn').value);
    if (g('vkMorn').value === '' || g('vkEve').value === '') return null;
    return Number(g('vkEve').value) - Number(g('vkMorn').value);
  }
  function live() {
    const v = vehicle(), p = params(v), k = liveKm(), el = g('vkLive');
    if (k === null) { el.textContent = ''; return; }
    if (k < 0) { el.innerHTML = '<span class="negative">O km da noite está menor que o da manhã.</span>'; return; }
    const c = cost(k, p);
    el.innerHTML = `= <b>${N(k, 1)} km</b> rodados${c !== null ? ` · cerca de <b>${R(c)}</b> de combustível` : ''}`;
  }

  function fillForm() {
    const v = vehicle(), date = g('vkDate').value || today();
    const ex = VH.dailyKm().find(x => x.vehicle_id === v.id && x.log_date === date);
    const before = odoBefore(v, date);
    g('vkMorn').value = ex ? ex.morning_odometer : (before || '');
    g('vkEve').value = ex ? ex.evening_odometer : '';
    g('vkKmIn').value = ex ? ex.km_driven : '';
    g('vkNotes').value = (ex && ex.notes) || '';
    g('vkSave').textContent = ex ? 'Atualizar km de ' + dateBR(date) : 'Salvar km do dia';
    live();
  }

  function quick() {
    const o = g('qcOut'); if (!o) return;
    const km = +g('qcKm').value, p = +g('qcP').value, c = +g('qcC').value, t = +g('qcT').value, full = g('qcF').checked;
    if (!(km > 0 && p > 0 && c > 0)) { o.innerHTML = empty('Informe os km rodados, o preço do litro e o consumo.'); return; }
    const l = km / c, cst = l * p, rem = t ? t - l : 0, lv = t ? Math.max(0, rem / t * 100) : 0;
    const tile = (a, b, s = '') => `<div class="vh-tile"><small>${a}</small><b>${b}</b><span>${s}</span></div>`;
    o.innerHTML = `<div class="vh-calc">
      ${tile('Combustível gasto', N(l, 2) + ' L', 'em ' + N(km, 0) + ' km')}
      ${tile(t && full ? 'Para encher o tanque agora' : 'Valor do combustível gasto', R(cst), N(l, 2) + ' L × ' + R(p))}
      ${t ? tile('Tanque usado', N(l / t * 100, 0) + '%', 'de ' + N(t, 1) + ' L') : ''}
      ${t && full ? tile('Restante no tanque', N(Math.max(0, rem), 1) + ' L', rem > 0 ? '≈ ' + N(rem * c, 0) + ' km de autonomia' : 'Provavelmente na reserva') : ''}
      ${t ? tile('Encher do zero', R(t * p), N(t, 1) + ' L × ' + R(p)) : ''}
    </div>${t && full ? `<div class="ab-bar ${lv < 15 ? 'hot' : ''}" style="height:14px"><i style="width:${lv}%"></i></div><small class="muted">Nível estimado do tanque: ${N(lv, 0)}%${l > t ? ' — passou da capacidade do tanque, confira os km e o consumo.' : ''}${lv < 15 ? ' ⛽ Hora de abastecer!' : ''}</small>` : ''}`;
  }

  async function save(e) {
    e.preventDefault();
    if (!VH.dkReady()) return toast('Ative o histórico diário: execute supabase-completo.sql no Supabase.');
    const v = vehicle(), date = g('vkDate').value;
    if (!date) return toast('Escolha a data.');
    const ex = VH.dailyKm().find(x => x.vehicle_id === v.id && x.log_date === date);
    let m, n;
    if (S.kmode === 'km') {
      if (g('vkKmIn').value === '') return toast('Informe os km rodados no dia.');
      m = ex ? Number(ex.morning_odometer) : odoBefore(v, date);
      n = m + Number(g('vkKmIn').value);
    } else {
      if (g('vkMorn').value === '' || g('vkEve').value === '') return toast('Informe o km da manhã e o da noite.');
      m = Number(g('vkMorn').value); n = Number(g('vkEve').value);
    }
    if (n < m) return toast('O km da noite precisa ser maior ou igual ao da manhã.');
    if (n - m > 1500 && !confirm(`Isso dá ${N(n - m, 0)} km em um dia. Confirma?`)) return;
    const payload = { user_id: user.id, vehicle_id: v.id, log_date: date, morning_odometer: m, evening_odometer: n, notes: g('vkNotes').value.trim() || null };
    const r = await sb.from('vehicle_daily_km').upsert(payload, { onConflict: 'user_id,vehicle_id,log_date' });
    if (r.error) return toast('Não foi possível salvar a quilometragem. ' + r.error.message);
    toast(`Km do dia salvo: ${N(n - m, 1)} km rodados.`);
    await loadData(); renderPage();
  }

  function bind() {
    const root = g('vkRoot'); if (!root) return;
    g('vkVeh').onchange = () => { S.veh = g('vkVeh').value; persist(); fillParams(); fillForm(); refresh(); };
    g('vkPer').onchange = () => { S.period = Number(g('vkPer').value); persist(); refresh(); };
    g('vkZero').onchange = () => { S.zero = g('vkZero').checked; persist(); refresh(); };

    const setOv = (k, el) => {
      const v = vehicle(), val = el.value === '' ? NaN : Number(el.value);
      P[v.id] = P[v.id] || {};
      if (Number.isFinite(val) && val >= 0) P[v.id][k] = val; else delete P[v.id][k];
      write(PK, P); live(); refresh();
    };
    [['vkKml', 'kml'], ['vkPrice', 'price'], ['vkTank', 'tank'], ['vkRes', 'reserve']].forEach(([id, k]) => { g(id).oninput = () => setOv(k, g(id)); });
    g('vkReset').onclick = () => { delete P[vehicle().id]; write(PK, P); fillParams(); live(); refresh(); };

    g('vkDate').onchange = fillForm;
    ['vkMorn', 'vkEve', 'vkKmIn'].forEach(id => { g(id).oninput = live; });
    g('vkForm').onsubmit = save;
    ['qcKm', 'qcP', 'qcC', 'qcT'].forEach(id => { g(id).oninput = quick; });
    g('qcF').onchange = quick;

    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.vkMode) { S.mode = b.dataset.vkMode; persist(); refresh(); }
      else if (b.dataset.vkKmode) {
        S.kmode = b.dataset.vkKmode; persist();
        root.querySelectorAll('[data-vk-kmode]').forEach(x => x.classList.toggle('on', x.dataset.vkKmode === S.kmode));
        root.querySelectorAll('.vk-odo').forEach(x => x.classList.toggle('hidden', S.kmode !== 'odo'));
        root.querySelectorAll('.vk-only').forEach(x => x.classList.toggle('hidden', S.kmode !== 'km'));
        live();
      }
      else if (b.dataset.vkEdit) { g('vkDate').value = b.dataset.vkEdit; fillForm(); g('vkForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (b.dataset.vkDel) {
        if (!confirm('Excluir este registro diário?')) return;
        sb.from('vehicle_daily_km').delete().eq('id', b.dataset.vkDel).then(async r => {
          if (r.error) return toast(r.error.message);
          await loadData(); renderPage();
        });
      }
    });

    fillParams(); fillForm(); refresh();
  }

  window.VHC = { html, bind, core: { weekStats, tankState, simulate } };
})();
