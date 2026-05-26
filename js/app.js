document.addEventListener('DOMContentLoaded', () => {

  iniciarAnimacoes();
  iniciarScrollHeader();
  iniciarCarrinho();
  iniciarScrollReveal();

});

/* =========================================
   HEADER SCROLL
========================================= */

function iniciarScrollHeader() {

  const header = document.querySelector('header');

  window.addEventListener('scroll', () => {

    if(window.scrollY > 50) {

      header.style.background = 'rgba(10,10,10,.96)';
      header.style.boxShadow = '0 10px 30px rgba(0,0,0,.35)';

    } else {

      header.style.background = 'rgba(10,10,10,.88)';
      header.style.boxShadow = 'none';

    }

  });

}

/* =========================================
   HERO ANIMATION
========================================= */

function iniciarAnimacoes() {

  const heroTitle = document.querySelector('.hero h1');
  const heroText = document.querySelector('.hero p');
  const heroButton = document.querySelector('.hero .btn');

  if(heroTitle) {

    heroTitle.animate([
      {
        opacity: 0,
        transform: 'translateY(40px)'
      },
      {
        opacity: 1,
        transform: 'translateY(0)'
      }
    ], {
      duration: 900,
      fill: 'forwards',
      easing: 'ease'
    });

  }

  if(heroText) {

    heroText.animate([
      {
        opacity: 0,
        transform: 'translateY(30px)'
      },
      {
        opacity: 1,
        transform: 'translateY(0)'
      }
    ], {
      duration: 1200,
      fill: 'forwards',
      easing: 'ease'
    });

  }

  if(heroButton) {

    heroButton.animate([
      {
        opacity: 0,
        transform: 'scale(.8)'
      },
      {
        opacity: 1,
        transform: 'scale(1)'
      }
    ], {
      duration: 1400,
      fill: 'forwards',
      easing: 'ease'
    });

  }

}

/* =========================================
   SCROLL REVEAL
========================================= */

function iniciarScrollReveal() {

  const elementos = document.querySelectorAll(
    '.card, .kpi, .section-title, form'
  );

  const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

      if(entry.isIntersecting) {

        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';

      }

    });

  }, {
    threshold: 0.1
  });

  elementos.forEach(el => {

    el.style.opacity = '0';
    el.style.transform = 'translateY(40px)';
    el.style.transition = '.7s ease';

    observer.observe(el);

  });

}

/* =========================================
   CARRINHO
========================================= */

let carrinho = [];

function iniciarCarrinho() {

  atualizarCarrinhoUI();

}

function adicionarCarrinho(produto, preco) {

  carrinho.push({
    produto,
    preco
  });

  atualizarCarrinhoUI();

  mostrarToast(`${produto} adicionado`);

}

function removerCarrinho(index) {

  carrinho.splice(index, 1);

  atualizarCarrinhoUI();

}

function atualizarCarrinhoUI() {

  const carrinhoLista = document.getElementById('carrinhoLista');
  const carrinhoTotal = document.getElementById('carrinhoTotal');
  const carrinhoQuantidade = document.getElementById('carrinhoQuantidade');

  if(!carrinhoLista) return;

  carrinhoLista.innerHTML = '';

  let total = 0;

  carrinho.forEach((item, index) => {

    total += Number(item.preco);

    carrinhoLista.innerHTML += `
    
      <div class="item-carrinho">

        <div>
          <h4>${item.produto}</h4>
          <p>R$ ${Number(item.preco).toFixed(2)}</p>
        </div>

        <button 
          class="btn-remover"
          onclick="removerCarrinho(${index})"
        >
          ✕
        </button>

      </div>

    `;

  });

  if(carrinhoTotal) {
    carrinhoTotal.innerText =
      `R$ ${total.toFixed(2)}`;
  }

  if(carrinhoQuantidade) {
    carrinhoQuantidade.innerText =
      carrinho.length;
  }

}

/* =========================================
   FINALIZAR WHATSAPP
========================================= */

function finalizarPedidoWhats() {

  if(carrinho.length === 0) {

    mostrarToast('Carrinho vazio');

    return;

  }

  let mensagem = '🍔 *NOVO PEDIDO*%0A%0A';

  let total = 0;

  carrinho.forEach(item => {

    mensagem += `• ${item.produto} - R$ ${item.preco}%0A`;

    total += Number(item.preco);

  });

  mensagem += `%0A💰 Total: R$ ${total.toFixed(2)}`;

  const numero = '5511999999999';

  window.open(
    `https://wa.me/${numero}?text=${mensagem}`,
    '_blank'
  );

}

/* =========================================
   TOAST
========================================= */

function mostrarToast(texto) {

  const toast = document.createElement('div');

  toast.classList.add('toast');

  toast.innerText = texto;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  setTimeout(() => {

    toast.classList.remove('show');

    setTimeout(() => {
      toast.remove();
    }, 300);

  }, 2500);

}

/* =========================================
   DARK PARALLAX
========================================= */

window.addEventListener('scroll', () => {

  const hero = document.querySelector('.hero');

  if(hero) {

    hero.style.backgroundPositionY =
      `${window.scrollY * 0.4}px`;

  }

});

/* =========================================
   MENU MOBILE
========================================= */

function toggleMenu() {

  const nav = document.querySelector('nav');

  nav.classList.toggle('active');

}