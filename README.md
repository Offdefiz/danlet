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

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://danlet.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/73696b8f-8a21-4e72-ae61-3e9f99ab5921).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
