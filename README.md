# 4x4 Mundo Afora - CRM System

Sistema CRM completo para agência de turismo/expedições offroad **4x4 Mundo Afora**.

## 🚀 Funcionalidades (Fase 1 - MVP)

- ✅ **Dashboard** - Visão geral com métricas e gráficos
- ✅ **CRM de Leads** - Gerenciamento completo de leads com diferentes status
- ✅ **Gerenciamento de Clientes** - Cadastro e controle de clientes
- ✅ **Gestão de Expedições** - Criar, editar e visualizar expedições
- ✅ **Reservas** - Controle de reservas e status de pagamento
- ✅ **Fornecedores** - Cadastro e avaliação de hotéis, restaurantes, guias, etc
- ✅ **Financeiro** - Dashboard financeiro com receitas, despesas e lucratividade
- ⏳ **IA WhatsApp** - Agente de IA integrado (será implementado na Fase 4)

## 📋 Fases de Desenvolvimento

| Fase | Objetivo | Status |
|------|----------|--------|
| **1** | MVP Base (CRM, Leads, Clientes, Expedições) | ✅ Em Progresso |
| **2** | Integração de Reservas e Pagamentos | ⏳ Próxima |
| **3** | IA WhatsApp + Automações | ⏳ Planejada |
| **4** | Deploy Vercel + Polimentos | ⏳ Planejada |

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Prisma + SQLite (local), PostgreSQL (produção)
- **Gráficos**: Recharts
- **UI Components**: Lucide Icons
- **Estado**: Zustand (quando necessário)

## 📦 Instalação e Setup

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Passos

1. **Clone o repositório** (se aplicável)
```bash
git clone <repo-url>
cd "4x4 - MATRIZ"
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
# Edite .env.local com suas configurações
```

4. **Configure o banco de dados**
```bash
npx prisma migrate dev
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

6. **Acesse a aplicação**
```
http://localhost:3000
```

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── page.tsx                 # Home page
│   ├── layout.tsx              # Layout principal
│   ├── globals.css             # Estilos globais
│   ├── login/                  # Página de login
│   ├── register/               # Página de registro
│   └── dashboard/
│       ├── layout.tsx          # Layout do dashboard
│       ├── page.tsx            # Dashboard principal
│       ├── leads/              # Gerenciamento de leads
│       ├── clients/            # Gerenciamento de clientes
│       ├── expeditions/        # Gerenciamento de expedições
│       ├── bookings/           # Gerenciamento de reservas
│       ├── suppliers/          # Gerenciamento de fornecedores
│       ├── financial/          # Dashboard financeiro
│       └── whatsapp/           # Chat IA WhatsApp
├── components/                 # Componentes reutilizáveis
├── lib/                        # Utilitários e helpers
└── types/                      # Tipos TypeScript

prisma/
├── schema.prisma              # Schema do banco de dados
└── dev.db                     # Banco de dados SQLite (local)
```

## 🗄️ Banco de Dados

### Entidades Principais

- **User** - Usuários do sistema
- **Lead** - Leads/potenciais clientes
- **Client** - Clientes confirmados
- **Expedition** - Expedições disponíveis
- **Booking** - Reservas de clientes
- **Supplier** - Fornecedores (hotéis, restaurantes, etc)
- **FinancialRecord** - Registros de receitas e despesas
- **WhatsAppMessage** - Histórico de mensagens WhatsApp

## 🔐 Autenticação

*Será implementada na Fase 2*

Por enquanto, o sistema permite acesso livre ao dashboard para demonstração.

## 🤖 IA WhatsApp (Fase 3)

O agente de IA será integrado via Claude API e Twilio WhatsApp API, com funcionalidades de:
- Responder perguntas sobre expedições
- Processar reservas automáticas
- Gerar links de pagamento
- Enviar documentos e mídia
- Consultar próximas expedições

## 💳 Integrações Futuras

- Stripe / PagSeguro para pagamentos
- Twilio para WhatsApp
- SendGrid para email
- Instagram API para análise de leads

## 🚀 Deploy

A aplicação será hospedada no **Vercel** na Fase 4.

```bash
npm install -g vercel
vercel
```

## 📝 Notas de Desenvolvimento

- Componentes mantêm estado local com React hooks por enquanto
- Mock data é usado para demonstração (será substituído por API/DB)
- Tailwind CSS para styling
- Responsivo para desktop, tablet e mobile

## 🤝 Contribuindo

Para adicionar features:
1. Crie uma branch (`git checkout -b feature/nome`)
2. Commit suas mudanças (`git commit -m 'Add feature'`)
3. Push para a branch (`git push origin feature/nome`)
4. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou issues:
- Email: regesjunioroficial8@gmail.com
- Instagram: @4x4mundoafora

---

**Status**: Fase 1 - MVP em desenvolvimento ✅
