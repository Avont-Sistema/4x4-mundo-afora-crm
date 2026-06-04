# CLAUDE.md - Configuração do Projeto 4x4 Mundo Afora CRM

## 📋 Resumo do Projeto

Sistema CRM completo para agência de turismo/expedições offroad **4x4 Mundo Afora**, desenvolvido em fases.

- **Empresa**: 4x4 Mundo Afora (expedições offroad)
- **Email**: regesjunioroficial8@gmail.com
- **Instagram**: @4x4mundoafora
- **Status**: Fase 1 (MVP) em desenvolvimento
- **Tipo**: Web App (SPA com Next.js)

## 🏗️ Estrutura do Projeto

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage
│   ├── layout.tsx         # Layout root
│   ├── globals.css        # Estilos globais
│   ├── login/             # Página de login
│   ├── register/          # Página de registro
│   └── dashboard/         # Dashboard e suas páginas
│       ├── layout.tsx     # Sidebar navigation
│       ├── page.tsx       # Main dashboard
│       ├── leads/         # Gerenciamento de leads
│       ├── clients/       # Gerenciamento de clientes
│       ├── expeditions/   # Gerenciamento de expedições
│       ├── bookings/      # Gerenciamento de reservas
│       ├── suppliers/     # Gerenciamento de fornecedores
│       ├── financial/     # Dashboard financeiro
│       └── whatsapp/      # Chat IA WhatsApp (placeholder)
├── components/            # (será criada quando necessário)
├── lib/                   # Utilitários
└── types/                 # Tipos TypeScript (se houver)

prisma/
├── schema.prisma         # Schema do banco de dados
└── dev.db               # Banco SQLite (local)

docs/
├── README.md            # Guia do usuário
├── PHASES.md            # Plano das 6 fases
└── CLAUDE.md            # Este arquivo
```

## 🛠️ Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 15 + React 18 + TypeScript |
| **Styling** | Tailwind CSS |
| **UI Components** | Lucide React (icons) + Recharts (gráficos) |
| **Database** | Prisma + SQLite (local) |
| **State** | React Hooks + Zustand (quando necessário) |

## 📦 Dependências Principais

```json
{
  "react": "^18.3.1",
  "next": "^15.0.0",
  "typescript": "^5.7.3",
  "tailwindcss": "^3.4.1",
  "prisma": "^5.8.0",
  "recharts": "^2.10.3",
  "lucide-react": "^0.345.0"
}
```

## 🚀 Como Rodar

### 1. Setup Inicial
```bash
cd "D:\4X4 - MATRIZ"
npm install
cp .env.example .env.local
```

### 2. Banco de Dados
```bash
# Criar/atualizar schema
npx prisma migrate dev

# Visualizar banco (UI)
npx prisma studio
```

### 3. Desenvolvimento
```bash
npm run dev
# Acessa http://localhost:3000
```

### 4. Build para Produção
```bash
npm run build
npm start
```

## 📊 Banco de Dados

### Entidades Principais

- **User** - Usuários do sistema
- **Lead** - Leads (potenciais clientes)
- **Client** - Clientes confirmados
- **Expedition** - Expedições/tours
- **Booking** - Reservas de clientes em expedições
- **Supplier** - Fornecedores (hotéis, restaurantes, guias)
- **FinancialRecord** - Receitas e despesas
- **WhatsAppMessage** - Histórico de mensagens WhatsApp

Veja `prisma/schema.prisma` para detalhes completos.

## 📱 Páginas Principais

### Public Pages
- **`/`** - Homepage com features
- **`/login`** - Login (mock)
- **`/register`** - Registro (mock)

### Dashboard Pages (todos começam com `/dashboard`)
- **`/`** - Dashboard principal (métricas)
- **`/leads`** - CRUD de leads
- **`/clients`** - CRUD de clientes
- **`/expeditions`** - CRUD de expedições
- **`/bookings`** - Gerenciamento de reservas
- **`/suppliers`** - CRUD de fornecedores
- **`/financial`** - Dashboard financeiro
- **`/whatsapp`** - Chat IA WhatsApp

## 🎨 Design System

### Cores (Tailwind)
- **Primary**: `blue-600` e variações
- **Success**: `green-*`
- **Warning**: `yellow-*`
- **Danger**: `red-*`
- **Neutral**: `gray-*`

### Componentes Reutilizáveis
- `.btn` - Botão base
- `.btn-primary` - Botão primário
- `.btn-secondary` - Botão secundário
- `.btn-danger` - Botão de ação destrutiva
- `.card` - Container card
- `.input` - Input field

## 🔑 Variáveis de Ambiente

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# Next.js Auth (será implementado)
NEXTAUTH_SECRET="seu-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI APIs
ANTHROPIC_API_KEY=""

# WhatsApp (Fase 3)
WHATSAPP_API_URL=""
WHATSAPP_API_TOKEN=""

# Pagamentos (Fase 2)
STRIPE_PUBLIC_KEY=""
STRIPE_SECRET_KEY=""
```

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

### Para Vercel (Fase 4)
```bash
npm install -g vercel
vercel
```

Configuração automática com `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### Database Produção
Trocar `DATABASE_URL` de SQLite para PostgreSQL:
```env
DATABASE_URL="postgresql://user:password@host:port/dbname"
```

## 🔐 Segurança

### To-Do
- [ ] HTTPS em produção
- [ ] CORS configurado
- [ ] Rate limiting
- [ ] Input validation
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] SQL injection prevention (já coberto por Prisma)

## 📖 Documentação

- **README.md** - Guia geral do usuário
- **PHASES.md** - Plano de desenvolvimento das 6 fases
- **CLAUDE.md** - Este arquivo (configuração dev)

## 🐛 Troubleshooting

### Port 3000 já está em uso
```bash
npx kill-port 3000
npm run dev
```

### Erro ao conectar com Prisma
```bash
npx prisma generate
```

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
- [Prisma Docs](https://www.prisma.io/docs)
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

**Última atualização**: 2024-06-04
**Versão**: 1.0.0 (Phase 1 MVP)
