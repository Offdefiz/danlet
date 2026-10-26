# Duet Aurora Super | versão experimental v2
App alternativo ao Duet original, isolado na branch **duet-alternative-aurora-2026** e publicado em https://duet-aurora-alternativo.onrender.com.

## Para qual casal?
Para casais que desejam viver juntos e se casar: fortalece a relação **hoje** e organiza a vida que querem construir **amanhã**. Sem excessos de notificações ou gamificação artificial.

## O que funciona nesta versão (local-first)
- **Início:** dias juntos, próximos planos e memórias.
- **Explorar:** ideias de encontros, favoritos e escolhas; links para pesquisa externa no Instagram e Pinterest (sem importação ou scraping).
- **Futuro:** painel agregado de casamento, casa, orçamento e decisões.
- **Casamento:** data, orçamento, despesas por categoria, convidados e RSVP manual, checklist e sugestões de tarefas.
- **Casa:** meta financeira, reserva acumulada, contribuições manuais, checklist de mudança e planejamento.
- **Decisões a dois:** perguntas com duas opções e registro de cada voto *no mesmo aparelho*; comparação de consenso e divergências.
- **Memórias:** registros da história do casal.
- **Nós:** favoritos, escolhas, bilhetes, check-in diário individual, backup JSON, apagar todos os dados.
- **PWA:** cache offline do código, layout responsivo e redução de movimento.

## Limites — transparência
**Ainda não é um aplicativo sincronizado entre dois dispositivos.** Dados ficam em localStorage do navegador: podem desaparecer se o navegador for limpo. Os votos das duas pessoas na mesma tela são apenas um recurso para comparação e não oferecem autenticação nem verificam a identidade. Reserva financeira é controle manual, **não movimenta dinheiro**. Fotos de atividades são ilustrativas, sem vínculo real com locais. Não existe chat entre aparelhos, notificações push, Supabase ou acesso a dados privados do Duet original nesta branch.

## Arquitetura futura (antes de disponibilizar a casais reais)
Projeto Supabase próprio **isolado** da produção: Supabase Auth, convites de vínculo entre membros, tabelas por couple_id, políticas RLS com usuário autenticado e membership validado para SELECT/INSERT/UPDATE/DELETE, Storage privado, Realtime, migrações e testes de isolamento com dois usuários. Nunca incorporar service_role no cliente. Push somente com permissão explícita e testes reais em iOS/Android. Testar importação de dados local antes da migração.

## Implantação
Serviço separado Render Static Site: \`duet-aurora-alternativo\`, branch \`duet-alternative-aurora-2026\`. Toda alteração nesta branch não modifica a branch \`main\` do Duet original.
