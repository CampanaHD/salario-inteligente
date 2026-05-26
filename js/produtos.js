const form = document.getElementById('produtoForm');

form.addEventListener('submit', async (e) => {

  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const descricao = document.getElementById('descricao').value;
  const preco = document.getElementById('preco').value;
  const custo = document.getElementById('custo').value;

  await supabaseClient
    .from('produtos')
    .insert([
      {
        nome,
        descricao,
        preco,
        custo
      }
    ]);

  alert('Produto cadastrado');

  form.reset();
});