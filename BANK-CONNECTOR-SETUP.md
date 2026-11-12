# Integração Bancária — Salário Inteligente

## Arquivos adicionados
- `banking.css`: interface responsiva da aba Integração bancária.
- `supabase-bank-connector.sql`: tabelas de pareamento, RLS e campos de idempotência nas transações.
- `supabase/functions/bank-connector/index.ts`: endpoint de pareamento e sincronização.
- `supabase/config.toml`: configuração de validação própria da Edge Function.
- `android-conector/`: projeto Android Kotlin.

## Ordem de instalação
1. Faça backup do banco Supabase.
2. Execute `supabase-bank-connector.sql` no SQL Editor.
3. Publique `supabase/functions/bank-connector` no projeto Supabase.
4. Abra `android-conector` no Android Studio e configure a chave anon pública em `ConnectorConfig.kt`.
5. Compile e assine o APK; teste primeiro com Nubank em aparelho real.
6. Publique o APK assinado no site em `downloads/salario-inteligente-conector.apk` e habilite o botão em `app.js`.

## Importante
Esta entrega adiciona a interface web, banco, função de backend e fonte Android. O APK binário ainda não foi gerado porque a compilação requer Android SDK/Android Studio e assinatura de release. O parser é inicial e precisa ser validado com notificações reais; os bancos adicionais estão mapeados como experimentais, não certificados.
