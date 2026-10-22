# Duet no Render: Firebase direto e notificações sem cron pago

O envio usa Firebase Cloud Messaging HTTP v1 diretamente, com uma conta de serviço do projeto dos responsáveis pelo Duet. GitHub Actions chama o servidor Render periodicamente. A configuração preserva banco, contas, mensagens, fotos e preferências existentes; não exige SQL nem cria serviços pagos.

**Pendências de ativação:** é necessário configurar as credenciais Firebase no Render, recompilar o frontend com os dados públicos do mesmo projeto, cadastrar o segredo de cron no GitHub e inscrever cada aparelho. A integração atual não tem permissão para gravar repository secrets/variables (HTTP 403); essa etapa cabe a quem administra o repositório. Código e workflow preparados não confirmam entrega no celular.

## 1. Conta de serviço no Render

No [console Firebase](https://console.firebase.google.com/), selecione o projeto próprio do Duet. Em **Configurações do projeto → Cloud Messaging**, confira que a API Firebase Cloud Messaging HTTP v1 está habilitada. Em **Contas de serviço → Firebase Admin SDK → Gerar nova chave privada**, obtenha o JSON. Se faltar acesso à API ou à geração de chaves, uma pessoa administradora precisa autorizar essa etapa. A permissão de envio é `cloudmessaging.messages.create` (papel Firebase Cloud Messaging API Admin). O FCM não exige contratar o plano Blaze para enviar estes avisos Web.

No iPhone, se o console esconder essas abas, use **Safari → menu da página → Solicitar Site para Computador**. Guarde o JSON no app Arquivos e transfira seu conteúdo diretamente para o Secret File do Render; não envie o arquivo nesta conversa.

Em **Render → danlet → Environment → Secret Files**, crie o arquivo `firebase-service-account.json` com o JSON integral da conta. Configure a variável de servidor:

```text
FIREBASE_SERVICE_ACCOUNT_FILE=/etc/secrets/firebase-service-account.json
```

O JSON e a chave privada ficam somente no Render. Não os coloque no Git, nos logs, em capturas de tela, no GitHub ou em variáveis `VITE_*`.

Alternativas já suportadas: `FIREBASE_SERVICE_ACCOUNT_JSON` com o JSON integral, ou as três variáveis `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. Use um único esquema. A precedência é JSON em variável → arquivo → variáveis separadas; um esquema incompleto ou inválido não deve ficar configurado junto ao escolhido. `GOOGLE_APPLICATION_CREDENTIALS` também pode apontar para o arquivo se `FIREBASE_SERVICE_ACCOUNT_FILE` estiver ausente.

Mantenha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do backend existente. A service role deve permanecer somente no servidor.

## 2. Configuração pública do aplicativo Web

No **mesmo projeto Firebase** da conta de serviço, registre ou selecione o aplicativo Web e a chave Web Push VAPID. Configure os cinco campos públicos em **Render → Environment**:

| Variável de build | Origem |
|---|---|
| `VITE_FIREBASE_API_KEY` | Configuração pública do aplicativo Web |
| `VITE_FIREBASE_PROJECT_ID` | ID do mesmo projeto Firebase |
| `VITE_FIREBASE_APP_ID` | ID do aplicativo Web |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID da configuração Web |
| `VITE_FIREBASE_VAPID_KEY` | Chave pública Web Push desse projeto |

Esses campos são públicos; não substituem a credencial privada do servidor. Preencha o conjunto completo: o cliente seleciona a configuração própria quando qualquer campo `VITE_FIREBASE_*` está presente, sem misturar projetos com os nomes legados do conector.

Faça **novo build e deploy** após mudar qualquer `VITE_*`: reiniciar o servidor não recompila esses valores no navegador. Confirme também `PUBLIC_APP_URL` ou `RENDER_EXTERNAL_URL` para que a notificação abra o endereço atual do Duet. Depois, reinscreva os aparelhos; tokens do projeto Firebase anterior não se transferem automaticamente. Nenhuma mensagem ou foto do casal é removida nessa operação.

## 3. Segredo e agendamento no GitHub

1. Em **Render → danlet → Environment**, crie `DUET_CRON_SECRET` com um valor aleatório longo e privado.
2. Em **GitHub → Settings → Secrets and variables → Actions → Repository secrets**, crie `DUET_CRON_SECRET` com **exatamente o mesmo valor**. Não envie o valor pelo chat.
3. Opcionalmente configure a repository variable `DUET_CRON_ENDPOINT` com o domínio HTTPS do serviço. O padrão é `https://danlet.onrender.com`.
4. Em **Actions → Duet notifications scheduler**, use **Run workflow** depois do deploy. Se o segredo estiver ausente, a execução registra **Pending setup** no aviso e no resumo, sem chamar o servidor. Isso não confirma envio.

O servidor aceita os nomes legados `LOVABLE_CRON_SECRET` e `LOVABLE_CRON_SECRET_PREVIOUS` somente enquanto `DUET_CRON_SECRET` estiver ausente ou vazio. Quando o nome canônico estiver definido, somente ele e `DUET_CRON_SECRET_PREVIOUS` serão aceitos. Durante rotação, mantenha temporariamente a chave anterior em `DUET_CRON_SECRET_PREVIOUS`, atualize o GitHub e depois remova a anterior. Nenhum desses nomes exige conta Lovable.

O workflow usa `2-59/5 * * * *`: a cada cinco minutos, nos minutos 2, 7, 12, …, 57 em UTC. A execução evita o minuto zero e usa concurrency para impedir duas execuções simultâneas. Não necessita permissões de acesso ao conteúdo do repositório. Chama dois endpoints autenticados, sem imprimir respostas privadas:

- `/api/public/jobs/partner-notifications`: processa eventos pendentes. A fila existente descarta eventos com mais de dez minutos; uma execução por hora não atendia esse prazo.
- `/api/public/jobs/inspire`: até **três** lembretes carinhosos por dia, em horários diurnos de São Paulo; chaves idempotentes existentes evitam repetir os lembretes a cada execução.

GitHub Actions pode atrasar ou deixar de executar um horário, e Render Free pode precisar acordar de hibernação. O intervalo de cinco minutos reduz a espera, mas não garante entrega antes do prazo de dez minutos. Não houve alteração no prazo da fila nem contratação de cron pago; as cotas gratuitas da conta continuam aplicáveis.

O repositório é público e o workflow usa runner padrão do GitHub. No Render, as **750 horas gratuitas mensais são compartilhadas por todos os serviços Web Free do workspace**. Chamadas a cada cinco minutos tendem a manter o Danlet ativo, consumindo aproximadamente 720–744 horas por mês; outros serviços também consomem essa cota. Ao esgotá-la, os serviços Free ficam suspensos até o mês seguinte. Isso não cria um plano pago, mas pode interromper o app. Consulte [os limites oficiais do Render Free](https://render.com/docs/free) antes de ativar a rotina.

## 4. Ativar e conferir em cada celular

1. No iPhone, use **iOS/iPadOS 16.4 ou superior**. Abra o endereço HTTPS atual do Duet no Safari e escolha **Compartilhar → Adicionar à Tela de Início**.
2. Abra o Duet pelo ícone instalado, entre na conta e **toque** no botão de ativar notificações. A solicitação de permissão precisa partir desse gesto; abrir uma aba ou receber uma mensagem não concede a permissão.
3. Autorize o envio e confira as preferências individuais. Repita no aparelho de Daniel e no de Letícia. No Android, abra o site HTTPS/app e ative pelo mesmo botão.
4. Envie uma mensagem de uma conta à outra e confira o recebimento com o app destinatário em segundo plano. Depois teste **Run workflow** e a execução agendada; confira o recebimento real, além do status da ação.

Se aparecer falta de configuração, revise os cinco campos públicos e o novo build. Se houver recusa no envio, confira o projeto e as credenciais privadas no Render sem compartilhar seus valores. Se o cron retornar 401, confira a igualdade entre os segredos Render/GitHub. Preserve as preferências de cada pessoa: notificações desativadas no app ou no sistema não devem ser contornadas.
