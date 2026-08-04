# CLAUDE.md - Configuração do Projeto 4x4 Mundo Afora CRM

## 🖥️ Servidor de Infraestrutura

> **IMPORTANTE**: O bot do WhatsApp roda em um servidor físico da AVONT, não no Vercel.
> As instruções completas do servidor estão em `/opt/4x4-mundo-afora-crm/CLAUDE.md` **no servidor**.
>
> Resumo rápido para acesso:
> - SSH: `ssh reges@100.113.229.99` (requer Tailscale logado com conta **Avont-Sistema@github**)
> - Portainer: `https://100.113.229.99:9443`
> - Container do bot: `4x4-bot` (porta `3002:8080`)
> - Sessão WhatsApp salva em: `/opt/4x4-bot/auth/` — **nunca deletar**
> - `CRM_URL` correta: `https://4x4-mundo-afora-crm-iota.vercel.app`

## 📋 Resumo do Projeto

Sistema CRM completo para agência de turismo/expedições offroad **4x4 Mundo Afora**: leads, clientes/passageiros, expedições (com fornecedores, custos, fechamento), formulário público de inscrição, contratos com assinatura eletrônica, financeiro, e um bot de WhatsApp com IA (conversas, disparos em massa, flow builder, treinamento).

- **Empresa**: 4x4 Mundo Afora (expedições offroad)
- **Email**: regesjunioroficial8@gmail.com
- **Instagram**: @4x4mundoafora
- **Status**: em produção (`https://4x4-mundo-afora-crm-iota.vercel.app`), evoluindo continuamente — não trate como "MVP fase 1"
- **Tipo**: Web App (Next.js App Router) + bot WhatsApp separado rodando no servidor AVONT (ver seção acima)

## 🏗️ Estrutura do Projeto

```
src/
├── app/
│   ├── page.tsx, layout.tsx, globals.css
│   ├── login/, register/          # login (mock) / signup interno (stub, não implementado)
│   ├── cadastro/page.tsx          # Formulário PÚBLICO de inscrição de passageiro ("Ficha de Cadastro")
│   ├── checkout/page.tsx          # Checkout público (PIX/Asaas)
│   ├── dashboard/                 # tudo atrás do login, layout.tsx = sidebar
│   │   ├── leads/, clients/[id]/, expeditions/[id]/, suppliers/,
│   │   │   financial/, bookings/ (legado), agenda/, statistics/,
│   │   │   campaigns/, disparos/, flows/, whatsapp/, settings/
│   └── api/                       # ver "Mapa de Funcionalidades" abaixo para os endpoints
├── components/                    # componentes reutilizáveis entre páginas (ex: SupplierFormModal.tsx)
├── lib/                           # TODA a lógica de negócio e acesso a dados mora aqui — ver seção
│                                     "Arquitetura de Dados" abaixo antes de mexer em qualquer *Store.ts
└── types/

prisma/schema.prisma   # LEGADO/MORTO — não reflete os dados reais, ver seção "Arquitetura de Dados"
```

## ⚠️ Arquitetura de Dados (leia antes de mexer em qualquer feature)

**`prisma/schema.prisma` é código morto.** Ninguém em `src/` usa `@prisma/client` para ler/escrever dados de verdade (só `src/lib/prisma.ts` instancia o client, e nada mais importa esse arquivo). Editar o schema Prisma **não tem efeito nenhum** nas features reais — não perca tempo lá.

Os dados reais vivem em **coleções JSON tipadas em TypeScript**, sobre um KV store:

- `src/lib/kvStore.ts` — lê/escreve um blob JSON por "coleção". Em produção é uma tabela Supabase `kv_collections (name TEXT PK, data JSONB)` (credenciais via `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY`, ver `src/lib/supabaseClient.ts`); sem essas credenciais localmente, cai para arquivos `.data/<nome>.json`.
- `src/lib/jsonCollection.ts` — wrapper genérico `createCollection<T>(nome, seedFn)` com `all/get/create/update/remove/touch`.
- Cada entidade tem seu próprio `*Store.ts` em `src/lib/` (ex.: `clientsStore.ts`, `expeditionsStore.ts`, `suppliersStore.ts`) que chama `createCollection(...)`. **É lá que ficam as interfaces TypeScript reais** (`Client`, `Expedition`, `Supplier`, etc.) — quando for adicionar um campo novo a alguma entidade, edite a interface no `*Store.ts` correspondente, não o `schema.prisma`.
- Não existe uma entidade "Passenger"/"Booking" separada: passageiros/acompanhantes são `Client.family[]` (`FamilyMember[]`), e matrículas em expedição são `Expedition.enrollments[]` (embutido, não é uma tabela própria).

## 🗺️ Mapa de Funcionalidades (onde encontrar cada coisa)

Use esta seção para localizar rápido o código de uma feature em vez de explorar o repo do zero.

| Funcionalidade | Arquivos principais |
|---|---|
| **Formulário público de inscrição** ("Ficha de Cadastro", rota `/cadastro` ou `/cadastro?exp=<id>`) | UI: `src/app/cadastro/page.tsx` · API: `src/app/api/cadastro/route.ts` (GET expedição+termo / POST inscrição) e `src/app/api/cadastro/lookup/route.ts` (busca "já sou cliente" por CPF) |
| **Validação/máscara de CPF** | `src/lib/cpf.ts` (`formatCpf`, `isValidCpf`, `cpfError`) |
| **Clientes/passageiros** | Dados: `src/lib/clientsStore.ts` (`Client`, `FamilyMember`) · Lista: `src/app/dashboard/clients/page.tsx` · Detalhe: `src/app/dashboard/clients/[id]/page.tsx` + `src/lib/clientDetail.ts` · Form staff: `src/app/dashboard/clients/ClientForm.tsx` · API: `src/app/api/clients/`, `src/app/api/clients/[id]/` |
| **Expedições** (financeiro, matrículas, custos, fechamento) | Dados: `src/lib/expeditionsStore.ts` (`Expedition`, `Enrollment`, `computeFinance`) · Lista: `src/app/dashboard/expeditions/page.tsx` · Detalhe com abas Clientes/Fornecedores/Custos/Fechamento: `src/app/dashboard/expeditions/[id]/page.tsx` · API: `src/app/api/expeditions/`, `[id]/`, `[id]/enrollments/`, `[id]/costs/`, `[id]/export/`, `[id]/import/` |
| **Fornecedores** (hotel, restaurante, transporte, guia...) | Dados/regra de custo: `src/lib/suppliersStore.ts` · Colunas exportáveis: `src/lib/supplierFields.ts` (`PersonRow`, `EXPORT_FIELDS`) · Motor de exportação CSV: `src/lib/supplierExport.ts` · Lista/CRUD: `src/app/dashboard/suppliers/page.tsx` · Modal criar/editar (reutilizado também na aba Fornecedores da expedição): `src/components/SupplierFormModal.tsx` · API: `src/app/api/suppliers/`, `[id]/` |
| **Exportar planilha (CSV) por fornecedor / fechar expedição** | `src/lib/supplierExport.ts` (`buildSupplierCSV`) · API: `src/app/api/expeditions/[id]/export/route.ts` · UI: aba "Fechamento" em `src/app/dashboard/expeditions/[id]/page.tsx` |
| **Importar planilha de controle interno (.xlsx)** | `src/lib/importControle.ts` · API: `src/app/api/expeditions/[id]/import/route.ts` · UI: modal "Importar planilha" na aba Clientes de `src/app/dashboard/expeditions/[id]/page.tsx` |
| **Contratos / Termo de Uso de Imagem (assinatura eletrônica)** | Dados+template: `src/lib/contractsStore.ts` · Texto/render do termo: `src/lib/imageRightsTerm.ts` · Geração de PDF: `src/lib/contractPdf.ts` · API: `src/app/api/contracts/`, `[id]/`, `src/app/api/contract-template/` · Editor do template (staff): `src/app/dashboard/settings/page.tsx` |
| **Financeiro / contas a pagar** | `src/lib/finance.ts`, `src/lib/payablesStore.ts` · UI: `src/app/dashboard/financial/page.tsx` · API: `src/app/api/finance/summary/`, `src/app/api/payables/` |
| **Leads** | `src/lib/leadsStore.ts` · UI: `src/app/dashboard/leads/page.tsx` · API: `src/app/api/leads/`, `[id]/`, `webhook/` |
| **WhatsApp — proxy para o bot no servidor AVONT** | `src/lib/botProxy.ts`, `src/lib/botAuth.ts` (usam `BOT_URL`/`BOT_SECRET`) |
| **WhatsApp — conversas / chat IA** | `src/lib/conversationsStore.ts` · UI: `src/app/dashboard/whatsapp/page.tsx` · API: `src/app/api/whatsapp/conversations/` |
| **WhatsApp — treinamento do bot / base de conhecimento** | `src/lib/knowledgeStore.ts`, `src/lib/training.ts` · API: `src/app/api/knowledge/`, `src/app/api/whatsapp/train/` |
| **WhatsApp — disparos em massa** | `src/lib/broadcastStore.ts` · UI: `src/app/dashboard/disparos/page.tsx` · API: `src/app/api/broadcasts/` |
| **WhatsApp — flow builder (automação de mensagens)** | `src/lib/flowsStore.ts` · UI: `src/app/dashboard/flows/page.tsx` · API: `src/app/api/flows/` |
| **Notificação dos donos via WhatsApp** (ex: nova inscrição pelo formulário) | `src/lib/notify.ts` |
| **Pagamentos (PIX / Asaas)** | `src/lib/payments/` (`asaas.ts`, `pix.ts`, `index.ts`) · Checkout público: `src/app/checkout/page.tsx` · API: `src/app/api/payments/` |
| **Configurações / integrações** | `src/lib/settingsStore.ts`, `src/lib/integrationsStore.ts` · UI: `src/app/dashboard/settings/page.tsx` |
| **Estatísticas** | `src/lib/statistics.ts` · UI: `src/app/dashboard/statistics/page.tsx` |
| **Camada de dados (KV store)** | `src/lib/kvStore.ts`, `src/lib/jsonCollection.ts`, `src/lib/supabaseClient.ts` — ver seção "Arquitetura de Dados" acima |

## 🛠️ Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 15 (App Router) + React 18 + TypeScript |
| **Styling** | Tailwind CSS |
| **UI Components** | Lucide React (icons) + Recharts (gráficos) + react-hot-toast |
| **Dados** | Coleções JSON sobre Supabase (`kv_collections`) — **não Prisma**, ver "Arquitetura de Dados" |
| **Planilhas** | `xlsx` (import de .xlsx) · CSV escrito à mão (export, ver `supplierExport.ts`) |
| **PDF** | `jspdf` (contrato assinado) |
| **Pagamentos** | Asaas (boleto/cartão) + PIX estático |
| **IA / Bot WhatsApp** | `openai` SDK (aponta para DeepSeek via `DEEPSEEK_API_KEY`/`AGENT_MODEL`) + bot próprio no servidor AVONT (fora deste repo) |
| **State** | React Hooks (não há uso relevante de Zustand apesar de instalado) |

Ver `package.json` para a lista completa e versões exatas.

## 🚀 Como Rodar

### 1. Setup Inicial
```bash
cd "D:\4X4 - MATRIZ"
npm install
cp .env.example .env.local
```

### 2. Desenvolvimento
```bash
npm run dev
# Acessa http://localhost:3030  (NÃO é 3000 — porta fixada em package.json)
```

### 3. Build para Produção
```bash
npm run build
npm start   # também sobe em :3030
```

`npx prisma migrate dev` / `npx prisma studio` **não afetam os dados reais do app** (Prisma é legado, ver "Arquitetura de Dados"). Sem credenciais Supabase no `.env.local`, o app local usa arquivos `.data/*.json` como store — não precisa de banco nenhum rodando para desenvolver.

## 📊 Dados

Ver seção **"⚠️ Arquitetura de Dados"** acima — as entidades reais (`Client`, `Expedition`, `Supplier`, `Lead`, etc.) são interfaces TypeScript em `src/lib/*Store.ts`, não models Prisma.

## 📱 Páginas Principais

### Public Pages
- **`/`** - Homepage com features
- **`/login`** - Login
- **`/register`** - Signup interno (stub, não implementado)
- **`/cadastro`** ou **`/cadastro?exp=<id>`** - Formulário público de inscrição de passageiro (o "link de formulário" gerado por expedição)
- **`/checkout`** - Checkout público (PIX/Asaas)

### Dashboard Pages (todos começam com `/dashboard`, atrás de login)
- **`/`** - Dashboard principal (métricas)
- **`/leads`** - CRUD de leads
- **`/clients`**, **`/clients/[id]`** - CRUD de clientes + detalhe/histórico
- **`/expeditions`**, **`/expeditions/[id]`** - CRUD de expedições + detalhe (abas Clientes/Fornecedores/Custos/Fechamento)
- **`/suppliers`** - CRUD de fornecedores (custos, regras de cobrança, campos de exportação)
- **`/financial`** - Dashboard financeiro
- **`/agenda`** - Agenda
- **`/statistics`** - Estatísticas
- **`/campaigns`** - Campanhas de e-mail
- **`/disparos`** - Disparos em massa via WhatsApp
- **`/flows`** - Flow builder de automação WhatsApp
- **`/whatsapp`** - Chat IA WhatsApp (conversas, treinamento, contextos)
- **`/settings`** - Configurações, integrações, template do termo de imagem
- **`/bookings`** - legado, verificar se ainda em uso antes de estender

## 🎨 Design System

### Cores (Tailwind) — conferido em `src/app/globals.css`
- **Primary**: `yellow-400`/`orange-500` (não azul — o `.btn-primary` é amarelo/preto)
- **Success / pago**: `emerald-*`
- **Warning / pendente**: `amber-*`
- **Danger / excluir**: `rose-*` na maioria das telas (`.btn-danger` global usa `red-600`, mas botões de excluir inline geralmente usam `bg-rose-50 text-rose-600`)
- **Neutral**: `gray-*`

### Componentes Reutilizáveis
- `.btn` - Botão base
- `.btn-primary` - Botão primário
- `.btn-secondary` - Botão secundário
- `.btn-danger` - Botão de ação destrutiva
- `.card` - Container card
- `.input` - Input field

## 🔑 Variáveis de Ambiente

Nomes reais usados no código (ver `.env.example` para o arquivo completo — valores não ficam aqui):

```env
# Dados (Supabase — se ausente, cai para arquivos .data/*.json locais)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=          # ou SUPABASE_SERVICE_ROLE_KEY

# Auth do CRM
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# IA (chat/treinamento do bot — via SDK da OpenAI apontando pra DeepSeek)
DEEPSEEK_API_KEY=
AGENT_MODEL=

# Bot WhatsApp (servidor AVONT, ver src/lib/botProxy.ts)
BOT_URL=
BOT_SECRET=
WHATSAPP_CONNECTOR_URL=
WHATSAPP_CONNECTOR_TOKEN=

# Pagamentos
ASAAS_API_KEY=
ASAAS_ENV=
ASAAS_WEBHOOK_TOKEN=
PIX_KEY=
PIX_MERCHANT_NAME=
PIX_MERCHANT_CITY=

# E-mail (campanhas)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

# Outros
NEXT_PUBLIC_APP_URL=          # = CRM_URL, ver topo do arquivo
INSTAGRAM_ACCESS_TOKEN=
```

`DATABASE_URL`/`prisma/schema.prisma` ainda existem no repo mas não são usados por nenhuma feature real — não precisam estar corretos para o app funcionar.

## 📝 Código Standards

### Nomes de Arquivos
- Componentes React: PascalCase (ex: `Dashboard.tsx`)
- Páginas Next.js: kebab-case (ex: `page.tsx`)
- Tipos: PascalCase (ex: `User.ts`)

### Commits
```
[Fase X] Descrição breve

Descrição detalhada (opcional)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### TypeScript
- `'use client'` em componentes que usam React hooks
- Tipos sempre definidos (sem `any`)
- Interfaces para objetos, types para unions

### Imports
```typescript
// Ordem: 1. Next/React, 2. Libs externas, 3. Locais
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
```

## 🧪 Testing (Futuro)

Quando implementar testes:
- Unit tests: Jest + React Testing Library
- E2E tests: Playwright
- Cobertura alvo: 80%+

## 🚢 Deployment

### Deploy manual (raramente necessário)
```bash
npm install -g vercel
vercel
```

**Deploy real é automático**: qualquer `git push` na branch `master` do repositório GitHub conectado dispara build+deploy na Vercel (não precisa rodar `vercel` manualmente). Produção usa Supabase (`kv_collections`) como store — não há "trocar DATABASE_URL para Postgres", isso está desatualizado (era de uma fase anterior baseada em Prisma/SQLite que não é mais usada).

## 🔐 Segurança

### To-Do
- [ ] Rate limiting
- [ ] CSRF tokens no formulário público `/cadastro`

## 🐛 Troubleshooting

### Porta 3030 já está em uso
```bash
npx kill-port 3030
npm run dev
```

### Dados não aparecem / "Supabase não configurado"
`src/lib/supabaseClient.ts` lança esse erro se `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SECRET_KEY` estiverem ausentes. Localmente isso é esperado — o app cai para arquivos `.data/*.json` (ver "Arquitetura de Dados"). Só é um problema real em produção/preview na Vercel.

### Build fails com TypeScript
```bash
# Verificar erros
npm run build

# Resetar TypeScript cache
rm -rf .next
npm run build
```

## 📚 Referências Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [React Docs](https://react.dev)
- [Recharts](https://recharts.org)

## 👥 Equipe

- **Product Owner**: Regis Junior
- **Development**: Claude (AI Assistant)

## 📞 Contato

- Email: regesjunioroficial8@gmail.com
- Instagram: @4x4mundoafora

---

**Última atualização**: 2026-08-04
