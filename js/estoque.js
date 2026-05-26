const tabelaEstoque = document.getElementById('tabelaEstoque');
const formIngrediente = document.getElementById('formIngrediente');
const alertasContainer = document.getElementById('alertasEstoque');

/* =========================================
   CARREGAR ESTOQUE
========================================= */

async function carregarEstoque() {

  const { data, error } = await supabaseClient
    .from('ingredientes')
    .select('*')
    .order('nome', { ascending: true });

  if(error) {
    console.error(error);
    mostrarToast('Erro ao carregar estoque');
    return;
  }

  if(tabelaEstoque) {

    tabelaEstoque.innerHTML = '';

    data.forEach(item => {

      const baixo = Number(item.quantidade) <= Number(item.estoque_minimo);

      tabelaEstoque.innerHTML += `
      
        <tr class="${baixo ? 'estoque-baixo' : ''}">

          <td>${item.nome}</td>

          <td>
            ${item.quantidade} ${item.unidade}
          </td>

          <td>
            ${item.estoque_minimo} ${item.unidade}
          </td>

          <td>
            ${
              baixo
              ? '<span class="status status-baixo">Baixo</span>'
              : '<span class="status status-ok">OK</span>'
            }
          </td>

          <td class="acoes">

            <button
              class="btn-editar"
              onclick="editarIngrediente(${item.id})"
            >
              Editar
            </button>

            <button
              class="btn-remover"
              onclick="removerIngrediente(${item.id})"
            >
              Excluir
            </button>

          </td>

        </tr>

      `;

    });

  }

  carregarAlertas(data);

}

/* =========================================
   ALERTAS ESTOQUE
========================================= */

function carregarAlertas(lista) {

  if(!alertasContainer) return;

  alertasContainer.innerHTML = '';

  const itensBaixos = lista.filter(item =>
    Number(item.quantidade) <= Number(item.estoque_minimo)
  );

  if(itensBaixos.length === 0) {

    alertasContainer.innerHTML = `
      <div class="alerta alerta-ok">
        ✅ Nenhum item com estoque baixo
      </div>
    `;

    return;
  }

  itensBaixos.forEach(item => {

    alertasContainer.innerHTML += `
    
      <div class="alerta">

        ⚠️ O ingrediente
        <strong>${item.nome}</strong>
        está acabando.

        <br><br>

        Restam:
        ${item.quantidade} ${item.unidade}

      </div>

    `;

  });

}

/* =========================================
   CADASTRAR INGREDIENTE
========================================= */

if(formIngrediente) {

  formIngrediente.addEventListener('submit', async (e) => {

    e.preventDefault();

    const nome = document.getElementById('nomeIngrediente').value;
    const quantidade = document.getElementById('quantidadeIngrediente').value;
    const unidade = document.getElementById('unidadeIngrediente').value;
    const minimo = document.getElementById('estoqueMinimo').value;

    const { error } = await supabaseClient
      .from('ingredientes')
      .insert([
        {
          nome,
          quantidade,
          unidade,
          estoque_minimo: minimo
        }
      ]);

    if(error) {

      console.error(error);

      mostrarToast('Erro ao salvar');

      return;
    }

    mostrarToast('Ingrediente cadastrado');

    formIngrediente.reset();

    carregarEstoque();

  });

}

/* =========================================
   EDITAR INGREDIENTE
========================================= */

async function editarIngrediente(id) {

  const novoValor = prompt(
    'Nova quantidade em estoque:'
  );

  if(!novoValor) return;

  const { error } = await supabaseClient
    .from('ingredientes')
    .update({
      quantidade: Number(novoValor)
    })
    .eq('id', id);

  if(error) {

    console.error(error);

    mostrarToast('Erro ao atualizar');

    return;
  }

  mostrarToast('Estoque atualizado');

  carregarEstoque();

}

/* =========================================
   REMOVER INGREDIENTE
========================================= */

async function removerIngrediente(id) {

  const confirmar = confirm(
    'Deseja realmente excluir este ingrediente?'
  );

  if(!confirmar) return;

  const { error } = await supabaseClient
    .from('ingredientes')
    .delete()
    .eq('id', id);

  if(error) {

    console.error(error);

    mostrarToast('Erro ao excluir');

    return;
  }

  mostrarToast('Ingrediente removido');

  carregarEstoque();

}

/* =========================================
   DAR BAIXA AUTOMÁTICA
========================================= */

async function baixarIngredientes(produtoId, quantidadePedido = 1) {

  const { data: ingredientesProduto, error } =
    await supabaseClient
      .from('produto_ingredientes')
      .select(`
        quantidade,
        ingrediente_id,
        ingredientes (
          id,
          nome,
          quantidade
        )
      `)
      .eq('produto_id', produtoId);

  if(error) {
    console.error(error);
    return;
  }

  for(const item of ingredientesProduto) {

    const quantidadeUsada =
      Number(item.quantidade) * quantidadePedido;

    const estoqueAtual =
      Number(item.ingredientes.quantidade);

    const novoEstoque =
      estoqueAtual - quantidadeUsada;

    await supabaseClient
      .from('ingredientes')
      .update({
        quantidade: novoEstoque
      })
      .eq('id', item.ingrediente_id);

  }

  carregarEstoque();

}

/* =========================================
   RELATÓRIO DE ESTOQUE
========================================= */

async function gerarRelatorioEstoque() {

  const { data } = await supabaseClient
    .from('ingredientes')
    .select('*');

  console.table(data);

  mostrarToast('Relatório gerado');

}

/* =========================================
   PESQUISA
========================================= */

function pesquisarIngrediente() {

  const termo = document
    .getElementById('pesquisaIngrediente')
    .value
    .toLowerCase();

  const linhas = document.querySelectorAll(
    '#tabelaEstoque tr'
  );

  linhas.forEach(linha => {

    const texto = linha.innerText.toLowerCase();

    linha.style.display =
      texto.includes(termo)
      ? ''
      : 'none';

  });

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
   INIT
========================================= */

carregarEstoque();