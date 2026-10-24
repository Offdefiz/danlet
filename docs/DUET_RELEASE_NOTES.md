# Política de atualizações visíveis do Duet

O histórico do próprio app é definido em `src/lib/release-notes.ts`. A tela **Novidades do Duet** lê essa fonte e pode ser aberta na tela inicial, no perfil ou no menu da conta. A versão mais recente aparece primeiro.

## Para publicar alterações

1. Cada alteração voltada ao usuário (funcionalidade, bug, tema, interface) deve acrescentar uma entrada com versão, data e descrição em `src/lib/release-notes.ts`; preserve o histórico anterior.
2. O fluxo de CI verifica se o arquivo foi atualizado nos pull requests que modificam `src/` ou `public/`. Mudanças apenas em documentação não exigem patch.
3. Faça testes de código, compilação e deploy antes de considerar a versão disponível.
4. Nunca inclua conteúdo privado de mensagens, senhas, tokens ou nomes técnicos de dispositivos nos patch notes.

## Lançamento 2.5.0 — 23/10/2026

- Notificações push de mensagens com o nome do parceiro e prévia de até 200 caracteres; a visualização na tela bloqueada depende das configurações do iOS. **A plataforma ainda pode mostrar “From Duet”**, pois isso é o nome do app remetente.
- Envio explícito após cada resposta relevante do Juntos. Uma proposta só entra na Agenda quando os dois aceitam.
- Barbie Glitter, Metallic Purple (lilás cromado), Black Diamond e Champagne Gold no topo da galeria Premium. Elegantes e Simples abaixo.
- Perfil maior, fotos de avatar compactadas a 720px, cache temporário dos links assinados, e alvos de toque de aproximadamente 44px nos celulares.
- Histórico de mudanças sempre acessível no próprio Duet.

O serviço Firebase pode aceitar a entrega e o iPhone ainda agrupá-la ou silenciá-la. Valide o banner e o conteúdo com os dois celulares reais.


## Notificações automáticas de lançamento — v2.7.0 em diante

- `src/lib/release-notes.ts` é a fonte da versão e do conteúdo. Não basta alterar os textos: cada entrega visível precisa incluir uma **nova versão semântica**, validada no CI.
- A cada execução autenticada do agendador de ~20 minutos, `sendReleaseAnnouncements()` tenta enviar **uma push por versão e por integrante do casal** usando o Firebase. A marca de deduplicação é um UUID determinístico no `push_event_queue` do Supabase, criado em segurança pelo servidor, sem abrir endpoint público.
- Quem desabilitou as notificações não recebe esses envios; o iPhone ainda pode silenciar, agrupar ou não exibir uma notificação aceita pelo Firebase. O rótulo sistêmico “From Duet” continua sob controle do iOS.
- A push abre `/?duet_view=updates`. Depois do carregamento, aparece a mesma janela flutuante de novidades.
- **Primeiro acesso:** a janela mostra todo o resumo desde a migração para o novo Supabase (Juntos, notificações, chat, temas Premium, perfil, fotos e UX). As informações constam de `postMigrationHighlights`.
- **Atualizações seguintes:** são exibidas apenas as versões posteriores à última versão que aquela pessoa confirmou. A confirmação é gravada em `localStorage` sob `duet:updates:last-read:<user_id>`, separada por conta e dispositivo. “Mais tarde” não confirma a leitura, portanto a janela volta na próxima entrada no app.
- O histórico completo continua acessível a qualquer hora pelo menu, perfil e cartão da tela inicial. Se a pessoa abrir uma decisão urgente do Juntos por um link, essa decisão aparece primeiro e a janela automática não a interrompe.
- O anúncio no servidor não ocorre antes do deploy: `sendReleaseAnnouncements` é chamado pelo endpoint cron do Render quando a nova versão está em execução. Para validar imediatamente após liberar o Render, pode-se executar manualmente o workflow autenticado do GitHub.
- Em caso de falha no envio ou ausência de dispositivo registrado, o marcador pode ser liberado para tentar novamente. Como o Firebase não fornece confirmação de exibição no iPhone, é necessário verificar o recebimento nos aparelhos.

## Resumo especial de migração

A versão 2.7.0 inaugura o primeiro tour completo com as funções desenvolvidas após a migração de banco do Duet: acordos de dois votos para planos, reenvio e histórico do Juntos, sugestões e push, chat com prévias e avisos, presença online, temas Premium animados, perfil, fotos otimizadas, som e navegação com dock flutuante.
