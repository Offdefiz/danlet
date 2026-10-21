# Duet no Render: notificações periódicas sem cron pago

Os lembretes usam GitHub Actions uma vez por hora e o endpoint HTTPS autenticado do app no Render. O código do app **não garante entrega** até a configuração abaixo estar completa.

1. Na configuração do serviço **danlet** no Render, crie `LOVABLE_CRON_SECRET` com uma chave aleatória longa (não coloque no repositório).
2. No GitHub, em Settings → Secrets and variables → Actions → Repository secrets, crie `DUET_CRON_SECRET` com a **mesma** chave. A integração do GitHub disponível nesta conversa não grava repository secrets; isso precisa ser feito por quem administra o repositório.
3. Opcionalmente crie a variable `DUET_CRON_ENDPOINT` com o novo domínio Render/customizado. Na ausência dela, usa `https://danlet.onrender.com`.
4. Em Actions, selecione **Duet notifications scheduler** e use `Run workflow` para conferir a execução. Não envie senha ou token ao suporte.
5. Dentro do Duet instalado, autorize notificações em cada dispositivo. Para Apple iPhone, o PWA precisa estar instalado na Tela de Início e as permissões concedidas.
6. Verifique `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e as credenciais Firebase exigidas pelo servidor sem expor seus valores. O backend atual ainda usa algumas integrações do gateway Lovable e precisa de migração adicional para independência total.

A tarefa roda a cada hora (GitHub Actions pode atrasar) e chama dois endpoints:
- `/api/public/jobs/partner-notifications`: processa eventos de mensagens/ações pendentes.
- `/api/public/jobs/inspire`: até **3** lembretes carinhosos por dia em horários diurnos de São Paulo, sem duplicações graças às chaves idempotentes no banco.

O GitHub Actions é uma opção econômica sujeita às cotas da conta. Nenhuma compra de cron job do Render é feita por esta configuração. Notificações dependem das preferências individuais: cada pessoa pode desligá-las no app.
