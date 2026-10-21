# Danlet

Atue como um Engenheiro Full-Stack Especialista em React, Tailwind CSS e Framer Motion.
Crie um WebApp Single Page (SPA) mobile-first chamado "Duet: Couple's Masterplan". É um app premium e privado para casais traquearem metas de vida, compartilharem ideias e organizarem o futuro de forma gamificada.

Estética Visual (SaaS Premium):

Dark Mode (fundo #0f172a), com cards translúcidos (glassmorphism: fundo bg-slate-900/50 com backdrop-blur).

Botões e destaques em Dourado/Âmbar e Esmeralda.

Tipografia limpa, cantos muito arredondados (rounded-2xl) e uso da biblioteca Lucide React para ícones.

Estrutura (Bottom Navigation Bar):
Crie uma barra de navegação flutuante no rodapé com 3 abas: "Dashboard", "Dream Match" e "Matriz".

Funcionalidades de cada Tela (Navegação baseada em Estado):

1. Tela "Dashboard" (Home):

No topo: "Olá, Casal!" e um gráfico circular (ou barra de progresso grossa) mostrando "50% dos objetivos do ano concluídos".

Um card de "Contagem Regressiva" (ex: "Casamento - Faltam 850 dias").

Lista de "Próximos Passos" (2 ou 3 tarefas rápidas com checkbox).

2. Tela "Dream Match" (O Tinder das Ideias):

Exiba um card central grande com uma ideia sugestiva (Ex: "Viajar para a Tailândia", "Comprar um Golden Retriever", "Morar num sítio").

Abaixo do card, 2 botões grandes circulares: Um X vermelho (Descartar) e um Coração verde (Quero!).

Quando o usuário clicar no Coração, exiba um alerta/toast divertido: "Match! A Letícia também quer isso! Adicionado às metas oficiais." e mostre o próximo card. (Use animações suaves do Framer Motion para a transição dos cards, simulando um swipe).

3. Tela "Matriz" (Kanban das Metas):

Um menu superior em formato de 'Pills' para filtrar: "Curto Prazo", "Médio Prazo", "Longo Prazo".

Lista de cards de metas (Ex: "Limpar o Nome", "Comprar Apartamento").

Cada card deve ter um botão de "Check" de "Dupla Assinatura". A lógica: ao clicar a primeira vez, o botão fica laranja ("Aguardando parceiro"). Clicando novamente, fica verde ("Meta Concluída!") e dispara uma animação de confetes na tela usando a biblioteca canvas-confetti.

Requisitos Técnicos:

O estado do app deve ser gerenciado para que a navegação entre as 3 abas seja fluida e não perca os dados.

Utilize dados fictícios (mock data) baseados em: Escritório de Advocacia, Viagem à Argentina, Casamento na Praia, Comprar Apartamento.

O layout deve ser perfeito e responsivo para telas de celular (mobile-first approach). Mantenha o código limpo, componentizado e funcional.

## Hospedagem e arquitetura independente

O Duet é um PWA privado para organização do casal. Seu código-fonte é mantido no GitHub, com deploy automático no Render.

- **Aplicativo independente:** [Duet no Render](https://danlet.onrender.com)
- **Código:** [Offdefiz/danlet](https://github.com/Offdefiz/danlet)
- **Banco, autenticação e arquivos:** Supabase externo com políticas RLS e dados do casal preservados.
- **Pesquisas:** música via iTunes Search API gratuita; referências e Instagram via Firecrawl REST direto se configurado.
- **Push:** Firebase HTTP v1 com conta administrada pelos responsáveis (precisa de configuração no Render).
- **Agendador:** GitHub Actions. Os segredos são configurados em Actions e no Render, nunca commitados.

Para preparar as integrações independentes, conferir os riscos de migração, as variáveis exigidas e os testes em iPhone:
[Guia de infraestrutura independente](docs/DUET_INDEPENDENT_INFRA.md).

### Desenvolvimento

O repositório mantém o projeto React / TanStack Start, com builds validados em CI. Rode localmente:

```sh
bun install
bun run dev
bun run test
bun run build
```

A dependência de **build** `@lovable.dev/vite-tanstack-config` permanece temporariamente para evitar regressões enquanto é substituída de forma controlada; o servidor do Render não faz chamadas ao gateway Lovable para pesquisa ou push.
