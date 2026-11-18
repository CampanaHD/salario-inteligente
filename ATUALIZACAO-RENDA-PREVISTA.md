# Atualização — Renda prevista e planejamento inteligente

## O que foi incluído
- Cadastro de receitas futuras por fora (sites, sistemas, freelas e serviços), com descrição, valor, data prevista e observação opcional.
- Receitas previstas entram no fluxo de caixa como lançamentos pendentes, sem serem contabilizadas como dinheiro já recebido.
- Ações para marcar como recebido ou excluir uma previsão.
- Lembrete visual no Planejamento para receitas com data prevista vencida ou próxima. É um lembrete dentro do app; não envia push/e-mail.
- Projeção dos próximos seis meses combinando salário configurado, receitas previstas cadastradas, média histórica de horas extras, contas, parcelas e média de despesas pagas dos três meses anteriores.
- Simulador para informar horas extras adicionais e estimar quanto isso acrescentaria à renda, usando o valor da hora e adicional da aba Hora extra.
- Calculadoras da Central Financeira passam a iniciar com valores derivados do salário, despesas e receitas históricas, contas mensais, parcelas e reserva cadastrada. Os campos continuam editáveis.

## Banco de dados
Não exige SQL novo. As receitas previstas usam a tabela `transactions` já existente, com `kind='income'`, `is_paid=false`, categoria `Renda extra` e marcador interno nas observações. Ao confirmar o recebimento, o lançamento é atualizado para `is_paid=true`.

## Critérios da previsão
- A média de renda/despesa usa os três meses anteriores completos, incluindo meses sem movimentação.
- A média de horas extras considera os três meses anteriores; meses sem registro entram como zero.
- Para o mês atual, a projeção considera despesas já pagas e estima o restante pelo histórico. Para os meses seguintes, usa a média histórica de despesas.
- Compromissos cadastrados são considerados como piso da previsão de saídas, evitando somar a média histórica inteira com as mesmas contas novamente.
- Os valores são estimativas e devem ser conferidos com os lançamentos reais; não são consulta bancária nem garantia de recebimento.
