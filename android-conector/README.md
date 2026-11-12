# Salário Inteligente Conector (Android)

Aplicativo auxiliar Android para capturar notificações bancárias autorizadas pelo usuário e enviar movimentações identificadas ao Supabase do Salário Inteligente.

## Estado desta entrega

- Projeto Android nativo em Kotlin, pronto para abrir no Android Studio.
- Pareamento de uso único por código temporário gerado no site.
- Armazenamento do token do dispositivo no armazenamento privado do app.
- NotificationListenerService para notificações dos aplicativos bancários configurados.
- Parser inicial de valores e tipos de movimentação em português brasileiro.
- Envio dos campos extraídos para a Edge Function; texto bruto da notificação não é enviado.
- APK ainda precisa ser compilado, testado em aparelho real e assinado. Não publique o app como pronto antes dos testes.

## Configuração

1. Abra `android-conector` no Android Studio (JDK 17 recomendado; Android SDK 35).
2. Em `app/src/main/java/br/com/salariointeligente/connector/ConnectorConfig.kt`, substitua `COLE_A_CHAVE_ANON_PUBLICA_DO_SUPABASE` pela chave `anon`/publishable do projeto Supabase. É uma chave pública, nunca use `service_role` aqui.
3. Execute a migração `../supabase-bank-connector.sql` no SQL Editor do Supabase.
4. Publique a função `bank-connector` com `supabase functions deploy bank-connector`.
5. Configure os secrets padrão da função no projeto Supabase: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (o ambiente Supabase normalmente já os disponibiliza).
6. Acesse Integração bancária no site, gere um código e digite-o no app.
7. No app, toque em Ativar acesso às notificações e habilite Salário Inteligente Conector nas configurações do Android.
8. Gere uma notificação de transação de teste e confira os lançamentos no site.

## Gerar APK sem Android Studio (GitHub Actions)

O repositório inclui o workflow `.github/workflows/android-apk.yml`. Para gerar o APK sem instalar Android Studio no computador:

1. Envie esta pasta para o seu repositório GitHub, mantendo a pasta `.github/workflows/`.
2. No GitHub, abra a aba **Actions**.
3. Se necessário, habilite GitHub Actions para o repositório.
4. Selecione **Build Android APK** e clique em **Run workflow**. Também haverá compilação automática quando arquivos de `android-conector/` forem enviados por push.
5. Quando terminar, abra a execução concluída e baixe o artefato `salario-inteligente-conector-apk`.
6. Extraia o arquivo `salario-inteligente-conector-debug.apk` e instale no Android para testes.

**Importante:** esse workflow gera um APK de depuração, adequado para instalação e validação pessoal. Não publique esse APK como versão final para usuários. Para distribuir pelo site e permitir atualizações consistentes, será necessário configurar uma chave de assinatura de release protegida nos Secrets do GitHub e compilar uma versão `release`. Guarde essa chave e faça backup: atualizações futuras precisam da mesma assinatura.

O ambiente de compilação é fornecido pelo GitHub Actions; não é necessário instalar Android Studio nem Android SDK no seu Windows.

## Bancos e limitações

A lista de pacotes Android e as regras de texto estão em `BankEventParser.kt`. Os identificadores de pacote e formatos de notificação devem ser confirmados em cada aparelho. O Nubank é o primeiro alvo de validação; os demais adaptadores são experimentais e não devem ser anunciados como compatíveis até testes reais.

O conector não consulta saldo bancário, fatura completa ou investimentos. Ele só consegue importar transações que o banco efetivamente exponha em notificações legíveis. Se o Android ou o aplicativo bancário não entregar uma notificação, essa movimentação não será capturada.

## Segurança

- Não solicite credenciais bancárias, senhas, tokens ou códigos OTP.
- Não armazene nem envie o texto integral das notificações.
- Revogue dispositivos pelo painel Integração bancária.
- A Edge Function usa token aleatório por dispositivo e armazena somente seu hash.
- Revise a política de privacidade e obtenha consentimento explícito antes de distribuir a terceiros.
