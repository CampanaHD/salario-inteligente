# Atualização beta.3: download direto pelo site

## O que mudou
- **Site (aba Integração bancária):** botão real "Baixar aplicativo (APK)", com versão, tamanho e data; passo a passo de instalação e ajuda para "configuração restrita"; visual renovado (segue o tema/paleta escolhidos).
- **Workflow `Build Android APK`:** agora compila um APK **assinado (release)** e o publica sozinho em `downloads/salario-inteligente-conector.apk`, junto com `downloads/conector.json` (versão, tamanho, SHA-256). O botão do site lê esse arquivo.
- **App Android:** tela nova e guiada; botão "Ativar notificações" abre direto a tela do serviço; quando o Android 13+ bloqueia a chave, o app mostra o caminho para liberar e um botão "Abrir informações do app".
- **Assinatura fixa:** todo APK sai com o mesmo certificado, então as próximas versões atualizam por cima, sem desinstalar.
- `sw.js` não guarda mais o APK em cache.

## Como publicar
1. Envie ao GitHub todos os arquivos (inclui `app.js`, `banking.css`, `sw.js`, `.github/`, `android-conector/` e `ATUALIZACAO-DOWNLOAD.md`).
2. Em **Actions > Build Android APK > Run workflow**. Ao terminar, o próprio workflow grava a pasta `downloads/` no repositório.
3. Quando o site for republicado a partir do repositório, o botão fica ativo.
4. Se o workflow falhar ao gravar, confira em **Settings > Actions > General > Workflow permissions** se está em *Read and write permissions*.

## Primeira instalação da beta.3
Como as versões anteriores foram assinadas com outra chave (debug), o Android vai recusar a atualização por cima: desinstale a beta anterior e instale a nova. Será preciso parear de novo. Daqui em diante, atualiza normalmente.

## Sobre "configurações restritas" (Android 13+)
É uma trava do próprio sistema para apps instalados fora da loja; site e app não conseguem desligá-la. O app só deixa o caminho curto (ele aparece na tela do app e na página do site). Para eliminar esse passo é preciso distribuir pela Play Store (por exemplo, teste fechado).

## Segurança da chave
`android-conector/app/beta.keystore` é uma chave de **teste pessoal**, com senha dentro do `build.gradle`. Se o repositório for público, qualquer pessoa pode assinar um APK com a mesma identidade. Para distribuir a outras pessoas, gere sua própria chave e cadastre os secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD` (o workflow já os usa automaticamente) e guarde a chave com backup.

---

# beta.4: diagnóstico de captura

## O que mudou
- **Tela de situação do app** agora mostra: quantas movimentações aguardam envio, o resultado do último envio ao site (com a mensagem de erro, se houver) e o que aconteceu com a última notificação **de banco** ("reconhecida como ENTRADA", "não reconhecida: sem valor em reais" etc.). O texto da notificação continua não sendo guardado nem enviado.
- **Parser** reconhece mais formas de Pix recebido ("te enviou", "te transferiu", "transferiu R$ ... para você", "caiu na sua conta") e passa a tratar "você enviou", "Pix enviado" e similares sempre como saída.
- Botões novos: **Enviar pendentes agora** e **Evitar que o Android pause o app** (otimização de bateria).
- O app pede ao Android para religar o leitor de notificações ao abrir, caso ele tenha sido encerrado.

## Como ler a tela
- **Nenhuma notificação de banco chegou:** o Android não entregou o aviso ao app. Confira se as notificações do Nubank estão ligadas e use "Evitar que o Android pause o app".
- **Não reconhecida: ...:** o texto do banco não bateu com as regras. O motivo aparece na tela; mande esse motivo e o texto do aviso (print) para ajustar o parser.
- **Reconhecida, mas "Aguardando envio" > 0 ou "Último envio FALHOU":** o problema está no envio. A mensagem de erro mostra se é internet, dispositivo revogado ou função não publicada.
