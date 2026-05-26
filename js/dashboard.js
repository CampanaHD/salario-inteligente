async function carregarDashboard() {

  const { data: pedidos } = await supabaseClient
    .from('pedidos')
    .select('*');

  let faturamento = 0;

  pedidos.forEach(pedido => {
    faturamento += Number(pedido.total);
  });

  document.getElementById('faturamentoHoje')
    .innerText = `R$ ${faturamento.toFixed(2)}`;

  document.getElementById('pedidos')
    .innerText = pedidos.length;

  carregarAlertas();
}

async function carregarAlertas() {

  const { data: ingredientes } = await supabaseClient
    .from('ingredientes')
    .select('*');

  const alertas = document.getElementById('alertas');

  ingredientes.forEach(item => {

    if(item.quantidade <= item.estoque_minimo) {

      alertas.innerHTML += `
        <div class="alerta">
          Estoque baixo: ${item.nome}
        </div>
      `;
    }
  });
}

carregarDashboard();