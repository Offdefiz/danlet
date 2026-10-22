# Duet: conclusão de push sem o Lovable

A autenticação do agendador foi corrigida: GitHub Actions envia um token OIDC temporário, e o Render valida a assinatura, repositório, branch, workflow e audiência. Não é necessário adicionar `DUET_CRON_SECRET` no GitHub ou definir uma senha de cron no iPhone.

## Resultado real do diagnóstico (22/10/2026)

O POST protegido `/api/public/jobs/status`, chamado pelo GitHub Actions, devolveu **HTTP 200** e mostrou:
- `supabaseAdminConfigured: false`
- `supabaseReachable: false`
- `firebaseConfigured: false`
- `firebaseAuthenticated: false`
- `registeredDevices: null` (impossível consultar sem chave do Supabase)

**Isso não significa que o banco deixou de funcionar para o login**, nem que o Firebase não foi criado. Significa que **as credenciais privadas para a função de envio não estão disponíveis no servidor Render**. Não confundir config web `VITE_FIREBASE_*`, que é pública, com conta de serviço FCM HTTP v1, que deve ficar protegida.

## Como concluir sem enviar segredos ao chat

1. No **projeto Firebase que pertence ao Duet**, abra configurações do projeto → **Contas de serviço**. Gere ou identifique a conta de serviço destinada a enviar mensagens pelo Firebase Cloud Messaging API (HTTP v1). Salve a credencial JSON **somente no Render**, como `FIREBASE_SERVICE_ACCOUNT_JSON`, ou o arquivo de segredo com `FIREBASE_SERVICE_ACCOUNT_FILE`. Configure também as variáveis públicas de build `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID` e `VITE_FIREBASE_VAPID_KEY` caso ainda não estejam presentes.
2. No **projeto Supabase real do Duet**, identifique uma chave administrativa `service_role` legada ou uma chave de servidor `sb_secret_*` com permissões equivalentes. Salve **somente no Render** sob `SUPABASE_SERVICE_ROLE_KEY`. Preserve `SUPABASE_URL` e as chaves publicáveis existentes, sem criar outro projeto nem migrar dados às cegas. A conta Supabase conectada neste chat não lista esse projeto, portanto não foi possível obtê-la automaticamente.
3. Deixe o Render concluir o deploy após as alterações. O workflow do GitHub repetirá o POST de status a cada 20 minutos no período de 9h–22h de Brasília e executará entrega da fila e surpresas somente quando os dois serviços estiverem configurados. Status ausente aparece como falha explícita, nunca sucesso silencioso.
4. Após passar no status, instale `https://danlet.onrender.com` na **Tela de Início** de cada iPhone via Safari, entre nas respectivas contas, autorize notificações pelo Duet e inscreva novamente os dispositivos caso o projeto Firebase tenha mudado.
5. Teste uma mensagem do Daniel para Letícia e outra da Letícia para Daniel com os dois PWAs fechados. Confirmar a entrega real requer os aparelhos e permissão do iOS. `registeredDevices > 0` apenas comprova a inscrição, não a exibição no iPhone.

## Comportamento do aplicativo

- 37 surpresinhas românticas e engraçadas, distintas das perguntas da aba Juntos, sem IA, cobrança ou criação de evento falso.
- A automação verifica a cada 20 minutos, mas **no máximo cinco avisos proativos por pessoa/dia**, entre 9h e 22h (horário de Brasília), além de avisos gerados por interações reais.
- Perguntas do fim de semana são distribuídas a partir de quarta-feira. Respostas já registradas na agenda deixam de receber pedido repetido para a mesma pessoa/data.
- Check-ins rápidos de água aparecem como mensagem com reação divertida para o par sem expor conteúdo de chats normais.
- Qualquer pessoa pode desativar notificações no aplicativo. Não criar serviço pago nem reintroduzir dependência do Lovable.
