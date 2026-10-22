# Duet — Juntos, som e notificações interativas

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

Os quatro horários locais de São Paulo são **9h–11h, 12h–14h, 15h–17h, 19h–21h**, com no máximo um aviso por usuário/janela. A implementação usa o mesmo registro de idempotência já existente, respeita preferências de push e não envia notificações de madrugada. O cron do GitHub consulta a cada hora, e os horários exatos podem atrasar.

**ATENÇÃO**: os alertas externos só chegam se `DUET_CRON_SECRET` no GitHub, `LOVABLE_CRON_SECRET` no Render, `SUPABASE_SERVICE_ROLE_KEY` e conta Firebase/FCM real estiverem configurados. O uso do nome legado da variável não cria uma dependência do Lovable. O GitHub Actions pode terminar em verde mesmo quando ignorar o envio por falta do segredo. Não considerar integração de push real validada sem um teste entre os dois aparelhos.

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
