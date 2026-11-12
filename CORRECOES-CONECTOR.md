# Correções do Conector Android — beta.2

## O que foi corrigido

- O listener agora registra separadamente notificações novas (`onNotificationPosted`) e notificações que já estavam visíveis quando o serviço se conecta (`activeNotifications`).
- A leitura considera título, texto, texto expandido, subtítulo, linhas agrupadas, ticker e mensagens do formato MessagingStyle.
- O parser ficou menos dependente da ordem das palavras e aceita espaço não separável antes do valor em reais.
- A tela do Android mostra se o acesso às notificações está autorizado, quantas notificações chegaram, quantas movimentações foram identificadas e qual foi o último pacote que notificou.
- A lista de dispositivos usa delegação de eventos, então os botões de desconexão continuam funcionando mesmo depois que os registros são carregados de forma assíncrona.
- Foi incluída a opção de desconectar todos os dispositivos ativos da conta.
- A desconexão confirma que o registro foi realmente atualizado no Supabase e informa quando nenhum registro foi alterado.

## Como aplicar

1. Publique no GitHub os arquivos atualizados `app.js` e `banking.css` para corrigir a tela do site.
2. Execute o workflow **Build Android APK** em Actions para gerar o novo APK (versão beta.2).
3. Instale o APK atualizado no Android. Se o Android informar conflito de assinatura, desinstale a versão beta anterior e instale a nova; nesse caso, será necessário parear o aparelho novamente pelo site.
4. No Android, abra o Conector e confira `Acesso às notificações: AUTORIZADO`.
5. Faça um Pix de teste. Volte ao Conector e confira se o contador `Notificações recebidas` aumentou e se `Movimentações identificadas` também aumentou.

## Como interpretar o teste

- **Nenhum contador aumentou:** o Android não entregou uma notificação ao listener. Confira se as notificações do Nubank estão habilitadas (inclusive as categorias de Pix) e se o Android não restringiu o app em segundo plano.
- **Notificações recebidas aumentou, mas movimentações identificadas não:** o listener recebeu algo do aparelho, mas o pacote/texto/valor não correspondeu às regras do parser. O Logcat usa a tag `SI_CONNECTOR` e não imprime o texto bancário integral.
- **Movimentações identificadas aumentou, mas o lançamento não apareceu no site:** confira conexão com internet, token ativo e execução/publicação da Edge Function `bank-connector`.

## Banco de dados

Não há alteração de esquema nesta correção. A migração `supabase-bank-connector.sql` já existente continua sendo a necessária; não precisa executá-la novamente se já foi aplicada.

## Limites

A integração continua sendo baseada em notificações Android, não em Open Finance. Ela só pode importar movimentações que o aplicativo do banco realmente notificar e que tenham valor e direção legíveis. Não consulta extrato completo, saldo, fatura integral ou investimentos.
