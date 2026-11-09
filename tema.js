/* Tema PRO: sair da conta no celular e memória das seções do menu */
(function(){const $=id=>document.getElementById(id),p=$('mobileMorePanel'),upd=()=>{const m=$('userEmail'),x=$('mobileUserMail');if(m&&x)x.textContent=m.textContent};
if(p&&!p.querySelector('.mobile-logout')){const b=document.createElement('button');b.type='button';b.className='mobile-logout';b.innerHTML='⎋ <span>Sair da conta</span><small id="mobileUserMail"></small>';b.onclick=()=>{if(confirm('Sair da sua conta?'))$('logoutBtn').click()};p.appendChild(b);const t=document.querySelector('.mobile-more-toggle');if(t)t.addEventListener('click',upd)}
document.querySelectorAll('.nav-section').forEach((d,i)=>{const k='si_nav'+i,v=localStorage.getItem(k);if(v!==null)d.open=v==='1';d.addEventListener('toggle',()=>localStorage.setItem(k,d.open?'1':'0'))})})();

/* Garante que contas, benefícios, pontos e veículos carreguem na abertura: se o primeiro carregamento
   aconteceu antes dos módulos extras ficarem prontos, recarrega uma vez e redesenha a tela. */
(function(){let kicked=false;const _r=renderPage;renderPage=function(){_r();if(!kicked&&!window.__ext&&typeof user!=='undefined'&&user){kicked=true;Promise.resolve(loadData()).then(()=>renderPage()).catch(()=>{})}}})();

/* Categorias unificadas: todos os campos de categoria usam a mesma lista (e mantêm o valor atual, mesmo antigo) */
(function(){const L=['Alimentação','Moradia','Transporte','Saúde','Lazer','Educação','Salário','Contas','Veículos','Cartão de Crédito','Assinaturas','Terceiros','Pessoal','Benefícios','Hora extra','Outros'];let busy=false;
  function fix(){if(busy)return;busy=true;try{document.querySelectorAll('select[id*="ategor"]').forEach(s=>{const cur=s.value,want=[...L];if(cur&&!want.includes(cur))want.push(cur);const have=[...s.options].map(o=>o.textContent);if(have.length===want.length&&have.every((x,i)=>x===want[i]))return;s.innerHTML=want.map(x=>`<option>${x}</option>`).join('');if(cur)s.value=cur})}finally{busy=false}}
  new MutationObserver(()=>fix()).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});fix()})();
