# Salário Inteligente — versão final de melhorias

## Arquivos
- `index.html` — interface e navegação agrupada.
- `styles.css` — layout responsivo, tema e relógio.
- `app.js` — funcionalidades e integração Supabase.
- `supabase.sql` — estrutura do banco e políticas RLS, incluindo investimentos.

## Instalação / atualização
1. Faça backup do projeto e do banco atual.
2. No Supabase, abra **SQL Editor** e execute o arquivo `supabase.sql` completo. Ele contém `CREATE TABLE IF NOT EXISTS` e políticas atualizadas; revise mensagens de erro antes de publicar.
3. Em `app.js`, preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` com a URL e a chave pública do projeto. Nunca use `service_role` no navegador.
4. Publique os quatro arquivos juntos em hospedagem HTTPS.
5. Teste com duas contas distintas: grupo familiar, compartilhamento de lançamentos, saída do grupo, investimentos e configurações.

## Melhorias desta versão
- Saudação automática (Bom dia / Boa tarde / Boa noite), data e relógio com segundos.
- Navegação organizada em Finanças, Compartilhamento e Conta.
- Aba Investimentos com cadastro, edição do registro via exclusão e valor total aplicado.
- Família: botão para sair do grupo; se o usuário for responsável, a ação encerra o grupo e remove vínculos de integrantes. Os lançamentos compartilhados permanecem no histórico.
- Mantém cartões e compras parceladas, abastecimento/veículos, planejamento, metas e relatórios.

## Sobre dados familiares
Os registros pessoais continuam privados. Para um lançamento aparecer a todos, use o livro financeiro da família ou a opção de compartilhar no cadastro. Contas antigas não são transferidas automaticamente; compartilhe-as pela tela da família. Se a tela continuar vazia, confira se todos os integrantes entraram no mesmo código de grupo e se o SQL foi executado sem erros.

## Limites
- Investimentos são valores informados manualmente; não há cotações ou sincronização com corretoras.
- O sistema não consulta saldos bancários.
- Antes de uso comercial, valide as políticas RLS com usuários separados e revise segurança, privacidade e backups.

## Versão Plus (plus.js + plus.css)
Não exige mudanças no banco. Publique `plus.js` e `plus.css` junto com os demais arquivos.
- **Painel Plus**: nota de saúde financeira (0–100), previsão de fim de mês, taxa de poupança, alertas (contas vencidas ou a vencer, orçamento estourado, gastos atípicos), categorias vs. mês anterior, gastos recorrentes detectados, regra 50/30/20 e reserva ideal.
- **Lançamento rápido**: digite `mercado 45,90` ou `+salário 5000` e a categoria é sugerida automaticamente.
- **Simulador de juros compostos**, **busca global** (Ctrl+K), **modo privacidade** (👁 oculta valores) e atalho **N** para novo lançamento.
- **Imprimir / salvar PDF** do painel.

## Veículos (veiculos.js + veiculos.css + supabase-veiculos.sql)
Execute `supabase-veiculos.sql` no Supabase. A aba Abastecimento virou **Veículos**: resumo com avisos de troca vencida ou próxima, histórico unificado (abastecimentos, manutenções, despesas), plano de manutenção, análises com gráficos e cadastro de frota.

## Abas PRO (abas.js)
Lançamentos (filtros, busca, CSV, gráficos), Contas (calendário de vencimentos, alertas), Metas (valor mensal necessário), Investimentos (distribuição e evolução) e Cartões (uso do limite e faturas projetadas). Sem mudanças no banco.

## Abas PRO 2 (abas2.js)
Início (atalhos, fluxo 6 meses, vencimentos), Planejamento (projeção de saldo e simulador de corte de gastos), Relatórios (dia da semana, comparativo 3 meses, CSV anual, PDF), Família (indicadores do grupo) e Configurações (modo compacto, lembretes de contas).

## Contas bancárias (contas.js + supabase-contas.sql)
Execute `supabase-contas.sql`. Cadastre bancos com 1 toque (Nubank, Santander, Itaú…), escolha conta e forma de pagamento ao lançar (lembra a última usada), saldo calculado automaticamente, crédito separado como fatura a pagar e ajuste de saldo pelo valor real do banco.

## Etapa 2 de contas (supabase-contas2.sql)
Transferência entre contas (não entra em receitas/despesas), pagamento de fatura (baixa o saldo sem duplicar a despesa) e escolha do cartão de crédito ao lançar com forma de pagamento “Crédito”.
