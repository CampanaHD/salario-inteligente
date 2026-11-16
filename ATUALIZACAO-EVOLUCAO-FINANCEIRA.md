# Atualização — Evolução visual e financeira

## Melhorias visuais
- Novo acabamento global usando as variáveis de tema e paletas já existentes no aplicativo.
- Cartões, formulários, tabelas, botões e navegação com espaçamento, bordas, estados de foco e sombras mais consistentes.
- Central financeira com gráficos refinados, legenda aprimorada e gráfico de rosca para distribuição de despesas.
- Abas da Central com rolagem horizontal no celular e melhor adaptação responsiva.
- Cores semânticas de receitas (verde) e despesas (vermelho), inclusive no modo escuro.

## Novas funcionalidades
- Nova área **Orçamento** dentro da Central Financeira.
- Limites mensais por categoria, com valores gastos, percentual utilizado, saldo restante e aviso de limite excedido.
- Inclui categorias padrão, categorias personalizadas do perfil e categorias já encontradas nos lançamentos.
- Salva os limites em `profiles.category_budgets`, campo já utilizado pelos relatórios existentes.
- Nova calculadora **Essa compra cabe no orçamento?**, que estima dinheiro livre antes/depois de uma nova parcela e percentual de renda comprometida.
- Nova calculadora **Plano para quitar dívidas**, que estima prazo, total pago e juros com base no saldo, taxa mensal e pagamento.
- Atalho rápido para Orçamento, que pode ser reorganizado ou ocultado na personalização existente.

## Banco de dados
- Nenhuma migração SQL nova é necessária.
- A área de orçamento reutiliza `profiles.category_budgets`.
- Preferências de atalhos continuam no armazenamento local do navegador, conforme a versão anterior.

## Publicação
Substitua os arquivos pelo conteúdo deste pacote e publique normalmente no GitHub Pages.
O cache do service worker foi atualizado para `si-v3`, para evitar que o navegador mantenha os arquivos antigos.
