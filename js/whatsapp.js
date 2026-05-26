async function carregarProdutos() {

  const { data, error } = await supabaseClient
    .from('produtos')
    .select('*')
    .order('id', { ascending: false });

  if(error) {
    console.error(error);
    return;
  }

  const lista = document.getElementById('listaProdutos');

  lista.innerHTML = '';

  data.forEach(produto => {

    lista.innerHTML += `
    
      <div class="card">

        <img 
          src="${produto.imagem || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200'}"
          alt="${produto.nome}"
        >

        <div class="card-content">

          <h3>${produto.nome}</h3>

          <p>
            ${produto.descricao || 'Hambúrguer artesanal'}
          </p>

          <div class="preco">
            R$ ${Number(produto.preco).toFixed(2)}
          </div>

          <button 
            class="btn"
            onclick="pedirWhats('${produto.nome}', '${produto.preco}')"
          >
            Pedir Agora
          </button>

        </div>

      </div>

    `;
  });

}

function pedirWhats(nome, preco) {

  const numero = '5511999999999';

  const mensagem = `
🍔 *NOVO PEDIDO*

Produto: ${nome}
Preço: R$ ${preco}

Olá, gostaria de fazer esse pedido.
`;

  const texto = encodeURIComponent(mensagem);

  window.open(
    `https://wa.me/${numero}?text=${texto}`,
    '_blank'
  );
}

carregarProdutos();