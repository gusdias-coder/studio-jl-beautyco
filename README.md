# Studio JL BeautyCo

Demonstração de agenda de um salão fictício. A página usa o visual do Studio JL, e a agenda usa Cloudflare Workers, Hono e D1. Serviços, preços, profissionais e reservas da demonstração são fictícios. O formulário gera uma identidade de teste no próprio navegador.

## Regras da agenda

| Regra | Valor |
|---|---|
| Expediente | Terça a sábado, 9h às 12h e 13h às 18h |
| Fuso | America/Sao_Paulo |
| Inícios | A cada 30 minutos |
| Antecedência | Entre 2 horas e 60 dias |
| Reserva | Confirmação instantânea, um serviço por reserva |
| Cancelamento pela cliente | Até 12 horas antes, pelo link da reserva |
| Limite | Três reservas futuras por identidade de teste |

Os nove serviços e as três profissionais estão em `migrations/0002_demo.sql`. Mega Hair começa com uma avaliação de 30 minutos. O painel permite editar preço e duração, bloquear horários, remarcar e cancelar.

## Rodar localmente

Use Node.js 22 ou superior. Na raiz:

```sh
npm ci
npm run db:local
npm run dev
```

Abra `http://localhost:8787`. A API de saúde está em `/api/status`, e o painel em `/admin/`. Para habilitar o painel local, crie `.dev.vars` com `ADMIN_KEY` e um valor hexadecimal aleatório de 64 caracteres. A chave fica fora do Git. Com o servidor em execução, rode `npm test` em outro terminal para verificar o fluxo completo. O teste cria e cancela reservas fictícias.

## Publicar na Cloudflare

1. Conecte o Wrangler à conta com `npx wrangler login --device` ou use um token de automação autorizado no ambiente.
2. Selecione a conta com a variável `CLOUDFLARE_ACCOUNT_ID` quando houver mais de uma. Verifique se a conta está no plano esperado.
3. Execute `npm run deploy:cloudflare`. O script reutiliza ou cria o D1, aplica as migrações remotas e publica o Worker com os arquivos estáticos.
4. Para habilitar o painel, defina `ADMIN_KEY` como segredo no painel da Cloudflare ou com `wrangler secret put ADMIN_KEY`. Use uma chave aleatória de 64 caracteres hexadecimais. O deploy automatizado também aceita um arquivo de segredos fora do projeto pela variável `AGENDA_SECRETS_FILE`. Se usar Cloudflare Access, defina `ACCESS_TEAM` e `ACCESS_AUD` e configure a política de acesso a `/admin/*` e `/api/admin/*`; o Worker valida a assinatura e o público do token.
5. Para habilitar Turnstile, configure `TURNSTILE_SITE_KEY` como variável e `TURNSTILE_SECRET` como segredo. A demonstração sem widget aplica limite de tentativas por origem e por identidade de teste.
6. Verifique a home, `/api/status`, uma reserva de teste e a rejeição de acesso ao painel sem credencial.

O ID em `wrangler.toml` é exclusivo para desenvolvimento local. O script gera a configuração remota durante a publicação. Para operar o D1 por linha de comando depois, passe o nome do banco remoto e selecione a conta certa. Configure o subdomínio workers.dev no painel se a conta ainda não tiver um.

## Como funciona

- `public/` contém o site, o fluxo de reserva, a consulta da cliente e o painel.
- `src/agenda.js` traduz o expediente em horários disponíveis. O tempo bloqueado arredonda a duração para blocos de meia hora.
- `src/index.js` contém as rotas e as operações de reserva. O preço e a duração vêm do D1. Gatilhos SQLite rejeitam sobreposição com outra reserva ou folga durante a mesma gravação. O link da cliente guarda um token, cujo hash fica no banco.
- `public/_headers` aplica controles de segurança às páginas e mantém a demonstração fora da indexação.
- `migrations/` guarda o esquema e os dados de teste. O cron remove reservas e bloqueios antigos após 30 dias e registros de auditoria após 90 dias.

Antes de alterar o esquema remoto, exporte uma cópia com `npx wrangler d1 export studio-jl-agenda --remote --output agenda.backup.sql`. Guarde a cópia fora do Git e faça a restauração em um banco descartável para verificar a integridade. O rollback de uma versão do Worker não desfaz uma migração do banco.
