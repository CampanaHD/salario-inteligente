# Salário Inteligente Plus

Sistema de finanças pessoais (HTML + JavaScript + Supabase).

## Instalação
1. Publique todos os arquivos juntos em um endereço `https://` (necessário para instalar como app no celular).
2. No Supabase, abra o SQL Editor e execute `supabase.sql` (base) e depois `supabase-completo.sql` (recursos Plus). Ambos podem ser executados de novo com segurança.
3. Se as tabelas de hora extra já existiam com colunas erradas, execute antes, uma única vez, `supabase-horaextra-recriar.sql` (apaga e recria só essas duas tabelas).

## Recursos
- **Início, Lançamentos, Contas, Cartões, Metas, Investimentos, Planejamento, Relatórios, Família e Configurações** com filtros, ordenação, indicadores e gráficos.
- **Veículos:** carro/moto, abastecimento, manutenção, despesas, avisos de troca, calculadora de combustível e análises.
- **Contas bancárias:** várias contas, saldo automático, transferências, forma de pagamento e cartão ao lançar, importação de extrato (CSV/OFX) e colagem de notificação do banco.
- **Benefícios VR/VA/VT:** saldo próprio, creditar saldo ou o valor do mês, crédito automático no dia, registro de gastos, extrato e estimativa de duração.
- **Cartões de crédito:** limite disponível, fatura atual e próxima, fechamento e vencimento, pagar fatura (libera limite e desconta da conta), ajustar limite.
- **Hora extra:** ponto com almoço e pausas, horas extras a 50%/100%, DSR opcional e valor estimado a receber.
- **Temas completos** (claro/escuro e sete paletas) e **app instalável** no celular.

Teclas: `N` novo lançamento, `Ctrl + K` busca.

## Melhorias recentes de investimentos, lançamentos e cartões
- **Investimentos:** edição de ativos já cadastrados; ao salvar, o lançamento de aplicação vinculado é atualizado junto ou removido se o débito for desativado.
- **Lançamentos:** seleção de conta diretamente no formulário e divisão do pagamento em duas ou mais contas, com valores individuais e validação do total antes de salvar.
- **Cartões:** edição de compras, recálculo das parcelas e formulário de pagamento de fatura sem caixas de alerta; o pagamento aceita quantas contas forem necessárias.
- **Conciliação:** cada conta usada no pagamento da fatura recebe seu débito; o pagamento também aparece em Lançamentos como movimentação de transferência, sem duplicar a despesa original.

Essas melhorias usam as tabelas e colunas já presentes na versão Plus (`investments`, `transactions`, `card_purchases` e `account_transfers`). Não há uma nova migração SQL específica para esta atualização. Faça backup antes de substituir os arquivos publicados.


## Planos de assinatura
- **Gratuito (R$ 0):** painel, lançamentos, contas e parcelas, metas e configurações.
- **Premium (R$ 9,90/mês):** tudo do Gratuito + cartões de crédito, contas bancárias, veículos, hora extra e relatórios.
- **Completo (R$ 19,90/mês):** tudo do Premium + investimentos, planejamento futuro, Painel Plus, família e backup completo.

Instalação: execute `planos.sql` no Supabase (uma vez) e publique `planos.js` e `planos.css` com os demais arquivos.
Preços, textos e o que cada plano libera ficam no início de `planos.js`. Links de pagamento: `PLAN_CONFIG.checkout`.
Para liberar um plano manualmente, use o comando comentado no final de `planos.sql`.
