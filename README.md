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

Abertura com fotografia e agendamento; três grupos de serviços; galeria com três trabalhos; apresentação curta do studio; contato com endereço, horários e rota no Google Maps. Os botões de agendamento da página inicial abrem `agendamento.html`. O menu permanece acessível sem JavaScript.

Cada seção usa um tom discreto de fundo, em faixas de largura total, para orientar a leitura sem pesar o visual. Os fundos e divisórias ficam em `assets/css/style.css`.

## Solicitação de agendamento

O formulário em `agendamento.html` roda no navegador e prepara uma mensagem para o WhatsApp. Ele não consulta ocupação em tempo real: a equipe confirma a disponibilidade, os valores e a duração final. O botão de envio é um link aberto pelo clique da pessoa; há também a opção de copiar a mensagem.

Todos os dados editáveis ficam no objeto `CONFIG`, no topo de `assets/js/agendamento.js`: nome, WhatsApp, fuso horário, antecedência mínima, janela de datas, expediente por dia, dias e horários bloqueados e serviços. `funcionamento` usa 0 para domingo e 6 para sábado. Cada dia aceita vários períodos, por exemplo `[{ inicio: '09:00', fim: '12:00' }, { inicio: '13:00', fim: '18:00' }]`. Os horários bloqueados são slots de 30 minutos; qualquer serviço que se sobreponha a um deles deixa de ser sugerido.

Para cada serviço, informe `id`, `nome`, `preco`, `tipoPreco` e `duracaoMin`. Os tipos são `fixo`, `aPartirDe` e `sobConsulta`; neste último caso, use `preco: null`. Quando a tabela estiver configurada, a duração evita sugestões que ultrapassem o expediente ou atravessem uma pausa.

Por enquanto, `servicos` está vazio porque a tabela comercial ainda será informada. A pessoa descreve o serviço livremente, escolhe data e horário **de preferência**, informa seus dados e envia a solicitação à equipe. Os horários mostrados não são vagas em tempo real; duração, valor e disponibilidade dependem da confirmação da equipe. Quando a tabela for informada, o formulário passa a mostrar os serviços configurados e a considerar suas durações nas sugestões.

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
