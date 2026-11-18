# Studio JL — modelo de salão premium

Site estático em HTML, CSS e JavaScript, sem compilação ou bibliotecas de interface.
Abra index.html no navegador para visualizar, ou sirva esta pasta em um servidor local.

## Estrutura

- index.html: conteúdo, links, metadados e dados estruturados.
- assets/css/style.css: identidade visual, componentes e layouts responsivos.
- assets/js/main.js: menu para celular e atualização do ano.
- agendamento.html, assets/css/agendamento.css e assets/js/agendamento.js: solicitação de agendamento em quatro etapas.
- assets/img/: quatro fotografias em WebP, armazenadas localmente.

## Composição

Abertura com fotografia e agendamento; nove serviços em três grupos; galeria de quatro trabalhos com ampliação; apresentação do Studio; perguntas frequentes; contato com mapa e rota. Os botões de agendamento da página inicial abrem `agendamento.html`. Os links de serviços e fotos usam servico e ref para preencher a seleção. A cliente pode informar data e horário específicos ou pedir a primeira disponibilidade. O menu permanece acessível sem JavaScript.

Cada seção usa um tom discreto de fundo, em faixas de largura total, para orientar a leitura sem pesar o visual. Os fundos e divisórias ficam em `assets/css/style.css`.

## Solicitação de agendamento

O formulário em `agendamento.html` roda no navegador e prepara uma mensagem para o WhatsApp. Ele não consulta ocupação em tempo real: a equipe confirma a disponibilidade, os valores e a duração final. O botão de envio é um link aberto pelo clique da pessoa; há também a opção de copiar a mensagem. Os botões numerados permitem voltar a qualquer etapa já liberada. O rascunho é guardado em `sessionStorage` e restaurado ao voltar ao formulário na mesma aba; ele é descartado quando a aba é fechada.

Os dados editáveis ficam no topo de `assets/js/agendamento.js`, nos objetos `DEFAULT_SERVICES` e `CONFIG`: serviços, nome, WhatsApp, fuso horário, antecedência mínima, janela de datas, expediente por dia e dias e horários bloqueados. `funcionamento` usa 0 para domingo e 6 para sábado. Cada dia aceita vários períodos, por exemplo `[{ inicio: '09:00', fim: '12:00' }, { inicio: '13:00', fim: '18:00' }]`. Os horários bloqueados são slots de 30 minutos; qualquer serviço que se sobreponha a um deles deixa de ser sugerido.

Para cada serviço, informe `id`, `nome`, `preco`, `tipoPreco` e `duracaoMin`. Os tipos são `fixo`, `aPartirDe` e `sobConsulta`; neste último caso, use `preco: null`. Use `duracaoMin: null` enquanto a duração não estiver confirmada. Com duração conhecida para todos os serviços escolhidos, o formulário evita sugestões que ultrapassem o expediente ou atravessem uma pausa.

Os nove serviços exibidos vêm das categorias já descritas no site: coloração, mechas e loiros, morena iluminada, corte, tratamento capilar, retoque de raiz, Mega Hair, penteado e maquiagem. A pessoa pode selecionar vários. Enquanto a tabela comercial não for informada, todos aparecem com valor sob consulta e duração a confirmar. Os horários mostrados são **preferências**, não vagas em tempo real. Quando as durações forem informadas, o formulário passa a considerá-las nas sugestões.

## Conteúdo complementar

Cadastre conteúdo validado em `assets/js/studio.js`. As seções de antes e depois, equipe e avaliações aparecem quando recebem registros. Cada comparação exige duas fotografias autorizadas do mesmo atendimento e o ID do serviço. A preferência de profissional e a referência escolhida são incluídas na mensagem do WhatsApp.

## Reaproveitar para outro salão

1. Troque a marca, serviços e textos no HTML.
2. Substitua telefone em todos os links wa.me, no link tel, no texto visível e no JSON-LD. O JavaScript não define telefone nem redireciona links.
3. Troque cidade, endereço, horários e os destinos do Instagram e Google Maps.
4. Substitua as quatro fotografias e suas descrições. As imagens desta versão pertencem ao material do Studio JL e não devem apresentar os trabalhos de outro negócio.
5. Atualize title, description, canonical, Open Graph e JSON-LD para o domínio e os dados do novo negócio.
6. Ajuste as cores e fontes no :root do CSS.

## Origem dos dados

Dados de Goiânia e fotografias foram reaproveitados da versão pública em https://gusdias-coder.github.io/studio-jl-beautyco/. A referência recebida menciona outro salão em Porto Alegre; esses dados não foram misturados. A segunda-feira aparece como horário de agendamentos, conforme a fonte original, e não consta como abertura no JSON-LD. Confirme os dados comerciais ao adaptar o modelo.

## Acessibilidade e desempenho

Link para pular ao conteúdo, foco visível, estrutura semântica, descrições de imagens, menu com aria-expanded e fechamento por Escape, suporte a movimento reduzido e conteúdo visível sem JavaScript. Fotografias WebP locais, dimensões reservadas e carregamento adiado da galeria. Fontes externas têm alternativas locais de sistema.

## Publicação

A pasta do site contém os arquivos que devem ir à raiz do repositório gusdias-coder/studio-jl-beautyco. O GitHub Pages já publica a branch main. Pré-visualizações e scripts temporários de verificação não fazem parte do deploy.

## Verificações

Layout e imagens verificados em 1440, 390 e 320 pixels, sem rolagem horizontal. Menu móvel verificado por abertura e Escape. Antes de adaptar para outro negócio, confira novamente os links de contato, descrições, serviços e metadados.
