# Duet — implantação independente e plano de baixo custo

## Arquitetura atual

- **Interface e servidor**: GitHub `Offdefiz/danlet` -> Render `danlet` (`https://danlet.onrender.com`), deploy automático da branch `main`.
- **Banco e autenticação**: Supabase `*.supabase.co` — independente do Lovable. Mantido por preservar usuários, senhas, votos, mensagens, fotos e segurança RLS. Nenhuma migração destrutiva.
- **Músicas**: iTunes Search API diretamente, gratuita, sem cadastro e sem gateway Lovable. Resultados abrem no Apple Music; links do YouTube salvos anteriormente permanecem.
- **Buscas de locais/Instagram**: Firecrawl REST direto **opcional**. Chave gerida pelo responsável pelo app em `FIRECRAWL_API_KEY` (Render); sem chave, escolha e cadastro manual continuam funcionando.
- **Push**: Firebase Cloud Messaging (FCM) HTTP v1 direto, sem Lovable. O projeto Firebase e a conta de serviço precisam pertencer aos responsáveis pelo Duet.
- **Cron**: GitHub Actions roda a cada hora, sob limites gratuitos aplicáveis, usando segredo compartilhado com o Render. Um cron pago não foi provisionado.
- **Calendário**: agenda interna no Supabase e exportação Apple .ics/Google; não é sincronização bidirecional automática.
- **Build**: pacote `@lovable.dev/vite-tanstack-config` ainda utilizado como dependência de desenvolvimento do Vite. Não é gateway de runtime, mas será possível removê-lo em uma atualização de build separada com testes completos.

## Configuração segura no Render

Em **Render → danlet → Environment**, confira as variáveis, sem compartilhar valores de segredo em prints ou chats:

| Chave | Finalidade |
|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Login e backend no servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Administrador restrito aos handlers server-side, nunca como variável VITE_ |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Configuração pública compilada no frontend (já existe no código) |
| `PUBLIC_APP_URL` | Opcional; por padrão usa `RENDER_EXTERNAL_URL` |
| `FIRECRAWL_API_KEY` | Opcional: busca automática de inspirações e metadados |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Opcional até Firebase próprio estar pronto; JSON integral da conta de serviço, **somente no Render** |
| `LOVABLE_CRON_SECRET` | Segredo do cron existente; apesar do nome legado, não exige conta Lovable |

Alternativa à conta Firebase em JSON: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (salvas como segredo apenas no Render). Não defina os dois esquemas ao mesmo tempo.

### Criar Firebase próprio

1. Acesse o console Firebase com a conta administradora do app e crie/selecione um projeto próprio. Habilite o Cloud Messaging (API HTTP v1).
2. Adicione um aplicativo **Web**, gere ou registre a chave Web Push VAPID em Cloud Messaging, e copie **somente a configuração pública** do cliente Web para as variáveis de **build** no Render:
   `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY`.
3. Gere uma conta de serviço com permissão de envio de mensagens Cloud Messaging e armazene o JSON como `FIREBASE_SERVICE_ACCOUNT_JSON` no Render. **Nunca coloque JSON, chave privada, SERVICE_ROLE ou token no GitHub nem nas variáveis `VITE_*`.**
4. Após deploy, abra o PWA no iPhone de Daniel e no de Letícia a partir de **https://danlet.onrender.com**, permita notificações pelo ícone instalado e execute nova inscrição. Tokens FCM pertencem ao projeto Firebase antigo e não migram automaticamente.
5. Teste as permissões no iOS, a fila de mensagens com ambas as contas e o acionamento horário. Até isso ser concluído, os lembretes só ficam preparados no código, **não há garantia de envio**.

### Cron no GitHub

Em **Settings → Secrets and variables → Actions** do repositório, cadastre `DUET_CRON_SECRET` com o MESMO valor que `LOVABLE_CRON_SECRET` no Render. O workflow `Duet notifications scheduler` chama os dois jobs a cada hora. Um cron agendado pode sofrer atraso pelo GitHub e um servidor Render Free pode sofrer cold-start.

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
