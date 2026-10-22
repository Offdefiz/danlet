# Duet — implantação independente e plano de baixo custo

## Arquitetura atual

- **Interface e servidor**: GitHub `Offdefiz/danlet` -> Render `danlet` (`https://danlet.onrender.com`), deploy automático da branch `main`.
- **Banco e autenticação**: Supabase `*.supabase.co` — independente do Lovable. Mantido por preservar usuários, senhas, votos, mensagens, fotos e segurança RLS. Nenhuma migração destrutiva.
- **Músicas**: iTunes Search API diretamente, gratuita, sem cadastro e sem gateway Lovable. Resultados abrem no Apple Music; links do YouTube salvos anteriormente permanecem.
- **Buscas de locais/Instagram**: Firecrawl REST direto **opcional**. Chave gerida pelo responsável pelo app em `FIRECRAWL_API_KEY` (Render); sem chave, escolha e cadastro manual continuam funcionando.
- **Push**: Firebase Cloud Messaging (FCM) HTTP v1 direto, sem Lovable. O projeto Firebase e a conta de serviço precisam pertencer aos responsáveis pelo Duet.
- **Cron**: GitHub Actions está preparado para chamar os jobs a cada cinco minutos, sob limites gratuitos aplicáveis, usando segredo compartilhado com o Render. A ativação depende do repository secret; um cron pago não foi provisionado.
- **Calendário**: agenda interna no Supabase e exportação Apple .ics/Google; não é sincronização bidirecional automática.
- **Build**: TanStack Start + Vite + Nitro oficiais, sem o wrapper `@lovable.dev/vite-tanstack-config` e sem dependência de build do Lovable.

## Configuração segura no Render

Em **Render → danlet → Environment**, confira as variáveis, sem compartilhar valores de segredo em prints ou chats:

| Chave | Finalidade |
|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Login e backend no servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Administrador restrito aos handlers server-side, nunca como variável VITE_ |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Configuração pública compilada no frontend (já existe no código) |
| `PUBLIC_APP_URL` | Opcional; por padrão usa `RENDER_EXTERNAL_URL` |
| `FIRECRAWL_API_KEY` | Opcional: busca automática de inspirações e metadados |
| `FIREBASE_SERVICE_ACCOUNT_FILE` | Caminho do secret file no Render: `/etc/secrets/firebase-service-account.json` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Alternativa ao arquivo: JSON integral da conta de serviço, **somente no Render** |
| `DUET_CRON_SECRET` | Segredo do cron; deve coincidir exatamente com o repository secret homônimo no GitHub |
| `DUET_CRON_SECRET_PREVIOUS` | Opcional e temporário, para rotação do segredo de cron |

No Render, crie o secret file `firebase-service-account.json` e defina `FIREBASE_SERVICE_ACCOUNT_FILE=/etc/secrets/firebase-service-account.json`. Alternativas existentes: `FIREBASE_SERVICE_ACCOUNT_JSON` ou o conjunto `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (salvos como segredo somente no Render). Configure um único esquema; o servidor prioriza JSON em variável, depois arquivo e depois variáveis separadas. Não deixe credenciais incompletas ou de outro projeto em um esquema de maior prioridade.

### Criar Firebase próprio

1. Acesse o console Firebase com a conta administradora do app e crie/selecione um projeto próprio. Habilite o Cloud Messaging (API HTTP v1).
2. Adicione um aplicativo **Web** no mesmo projeto da conta de serviço, gere ou registre a chave Web Push VAPID desse projeto em Cloud Messaging, e copie **somente a configuração pública** do cliente Web para as cinco variáveis de **build** no Render:
   `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY`.
3. Gere uma conta de serviço com permissão de envio de mensagens Cloud Messaging e salve-a como secret file conforme acima. **Nunca coloque JSON, chave privada, SERVICE_ROLE ou token no GitHub nem nas variáveis `VITE_*`.**
4. Faça **novo build e deploy** após qualquer alteração nos cinco campos `VITE_FIREBASE_*`. Reiniciar o servidor não atualiza os valores já compilados no frontend. Abra o PWA no iPhone de Daniel e no de Letícia a partir de **https://danlet.onrender.com**, usando iOS/iPadOS **16.4 ou superior** e **Compartilhar → Adicionar à Tela de Início**. Abra pelo ícone instalado e toque no botão de ativar notificações para conceder a permissão. Tokens FCM pertencem ao projeto Firebase antigo e não migram automaticamente; cada aparelho precisa ser reinscrito.
5. Teste as permissões no iOS, a fila de mensagens com ambas as contas e o acionamento agendado. Até isso ser concluído, os lembretes só ficam preparados no código, **não há garantia de envio**. O passo a passo e os diagnósticos estão em [DUET_RENDER_NOTIFICATIONS.md](./DUET_RENDER_NOTIFICATIONS.md).

### Cron no GitHub

Em **Settings → Secrets and variables → Actions** do repositório, cadastre o repository secret `DUET_CRON_SECRET` com o MESMO valor que `DUET_CRON_SECRET` no Render. Essa configuração permanece pendente: a integração atual retorna HTTP 403 ao tentar administrar secrets/variables, portanto quem administra o repositório precisa concluí-la pela interface. O workflow registra **Pending setup** quando o segredo está ausente e não chama os endpoints.

O servidor mantém compatibilidade com `LOVABLE_CRON_SECRET`/`LOVABLE_CRON_SECRET_PREVIOUS` somente se `DUET_CRON_SECRET` não estiver configurado. Após a migração, use `DUET_CRON_SECRET_PREVIOUS` para rotação; os nomes legados deixam de autorizar chamadas e não exigem uma conta Lovable.

O workflow `Duet notifications scheduler` chama os dois jobs a cada cinco minutos (`2-59/5 * * * *`, UTC), com concurrency e sem permissões de leitura/escrita ao repositório. O intervalo anterior de uma hora excedia o prazo de dez minutos dos eventos na fila existente. Os lembretes diurnos continuam limitados a três por dia pelas chaves idempotentes. Um agendamento pode atrasar ou não rodar pelo GitHub e um servidor Render Free pode sofrer cold-start; portanto nem o prazo nem a entrega no celular são garantidos. Nenhum serviço pago foi criado e nenhuma tabela ou dado existente precisa ser migrado para este ajuste.

## Custos e decisão sobre o banco

**Não criar Postgres Free no Render para o banco principal.** A documentação atual do Render informa que bancos gratuitos expiram em 30 dias e são eliminados após o prazo de tolerância, sem backups gerenciados. Essa opção põe os dados e fotos do casal em risco. Manter Supabase no estágio de protótipo é mais seguro e normalmente mais econômico do que copiar para um banco Render pago sem necessidade. Antes da comercialização, rever cotas, backups, taxas de rede, disponibilidade e isolamento dos dados entre casais.

O Render Web Free hiberna quando inativo e pode demorar para acordar; isso atrapalha notificações pontuais e requisições rápidas. Se o produto for comercializado, avaliar plano pago e backups, mas **não promover automaticamente sem aprovação de gasto**.

## Fases para produto comercial

- Fase 1: acesso independente de Lovable, login, busca básica, agenda, notificações e rollback via Git.
- Fase 2: Firebase próprio, domínio, backup do Supabase, métricas e testes ponta-a-ponta em dois aparelhos.
- Fase 3: conta de usuário/casal generalizada (não nomes hardcoded), multi-tenant com políticas RLS, precificação, privacidade e renovação de assinatura.
- Fase 4: Google Calendar OAuth com consentimento explícito, sem credenciais compartilhadas nem acesso automático a agendas pessoais.

## Verificações de implantação

Após cada merge, confirme GitHub CI (testes, lint, TypeScript, build), Render deploy `live`, GET do endereço público, autenticação com conta de teste, inserção/edição/remoção de dados de teste, presença/chat e push com duas inscrições reais. Proteger dados pessoais. Em falha, não afirmar conclusão de um teste não realizado.

**Segurança**: `.env` do repositório contém configurações públicas (URLs e chaves publicáveis) e não deve receber nenhuma chave privada. Adicionar `.env.local` ao `.gitignore`; os segredos ficam no Render/GitHub Secrets.

## Dream Match — busca de locais e custos (22/10/2026)

- A busca automática passa pelo servidor do **Render**, chama diretamente a API Firecrawl v2 e exige `FIRECRAWL_API_KEY` **no Render**; nenhuma chave fica no navegador, GitHub ou Supabase.
- O Firecrawl tem plano gratuito de **1.000 créditos/mês** (sem cartão, conforme tabela pública consultada em 22/10/2026). Uma pesquisa com até dez resultados custa **2 créditos**; em tese até 500 pesquisas no mês se os créditos forem usados exclusivamente para esse tipo de busca. Scrapes de fotos/metadados e outras chamadas também consomem créditos. Cotas e preços podem mudar.
- Pesquisas públicas idênticas são armazenadas em cache no servidor por 15 minutos (até 100 entradas), economizando créditos. A busca não invoca LLM.
- A ordenação das descobertas consulta **curtidas do próprio casal** já disponíveis no Duet e prioriza características dos locais previamente aprovados, sem exigir um provedor externo de IA ou gravar dados novos.
- Em Tiradentes, se o Firecrawl não estiver configurado ou falhar, há três referências públicas identificadas (Alma Serra Vila, Espaço Raízes e Pousada Brisa da Serra) para consulta e inclusão manual. **Não são resultados novos, ranking de popularidade, confirmação de disponibilidade nem promessa de que aceitam eventos.**
- Fora de Tiradentes, enquanto faltar uma chave, a busca automática continuará indisponível; cadastrar referências por link/perfil permanece possível.
- Conectar o Firecrawl **ao ChatGPT** não fornece automaticamente a chave ao **Render**. A integração do plugin consegue fazer buscas nesta conversa, mas não pode transferir sua credencial privada para outro serviço.
- Para ativar a busca no aplicativo: autenticar uma conta administradora em https://www.firecrawl.dev/app/api-keys, criar/obter a chave privada e adicioná-la exclusivamente como `FIRECRAWL_API_KEY` em Render → serviço `danlet` → Environment. Manter o plano gratuito e não habilitar cobranças automáticas sem decisão expressa dos responsáveis.
- Após registrar a chave, publicar/reiniciar o serviço e validar com o usuário autenticado pesquisando `Tiradentes, MG`; validar também uma cidade que não possua sugestões previamente cadastradas para comprovar que a busca ao vivo realmente funciona.

A fonte confiável para planos, cotas e limites é a página https://www.firecrawl.dev/pricing. A documentação oficial do fallback sem chave informa limitações de rate limit e bloqueios de chamadas que parecem vir de VPN ou proxy; **não confiar no modo sem chave para produção**.
