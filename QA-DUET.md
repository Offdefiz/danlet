# Revisão de qualidade — Duet

> Documento de rastreabilidade. Esta branch é de **revisão**, não é uma publicação e não deve ser integrada à `main` sem aprovação do casal.

## Solicitações e resultados de implementação

| Requisito | Implementação proposta na branch | Verificação ainda necessária |
| --- | --- | --- |
| 1. Temas com confirmação | Selecionar, cancelar, aplicar na hora, salvar por usuário/dispositivo | Teste visual em iPhone e iPad |
| 2. Rosa com glitter | Décima paleta, partículas sutis e respeito a movimento reduzido | Aprovação estética da Letícia e avaliação de desempenho |
| 3. Selo Made with Lovable | **Não removido**: selo de hospedagem pode depender da configuração/assinatura da plataforma, fora do código | Verificar painel de publicação Lovable ou hospedar em infraestrutura própria |
| 4. Cabeçalho mobile | Logo preservado, conversa e menu de conta | Conferir áreas de toque em telas estreitas |
| 5. Configurações | Perfil, tema, notificações, e-mail, recuperação de senha, privacidade, ajuda e saída | Verificar confirmação de e-mail e links no domínio de produção |
| 6. Botão + | Usa cor semântica do tema e abre ações rápidas | Validar os 10 temas nas telas |
| 7. Mensagens e notificações | Mensagem otimista no chat, sincronização após envio e tentativa imediata de drenar push | Teste com as duas contas, permissões e Firebase |
| 8. Dream Match | Navegação direta, espaço para cartões, swipe otimista com animação de saída | Gestos reais no celular, rede lenta e falhas de gravação |
| 9. Sugestões | Referências **reais já cadastradas**, priorizadas por interesses e curtidas; atalhos de busca de regiões sem locais inventados | Conferir catálogo, pesquisa remota e respostas do parceiro |
| 10. Melhorias criativas | Menu de conta, ações rápidas, recomendações locais | Revisão funcional e estética do casal |
| 11. Auditoria completa | Testes automatizados e compilação em GitHub Actions | **Testes ponta-a-ponta ainda não realizados** |

## Roteiro de testes de aceitação

1. Entrar separadamente como Daniel e Letícia; sair; recuperar a senha.
2. Em cada um dos dez temas, selecionar, cancelar, aplicar e fechar/reabrir; conferir botões, diálogos, contraste e preferência individual.
3. Abrir menu de conta, perfil, alteração de nome, foto, temas, notificações, e-mail, senha, privacidade e ajuda.
4. Percorrer as abas Início, Dream Match, Planos e Lista; usar o botão + para tarefa, nota, meta e referência.
5. Criar, editar, concluir e excluir tarefas; criar notas e metas; confirmar assinatura dupla de metas.
6. No Dream Match, deslizar para os dois lados e usar os botões equivalentes; testar cancelamento, histórico, filtros, detalhes, referência e match simultâneo.
7. No chat de ambos, enviar em sequência mensagens curtas e longas; conferir aparecimento imediato, confirmação, ordem, erros e mensagens recebidas.
8. Habilitar avisos nos dois dispositivos, colocar um app em segundo plano e conferir recebimento, atraso, permissão e supressão por preferências.
9. Verificar que cada clique tem consequência real ou mensagem de erro: nenhum botão deve parecer funcional quando não é.
10. Conferir viewport móvel (320, 375 e 390 px), tablet, teclado aberto, scroll e áreas seguras.
11. Repetir situações de conexão perdida e reconexão; não afirmar sucesso sem validar a sincronização real.

## Limites atuais de validação

- A pipeline de GitHub executa os testes Vitest e a compilação Vite, mas isso **não substitui testes de interface em navegador** nem testes com dois usuários reais.
- Nenhum acesso de publicação ou edição de configurações do serviço Lovable foi utilizado.
- Sem acesso a contas reais, credenciais push e dispositivos de ambos, não é possível certificar entrega em segundo plano de notificações nem os links de e-mail.
- A pesquisa externa de novos locais requer integrações e rede; a classificação de itens **já cadastrados** funciona sem chamadas externas.

## Critério de aprovação

Publicar só depois de confirmar que o workflow da revisão está verde, aprovar a aparência e passar pelo roteiro manual nos dois aparelhos. Não publicar automaticamente.
