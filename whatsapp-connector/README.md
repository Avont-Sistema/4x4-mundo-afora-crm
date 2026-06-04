# Conector de WhatsApp — 4x4 Mundo Afora

Serviço Node separado que conecta um número de WhatsApp real e encaminha as
mensagens para o **cérebro do agente** que vive no CRM (Next.js).

```
WhatsApp  ──>  Conector (este serviço)  ──>  CRM /api/whatsapp/inbound  ──>  Claude + Tools
   ^                                                                              │
   └──────────────────────  resposta do agente  ─────────────────────────────────┘
```

Por que separado? O Baileys mantém um socket persistente — não roda no Vercel
(serverless). Este conector roda 24/7 num Railway/VPS; o CRM continua no Vercel.

## Canais suportados

- **baileys** (padrão): grátis, conecta por QR code, sem aprovação da Meta.
- **meta**: API oficial WhatsApp Cloud API (para alto volume, 4000+ leads/mês).
  Já deixado pronto em `channels/meta.js` — basta `CHANNEL=meta` e as credenciais.
  Troca de canal **não altera** o resto do código.

## Rodar local

```bash
cd whatsapp-connector
cp .env.example .env     # ajuste CRM_URL e WHATSAPP_CONNECTOR_TOKEN
npm install
npm start
```

Abra `http://localhost:8080/qr` e escaneie no WhatsApp
(Aparelhos conectados → Conectar aparelho). Pronto: o número responde sozinho.

> Defina o **mesmo** `WHATSAPP_CONNECTOR_TOKEN` no `.env.local` do CRM, e
> `WHATSAPP_CONNECTOR_URL=http://localhost:8080` no CRM para o envio manual
> (handoff humano) chegar ao cliente.

## Deploy (Railway)

1. Crie um serviço apontando para esta pasta (`whatsapp-connector`).
2. Variáveis: `CRM_URL` (URL do CRM no Vercel), `WHATSAPP_CONNECTOR_TOKEN`, `CHANNEL=baileys`.
3. Adicione um **volume** montado em `/app/auth` para a sessão sobreviver a restarts.
4. Acesse `/qr` uma vez para parear.

## Migrar para a API oficial (depois)

1. `CHANNEL=meta` + `META_TOKEN`, `META_PHONE_ID`, `META_VERIFY_TOKEN`.
2. Configure o webhook da Meta apontando para `https://<conector>/webhook`.
3. Nada mais muda — o cérebro e o CRM continuam iguais.

## Endpoints

- `GET /qr` — QR code de pareamento (Baileys)
- `GET /health` — status
- `POST /send` — envio manual (usado pelo CRM no handoff), header `x-connector-token`
- `GET|POST /webhook` — recebimento da Meta (quando `CHANNEL=meta`)
