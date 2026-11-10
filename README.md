# Studio JL — modelo de salão premium

Site estático em HTML, CSS e JavaScript, sem compilação ou bibliotecas de interface.
Abra index.html no navegador para visualizar, ou sirva esta pasta em um servidor local.

## Estrutura

- index.html: conteúdo, links, metadados e dados estruturados.
- assets/css/style.css: identidade visual, componentes e layouts responsivos.
- assets/js/main.js: menu para celular e atualização do ano.
- assets/img/: quatro fotografias em WebP, armazenadas localmente.

## Composição

Abertura com fotografia e agendamento; três grupos de serviços; galeria com três trabalhos; apresentação curta do studio; contato com endereço, horários e rota no Google Maps. Há dois links de WhatsApp, com mensagem preenchida no próprio HTML. Eles funcionam mesmo sem JavaScript. O menu permanece acessível sem JavaScript.

## Reaproveitar para outro salão

1. Troque a marca, serviços e textos no HTML.
2. Substitua telefone nos dois links wa.me, no link tel, no texto visível e no JSON-LD. O JavaScript não define telefone nem redireciona links.
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
