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
