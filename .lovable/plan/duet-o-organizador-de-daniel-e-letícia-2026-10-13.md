# Duet — o organizador de Daniel e Letícia

## Objetivo

Transformar o Duet em um espaço pessoal e privado de vocês dois: visual claro e romântico, locais e referências reais, escolhas individuais identificadas e anotações, tarefas e metas salvas e sincronizadas entre aparelhos.

## 1. Identidade leve e romântica

- Adotar a direção escolhida: fundo claro, rosa delicado, verde sálvia e detalhes dourados, com contraste suficiente para leitura.
- Manter a navegação inferior e as três áreas do app, com apresentação mais pessoal: **Nosso espaço**, **Dream Match** e **Nossos planos**.
- Preservar a inspiração **English Garden**, sem tratar casamento na praia como uma decisão já tomada.
- Remover fotos geradas que pareçam registros reais de vocês ou de fornecedores.

## 2. Entrada privada para duas pessoas

- Mostrar **Daniel** e **Letícia** na entrada; depois da escolha, pedir a senha pessoal da conta correspondente.
- Vincular cada nome a uma conta com e-mail real, configurada para vocês. Não permitir cadastro público, ocupação livre dos nomes ou troca de identidade apenas clicando no nome.
- Usar o e-mail na configuração inicial e na recuperação de senha; no uso cotidiano, a entrada fica por nome e senha.
- Salvar um perfil para cada um, manter a sessão no aparelho e oferecer saída e recuperação de acesso.
- Ativar **Lovable Cloud** para contas, dados compartilhados e fotos privadas. Nenhuma senha será definida ou publicada no código.

## 3. Dream Match com opções reais

- Substituir o baralho de sugestões genéricas por categorias: **Locais**, **Decoração** e **Outras referências** — inicialmente flores, papelaria, iluminação e mesa posta.
- Permitir arrastar para a esquerda/direita e usar os botões de rejeitar/curtir. Abrir fotos e links não deve registrar um voto acidental.
- Cada local terá nome, cidade/estado, cenário, descrição factual, fonte, data da verificação e acesso ao Instagram oficial ao tocar na foto ou no botão Instagram.
- Revisar os oito locais já informados, verificando existência, perfil e evidências de realização de casamentos antes de apresentá-los como opções confirmadas.
- Ampliar a pesquisa com meta inicial de pelo menos **20 locais verificados**, conforme os resultados disponíveis, sem preencher a lista com nomes inventados.
- Priorizar Capitólio, Tiradentes e Ouro Preto em MG; Serra, Guarapari e Vitória no ES. Incluir também os destinos já considerados: Búzios e Petrópolis no RJ e Ilhabela em SP. Adicionar filtros por cidade, estado e cenário.
- Começar decoração e demais categorias com referências reais e fontes, sem preços, disponibilidade ou características não confirmados.

### Fotos

- Priorizar fotos/publicações oficiais do Instagram quando houver acesso e permissão de exibição.
- Como vocês escolheram, usar foto autorizada do site oficial ou enviada por vocês como alternativa.
- Não prometer extração irrestrita de fotos do Instagram, contornar bloqueios ou usar imagens geradas como fotos reais. Sem foto utilizável, mostrar o nome e o link para as fotos oficiais.
- Guardar a origem e o crédito das imagens utilizadas.

## 4. Votos individuais e histórico verdadeiro

- Mostrar em cada opção o estado real do parceiro: **curtiu**, **não curtiu** ou **ainda não avaliou**.
- Registrar separadamente a decisão de Daniel e a de Letícia, com data. Cada um só pode mudar seu próprio voto.
- Criar histórico com filtros **Minhas escolhas**, **Escolhas do parceiro**, **Matches** e **Descartados**, com opção de rever uma decisão.
- Só anunciar um match quando os dois tiverem curtido; não transformar uma referência em uma meta concluída ou decisão final automaticamente.
- Permitir levar um match aos planos compartilhados por ação explícita, sem duplicações.

## 5. Dados reais, permanentes e compartilhados

- O código atual usa estado em memória, progresso fixo de 50%, data estimada de novembro de 2028, aprovações iniciais e matches simulados. Remover esses estados fictícios.
- Preservar apenas planos e informações fornecidos por vocês, como o conceito e cronograma do casamento; excluir textos e tarefas genéricos criados para a demonstração. Nenhuma meta começa assinada ou concluída sem uma ação real.
- Oferecer criação, edição e exclusão de metas, tarefas e anotações compartilhadas, incluindo notas em locais e referências.
- Exibir progresso calculado a partir dos registros reais. Sem metas ou data definida, mostrar um estado vazio honesto, sem percentuais ou contagem regressiva inventados.
- Na dupla assinatura, exigir uma confirmação de cada conta: clicar duas vezes como Daniel não substitui a confirmação de Letícia.
- Salvar alterações na nuvem e atualizar o outro aparelho enquanto estiver conectado. Ao reabrir o app, carregar os dados salvos.
- Mostrar quando estiver salvando, salvo ou quando uma alteração falhar. Sem conexão, não afirmar que algo foi sincronizado.
- Manter autor e data das atualizações. Se ambos editarem o mesmo registro, detectar conflito e pedir revisão em vez de apagar silenciosamente o trabalho do outro.

## 6. Novas opções quando vocês quiserem

- Adicionar **Buscar novas opções**, conforme a escolha de vocês, respeitando categoria e região selecionadas.
- Conectar um serviço de pesquisa na web para o app buscar opções existentes e guardar fontes. Essa conexão será solicitada durante a implementação e pode ter custo de uso.
- Mostrar resultados para revisão e inclusão por Daniel ou Letícia, sem alterar automaticamente as escolhas e anotações existentes.
- Evitar duplicações, manter a data da última verificação e não apagar histórico quando um local deixar de ser sugerido.
- Não haverá pesquisa semanal nem alterações automáticas em decisões pessoais.

## Detalhes técnicos

- Preservar uma única rota index para a experiência, com três views e estado compartilhado; separar componentes e lógica sem criar páginas concorrentes para cada aba.
- Manter a entrada na mesma experiência. A tela inicial pública não carregará dados privados; todas as leituras e alterações privadas exigirão autenticação e vínculo ao casal no servidor ou nas políticas de acesso.
- Usar Lovable Cloud para perfis, vínculo das duas contas, metas, tarefas, notas, referências, votos, assinaturas e histórico. Aplicar permissões explícitas e políticas que limitem o acesso aos dois membros e a escrita dos votos ao próprio autor.
- Usar atualização em tempo real com recarregamento dos dados ao reconectar. A nuvem será a fonte de verdade, não o armazenamento local do navegador.
- Executar pesquisa externa em funções autenticadas, com credenciais somente no servidor, limites de resultados e tratamento claro de falhas.
- Registrar as preferências pessoais e substituir as regras antigas de visual escuro na memória do projeto durante a implementação.

## Validação

- Testar Daniel e Letícia em sessões separadas: acesso privado, voto individual, estado do parceiro, match real e dupla assinatura.
- Criar e editar uma nota em uma sessão, conferir a atualização na outra e verificar que permanece após recarregar.
- Testar que terceiros não conseguem acessar dados ou se apropriar de uma das identidades.
- Conferir pesquisa com entradas reais, fontes, imagens permitidas e abertura dos perfis corretos no Instagram.
- Verificar apresentação e swipe em celular e computador, sem cortes ou sobreposição de texto.

## Dependências e limites

- A implementação solicitará ativação de Lovable Cloud e conexão do serviço de pesquisa.
- A configuração privada das duas contas exigirá os e-mails de vocês, informados no fluxo de configuração; senhas nunca serão solicitadas pelo chat.
- Fotos do Instagram e a quantidade de locais disponíveis dependem das fontes acessíveis. Resultados não verificáveis não serão apresentados como confirmados.
- Dados da demonstração ainda em memória não constituem histórico real e não serão convertidos em escolhas atribuídas a vocês.