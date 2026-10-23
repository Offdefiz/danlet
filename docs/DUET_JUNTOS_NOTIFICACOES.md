# Duet — Juntos, som e notificações interativas

## Cadência atual — 20 minutos sem teto diário

**Atualizada em 23/10/2026:** o agendador opera aproximadamente a cada **20 minutos nas 24 horas do dia** (72 janelas diárias por pessoa), inclusive madrugada. Não há teto artificial por dia nem supressão por presença no app. Frases rotativas permitem surpresas diferentes a cada janela, e seis horários específicos do dia trazem sugestões de atividades que exigem dois “sim” antes de virar plano. Ainda há deduplicação por janela, opção individual para desligar push, dependência das permissões iOS e limites técnicos das plataformas. Os horários podem variar por atrasos do GitHub Actions.

**As referências abaixo a cinco ou doze envios e a horários exclusivamente diurnos são históricas e não representam mais a configuração atual.**

## Experiência
A barra inferior agora apresenta **Início / Dream Match / Juntos / Agenda / Mais**. O menu **Mais** mantém acessíveis as funcionalidades existentes: Planos e metas, Lista e anotações, Perfil e Adicionar. O cabeçalho permanece com conversa, sino, tutorial, tema e configurações.

A área **Juntos** contém quatro perguntas: jantar de sexta, passeio de sábado, domingo juntos e algo para lembrar. Quando uma pessoa informa uma ideia, data e horário e confirma, o aplicativo grava um compromisso em `public.records`, utilizando o formato da agenda compartilhada atual — sem novas tabelas.

Quando a pessoa escolhe **Ainda não sei**, **Sem planos ainda**, ou responde **Sim/Não** à pergunta sobre água, o aplicativo envia uma mensagem rápida à conversa compartilhada em vez de criar um evento indevido. A fila de avisos já existente pode avisar a outra pessoa sobre a nova mensagem, sujeito às credenciais Firebase e agendamento disponíveis.

## Sons e abertura
- **Abertura**: coração/logotipo e uma frase do casal; animação uma vez por sessão, desativada por `prefers-reduced-motion`; toque **Entrar** pode emitir som.
- **Dream Match**: tons de avaliação, confirmação e acorde mais marcante em caso de match mútuo.
- **Conversa**: tom discreto ao enviar com sucesso.
- **Agenda / planejamento**: tom de confirmação ao salvar.
- **Central de notificações**: som suave para novidades enquanto o aplicativo estiver aberto.
- **Juntos**: som curto ao abrir uma pergunta.
- Os sons são gerados no dispositivo com WebAudio, sem arquivos nem API, e podem ser silenciados na central de notificações. iOS requer gesto de usuário para ativação de áudio; sons do sistema de push não são personalizáveis por este PWA.

## Push com destino
O envio via Firebase passa um link HTTPS restrito ao domínio do próprio app. O clique na pergunta da sexta/sábado/domingo abre `/?duet_question=<id>&date=<YYYY-MM-DD>`; o check-in de água abre `/?duet_checkin=water`. O PWA reavalia esses links ao iniciar e ao recuperar foco.

## Surpresas, cadência e resposta

Além das perguntas da aba Juntos, o Duet tem uma coleção de **37 mensagens leves, fofas e engraçadinhas**. O texto é pré-escrito, muda por dia e por usuário e **não precisa de geração por IA nem registra tarefas**. Exemplo: “Boletim do Duet: hoje vale mandar um oi só porque sim.”

O GitHub Actions verifica o servidor a cada **20 minutos**, entre aproximadamente **9h e 22h em São Paulo**; o Render usa idempotência no banco para limitar os avisos proativos a **até cinco por dia por pessoa**. Este não é um limite para mensagens reais, matches ou atualizações do casal. O envio evita surpresas desnecessárias quando alguém esteve usando o aplicativo nos últimos 25 minutos. Não há avisos proativos de madrugada, e cada pessoa pode desligar notificações nas preferências.

Janelas para surpresa: **9h–11h, 12h–14h, 15h–17h, 18h–20h, 21h–22h**, horário de São Paulo. Não há garantia de minuto exato porque agendamentos do GitHub podem atrasar ou ser ignorados em picos de carga.

Planejamento: começa **quarta à noite** com uma proposta para sábado, **quinta/sexta pela manhã** sobre jantar, e continua sábado e domingo; sugestões já respondidas pela pessoa são substituídas por surpresas, evitando cobranças repetidas. Pergunta sobre água aparece em determinados almoços e a resposta rápida é enviada ao chat, não à agenda. Quando a resposta é um dos formatos rápidos conhecidos, a notificação enviada ao par pode apresentar uma frase contextual sem expor o texto de conversas comuns.

## Segurança do agendador e configuração

O servidor aceita **GitHub Actions OIDC** com JWT de curta duração assinado pelo GitHub, validando assinatura RSA, audiência exata, repositório, branch principal, arquivo do workflow e validade. **Não é necessário cadastrar `DUET_CRON_SECRET` no GitHub nem copiar qualquer senha do Render.** O código antigo com segredos permanece como compatibilidade temporária.

O GitHub chama `/api/public/jobs/status` (POST autenticado) para confirmar, sem revelar segredos:
- `supabaseAdminConfigured`: se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão presentes no Render;
- `supabaseReachable`: se a API Supabase permite consultar a tabela de tokens;
- `firebaseConfigured` e `firebaseAuthenticated`: conta de serviço Firebase definida e OAuth válido;
- `registeredDevices`: quantidade de inscrições, sem listar ou expor tokens.

**Mesmo que o Firebase tenha sido configurado no console, ele não envia ao PWA sozinho.** O Render precisa da credencial privada de envio FCM (em `FIREBASE_SERVICE_ACCOUNT_JSON` ou arquivo secreto equivalente) e de `SUPABASE_SERVICE_ROLE_KEY`. A configuração web `VITE_FIREBASE_*` e a inscrição Push também precisam estar completas.

### Último passo em cada iPhone (quando o servidor estiver pronto)

Abra `https://danlet.onrender.com` no Safari, escolha **Compartilhar → Adicionar à Tela de Início**, abra o ícone instalado, entre com a conta individual, acesse as preferências de notificações e toque para ativar o push. Aceite a permissão do iOS. Daniel e Letícia devem fazer isso **uma vez em cada iPhone**. Se o projeto Firebase mudou, reinscrever-se pode ser necessário.

**Limite da validação**: a verificação de status prova que os provedores estão configurados e que existem aparelhos registrados, mas não certifica que a notificação apareceu no iPhone de cada pessoa. Somente um teste com os dois dispositivos consegue confirmar isso.

## Checklist após deploy
1. Login das duas contas e barra inferior sem perda de Planos/Lista/Adicionar.
2. Responder sexta e confirmar que apareceu na Agenda; alterar a resposta, validar edição sem duplicar.
3. Escolher **Ainda não sei** e validar que há mensagem no chat, mas nenhum evento na agenda.
4. Usar check-in de água: resposta recebida pelo par no chat e, se push pronto, aviso no iPhone.
5. Abrir um link `/?duet_question=friday&date=2026-10-23` autenticado e conferir a pergunta/horário.
6. Testar sons com volume ativado e reduzido, modo silencioso e reduz movimento.
7. Testar Dream Match, voto, histórico, filtros, agenda, perfil, upload e notificações existentes.
8. Confirmar PR CI verde, Render live e depois validar os fluxos autenticados com as duas contas. Testes automatizados não equivalem a testes reais no iPhone.

## Busca de locais
A busca ao vivo permanece **Firecrawl API REST direto no Render**, sem Lovable. Ela exige `FIRECRAWL_API_KEY` no ambiente do serviço; o app preserva a lista de referência para Tiradentes se essa variável não existir. O crédito disponível na integração do ChatGPT não substitui a chave privada do serviço. Não ativar pagamento automático.
