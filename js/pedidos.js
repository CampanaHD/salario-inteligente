const pedidoForm = document.getElementById('pedidoForm');

pedidoForm.addEventListener('submit', async (e) => {

  e.preventDefault();

  const cliente = document.getElementById('cliente').value;
  const telefone = document.getElementById('telefone').value;
  const total = document.getElementById('total').value;

  await supabaseClient
    .from('pedidos')
    .insert([
      {
        cliente_nome: cliente,
        telefone,
        total
      }
    ]);

  alert('Pedido salvo');
});

const btnPdf = document.getElementById('gerarPdf');

btnPdf.addEventListener('click', () => {

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF();

  doc.text('Pedido Hamburgueria', 10, 10);

  doc.save('pedido.pdf');
});