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
