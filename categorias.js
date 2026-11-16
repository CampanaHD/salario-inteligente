/* Categorias e subcategorias — Salário Inteligente
   - Seletor visual no formulário de lançamento (categoria + subcategoria em chips)
   - Painel "Categorias e subcategorias" em Configurações (ativar, expandir, adicionar, remover)
   Os campos #txCategory e #txSubcategory continuam existindo (ocultos) para o restante do sistema. */
(function(){
  const PRESETS = [
    {name:'Alimentação',subs:['Mercado','Restaurantes','Delivery','Padaria','Lanches']},
    {name:'Moradia',subs:['Aluguel','Condomínio','Água','Energia','Gás','Internet','Manutenção']},
    {name:'Transporte',subs:['Combustível','Aplicativo','Ônibus','Pedágio','Estacionamento','Manutenção']},
    {name:'Saúde',subs:['Farmácia','Consultas','Exames','Plano de saúde','Odontologia']},
    {name:'Lazer',subs:['Passeios','Cinema','Jogos','Hobbies','Eventos']},
    {name:'Educação',subs:['Cursos','Mensalidade','Material','Livros']},
    {name:'Salário',subs:['Salário','Adiantamento','Bônus','Comissão']},
    {name:'Contas',subs:['Telefone','Água','Energia','Internet','Outras contas']},
    {name:'Veículos',subs:['Combustível','Manutenção','Seguro','IPVA','Licenciamento','Lavagem']},
    {name:'Cartão de Crédito',subs:['Fatura','Anuidade','Juros','Parcelamento']},
    {name:'Terceiros',subs:['Empréstimos','Ajuda','Reembolsos']},
    {name:'Pessoal',subs:['Roupas','Cuidados pessoais','Beleza','Acessórios']},
    {name:'Pets',subs:['Ração','Veterinário','Banho e tosa','Medicamentos','Vacinas','Acessórios','Brinquedos','Hospedagem']},
    {name:'Assinaturas',subs:['Streaming','Aplicativos','Softwares','Clubes']},
    {name:'Compras',subs:['Eletrônicos','Casa','Móveis','Outros']},
    {name:'Viagens',subs:['Passagens','Hospedagem','Alimentação','Passeios']},
    {name:'Impostos',subs:['IPTU','IPVA','IR','Taxas']},
    {name:'Presentes',subs:['Aniversários','Datas comemorativas','Doações']},
    {name:'Outros',subs:['Diversos']}
  ];
  // Ícone e matiz (0-360) de cada categoria. Categorias personalizadas usam o ícone escolhido e um matiz derivado do nome.
  const LOOK = {
    'Alimentação':['🍽️',28],'Moradia':['🏠',215],'Transporte':['🚌',190],'Saúde':['🩺',340],'Lazer':['🎮',275],
    'Educação':['🎓',245],'Salário':['💼',145],'Contas':['🧾',50],'Veículos':['🚗',170],'Cartão de Crédito':['💳',305],
    'Terceiros':['🤝',18],'Pessoal':['🧴',322],'Pets':['🐾',85],'Assinaturas':['🔁',262],'Compras':['🛍️',8],
    'Viagens':['✈️',202],'Impostos':['🏛️',38],'Presentes':['🎁',355],'Outros':['📦',220],
    'Investimentos':['📈',130],'Benefícios':['🎟️',160]
  };
  const EMOJIS = ['🏷️','🏠','🍽️','🛒','🚗','💊','🎓','🎮','🎁','✈️','🐾','👶','💡','📱','🏋️','🧹','🔧','💇','🌱','⭐'];
  const clone = x => JSON.parse(JSON.stringify(x));
  const same = (a,b) => String(a).toLowerCase() === String(b).toLowerCase();
  const isPreset = n => PRESETS.some(p => same(p.name,n));
  const hashHue = s => { let h = 0; for (const ch of String(s)) h = (h*31 + ch.charCodeAt(0)) % 360; return h; };

  function config(){
    const raw = profile?.custom_categories;
    if (raw && Array.isArray(raw.enabled) && Array.isArray(raw.custom)) return raw;
    return {enabled:PRESETS.map(x => x.name), custom:[]};
  }
  const customEntry = name => config().custom.find(y => same(y.name,name));
  const icon = name => customEntry(name)?.icon || LOOK[name]?.[0] || '🏷️';
  const hue = name => LOOK[name]?.[1] ?? hashHue(name);

  // Categoria completa (predefinida com extras do usuário, ou personalizada).
  function merged(){
    const c = config();
    const base = PRESETS.map(x => {
      const extra = c.custom.find(y => same(y.name,x.name));
      return {name:x.name, subs:[...new Set([...x.subs, ...(extra?.subs||[])])], custom:false, enabled:c.enabled.includes(x.name)};
    });
    const mine = c.custom.filter(x => !isPreset(x.name)).map(x => ({name:x.name, subs:[...new Set(x.subs||[])], custom:true, enabled:true}));
    return [...base, ...mine].filter((x,i,a) => a.findIndex(y => same(y.name,x.name)) === i);
  }
  const categories = () => merged().filter(x => x.enabled);
  const subsOf = name => categories().find(x => x.name === name)?.subs || [];

  function options(selected){
    return categories().map(c => `<option value="${esc(c.name)}" ${c.name===selected?'selected':''}>${esc(c.name)}</option>`).join('');
  }
  function subOptions(cat, selected){
    const list = subsOf(cat), extra = selected && !list.includes(selected) ? [selected] : [];
    return `<option value="">Sem subcategoria</option>${[...list,...extra].map(v => `<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('')}`;
  }

  /* ---------- persistência ---------- */
  async function persist(c, message){
    const {error} = await sb.from('profiles').update({custom_categories:c}).eq('id',user.id);
    if (error) { toast('Não foi possível salvar as categorias. Execute a migração SQL de categorias: '+error.message); return false; }
    profile = {...profile, custom_categories:c};
    renderPage();
    if (message) toast(message);
    return true;
  }
  async function addSub(parent, name){
    name = String(name||'').trim();
    if (!name) return false;
    const item = merged().find(x => x.name === parent);
    if (!item) { toast('Categoria não encontrada.'); return false; }
    if (item.subs.some(s => same(s,name))) { toast('Essa subcategoria já existe em '+parent+'.'); return false; }
    const c = clone(config()), target = c.custom.find(x => same(x.name,parent));
    if (target) target.subs = [...new Set([...(target.subs||[]), name])];
    else c.custom.push({name:parent, subs:[name]});
    if (isPreset(parent) && !c.enabled.includes(parent)) c.enabled.push(parent);
    return persist(c, 'Subcategoria adicionada em '+parent+'.');
  }
  async function removeSub(parent, name){
    const c = clone(config()), entry = c.custom.find(x => same(x.name,parent));
    if (!entry) return;
    entry.subs = (entry.subs||[]).filter(s => s !== name);
    if (isPreset(parent) && !entry.subs.some(s => !PRESETS.find(p => same(p.name,parent)).subs.includes(s))) c.custom = c.custom.filter(x => x !== entry);
    await persist(c, 'Subcategoria removida. Os lançamentos antigos continuam no histórico.');
  }

  /* ---------- seletor visual no formulário de lançamento ---------- */
  let addingSub = false, scrollToSelected = false;
  // Mantém os campos nativos de categoria visíveis no formulário.
  // O seletor visual antigo escondia os <label> e, em alguns fluxos de renderização,
  // não era reconstruído ao abrir o modal. Os selects são mais robustos e acessíveis.
  function ensurePicker(){ return null; }
  function renderPicker(){ return; }
  async function confirmNewSub(){
    const input = $('txSubNew'), name = input?.value.trim(), cat = $('txCategory').value;
    if (!name) { addingSub = false; renderPicker(); return; }
    addingSub = false;
    const ok = await addSub(cat, name);
    if (ok) { $('txSubcategory').innerHTML = subOptions(cat, name); $('txSubcategory').value = name; }
    renderPicker();
  }
  function onPickerClick(e){
    const t = e.target.closest('button'); if (!t) return;
    const catSel = $('txCategory'), subSel = $('txSubcategory');
    if (t.dataset.pickCat !== undefined) {
      catSel.value = t.dataset.pickCat;
      subSel.innerHTML = subOptions(catSel.value, '');
      addingSub = false;
      catSel.dispatchEvent(new Event('change',{bubbles:true}));
      renderPicker();
    } else if (t.dataset.pickSub !== undefined) {
      subSel.value = subSel.value === t.dataset.pickSub ? '' : t.dataset.pickSub;
      renderPicker();
    } else if (t.hasAttribute('data-sub-add')) { addingSub = true; renderPicker(); }
    else if (t.hasAttribute('data-sub-cancel')) { addingSub = false; renderPicker(); }
    else if (t.hasAttribute('data-sub-confirm')) confirmNewSub();
  }
  function onPickerKey(e){
    if (e.target.id !== 'txSubNew') return;
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); confirmNewSub(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); addingSub = false; renderPicker(); }
  }

  function refreshCategorySelects(){
    const tx = $('txCategory'), bill = $('billCategory'), sub = $('txSubcategory');
    if (tx) { const v = tx.value; tx.innerHTML = options(v); if (v && !categories().some(c => c.name === v)) tx.add(new Option(v,v)); tx.value = v && Array.from(tx.options).some(o => o.value === v) ? v : (categories()[0]?.name || 'Outros'); }
    if (bill) { const v = bill.value; bill.innerHTML = options(v); if (v && !categories().some(c => c.name === v)) bill.add(new Option(v,v)); bill.value = v && Array.from(bill.options).some(o => o.value === v) ? v : (categories()[0]?.name || 'Outros'); }
    if (sub && sub.tagName === 'SELECT') { const v = sub.value; sub.innerHTML = subOptions(tx?.value, v); sub.value = v; }
    if ($('transactionDialog')?.open) renderPicker();
  }

  /* ---------- painel em Configurações ---------- */
  const openCats = new Set();
  function cardHTML(x){
    const preset = PRESETS.find(p => same(p.name,x.name)), open = openCats.has(x.name);
    const removable = s => x.custom || !(preset?.subs||[]).includes(s);
    return `<div class="cat-card${x.enabled?'':' off'}${open?' open':''}" data-cat-card="${esc(x.name)}" data-search="${esc((x.name+' '+x.subs.join(' ')).toLowerCase())}" style="--h:${hue(x.name)}">
      <div class="cat-card-head">
        <button type="button" class="cat-card-toggle" data-cat-expand="${esc(x.name)}" aria-expanded="${open}">
          <span class="cat-tile">${icon(x.name)}</span>
          <span class="cat-card-text"><b>${esc(x.name)}</b><small>${x.subs.length} subcategoria${x.subs.length===1?'':'s'}${x.custom?' · personalizada':''}</small></span>
          <span class="cat-chevron" aria-hidden="true">›</span>
        </button>
        ${x.custom?'':`<label class="switch" title="${x.enabled?'Desativar':'Ativar'} ${esc(x.name)}"><input type="checkbox" data-category-enabled="${esc(x.name)}" ${x.enabled?'checked':''} aria-label="Usar a categoria ${esc(x.name)}"><i></i></label>`}
      </div>
      <div class="cat-card-body">
        <div class="sub-chips">${x.subs.map(s => `<span class="sub-chip static">${esc(s)}${removable(s)?`<button type="button" class="sub-x" data-del-sub="${esc(x.name)}" data-sub="${esc(s)}" aria-label="Remover ${esc(s)}">×</button>`:''}</span>`).join('') || '<span class="muted small">Nenhuma subcategoria.</span>'}</div>
        <form class="sub-add-form" data-sub-form="${esc(x.name)}"><input maxlength="60" required placeholder="Nova subcategoria em ${esc(x.name)}" aria-label="Nova subcategoria em ${esc(x.name)}"><button class="btn outline" type="submit">Adicionar</button></form>
        ${x.custom?`<button type="button" class="mini-btn danger" data-del-cat="${esc(x.name)}">Excluir categoria</button>`:''}
      </div>
    </div>`;
  }
  const oldSettings = settingsHTML;
  settingsHTML = function(){
    const all = merged(), active = all.filter(x => x.enabled).length;
    return oldSettings() + `<section class="panel category-settings">
      <div class="panel-head">
        <div><h3>Categorias e subcategorias</h3><p>${active} de ${all.length} categorias em uso. Desativar uma categoria não apaga lançamentos antigos.</p></div>
        <input type="search" id="catFilter" class="cat-filter" placeholder="Buscar categoria ou subcategoria" aria-label="Buscar categoria ou subcategoria">
      </div>
      <div class="cat-grid">${all.map(cardHTML).join('')}</div>
      <p class="muted small cat-nofind hidden" id="catNoFind">Nenhuma categoria encontrada.</p>
      <div class="cat-new">
        <h4>Criar categoria própria</h4>
        <form id="customCategoryForm">
          <div class="emoji-row" role="radiogroup" aria-label="Ícone da categoria">${EMOJIS.map((e,i) => `<button type="button" class="emoji-pick${i===0?' on':''}" data-emoji="${e}" aria-pressed="${i===0}">${e}</button>`).join('')}</div>
          <input type="hidden" id="customCategoryIcon" value="${EMOJIS[0]}">
          <div class="form-grid">
            <label>Nome<input id="customCategoryName" maxlength="50" required placeholder="Ex.: Cuidados com a casa"></label>
            <label>Subcategorias (separe por vírgula)<input id="customCategorySubs" maxlength="300" placeholder="Ex.: Limpeza, manutenção, decoração"></label>
          </div>
          <div class="modal-actions"><button class="btn primary" type="submit">Criar categoria</button></div>
        </form>
      </div>
    </section>`;
  };

  const oldBind = bindPageActions;
  bindPageActions = function(){
    oldBind();
    document.querySelectorAll('[data-category-enabled]').forEach(el => el.onchange = async () => {
      const c = clone(config()), name = el.dataset.categoryEnabled;
      c.enabled = el.checked ? [...new Set([...c.enabled, name])] : c.enabled.filter(x => x !== name);
      await persist(c, el.checked ? name+' ativada.' : name+' desativada.');
    });
    document.querySelectorAll('[data-cat-expand]').forEach(b => b.onclick = () => {
      const name = b.dataset.catExpand, card = b.closest('.cat-card'), open = !openCats.has(name);
      open ? openCats.add(name) : openCats.delete(name);
      card.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
    });
    document.querySelectorAll('[data-sub-form]').forEach(f => f.onsubmit = async e => {
      e.preventDefault(); openCats.add(f.dataset.subForm);
      await addSub(f.dataset.subForm, f.querySelector('input').value);
    });
    document.querySelectorAll('[data-del-sub]').forEach(b => b.onclick = () => { openCats.add(b.dataset.delSub); removeSub(b.dataset.delSub, b.dataset.sub); });
    document.querySelectorAll('[data-del-cat]').forEach(b => b.onclick = async () => {
      const name = b.dataset.delCat;
      if (!confirm('Excluir a categoria "'+name+'"? Os lançamentos antigos continuam no histórico com esse nome.')) return;
      const c = clone(config()); c.custom = c.custom.filter(x => !same(x.name,name)); c.enabled = c.enabled.filter(x => !same(x,name));
      openCats.delete(name);
      await persist(c, 'Categoria excluída.');
    });
    document.querySelectorAll('[data-emoji]').forEach(b => b.onclick = () => {
      document.querySelectorAll('[data-emoji]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      $('customCategoryIcon').value = b.dataset.emoji;
    });
    const cf = $('customCategoryForm');
    if (cf) cf.onsubmit = async e => {
      e.preventDefault();
      const name = $('customCategoryName').value.trim(); if (!name) return;
      if (merged().some(x => same(x.name,name))) return toast('Essa categoria já existe.');
      const subs = [...new Set($('customCategorySubs').value.split(',').map(x => x.trim()).filter(Boolean))];
      const c = clone(config()); c.custom.push({name, subs, icon:$('customCategoryIcon').value||EMOJIS[0]}); c.enabled.push(name);
      openCats.add(name);
      await persist(c, 'Categoria criada.');
    };
    const flt = $('catFilter');
    if (flt) flt.oninput = () => {
      const q = flt.value.trim().toLowerCase(); let shown = 0;
      document.querySelectorAll('[data-cat-card]').forEach(c => { const hit = !q || c.dataset.search.includes(q); c.classList.toggle('hidden', !hit); if (hit) shown++; });
      $('catNoFind')?.classList.toggle('hidden', shown > 0);
    };
  };

  /* ---------- integração com o formulário de lançamento e de conta ---------- */
  const oldOpen = openTransaction;
  openTransaction = function(t = null){
    addingSub = false;
    refreshCategorySelects();
    const tx = $('txCategory');
    if (t?.category && tx && !Array.from(tx.options).some(o => o.value === t.category)) tx.add(new Option(t.category, t.category));
    oldOpen(t);
    if (tx && !tx.value && tx.options.length) tx.value = tx.options[0].value;
    const sub = $('txSubcategory');
    if (sub) { sub.innerHTML = subOptions(tx?.value, t?.subcategory || ''); sub.value = t?.subcategory || ''; }
    scrollToSelected = true;
    renderPicker();
  };
  const oldBill = openBill;
  openBill = function(b = null){ refreshCategorySelects(); oldBill(b); };
  const oldRender = renderPage;
  renderPage = function(){ oldRender(); if (currentPage !== 'settings') refreshCategorySelects(); };

  // Ajuda para listas: ícone colorido + categoria › subcategoria.
  window.CATS = {
    icon, hue, list:categories, subs:subsOf,
    pill(name, sub){
      const n = name || 'Outros';
      return `<span class="cat-pill" style="--h:${hue(n)}"><span class="cat-ico">${icon(n)}</span>${esc(n)}${sub ? `<em>${esc(sub)}</em>` : ''}</span>`;
    }
  };
  const categorySelect = $('txCategory');
  if (categorySelect && !categorySelect.dataset.subcategoryBound) {
    categorySelect.dataset.subcategoryBound = '1';
    categorySelect.addEventListener('change', () => {
      const sub = $('txSubcategory');
      if (sub) { sub.innerHTML = subOptions(categorySelect.value, ''); sub.value = ''; }
    });
  }
  ensurePicker();
})();
