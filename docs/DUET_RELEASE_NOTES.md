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
