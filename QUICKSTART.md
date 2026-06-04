# 🚀 Quick Start - 4x4 Mundo Afora CRM

## ⚡ Instalação Rápida (3 minutos)

### 1. Dependências
```bash
cd "D:\4X4 - MATRIZ"
npm install --legacy-peer-deps
```

### 2. Variáveis de Ambiente
Crie `.env.local` na raiz:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# Auth (deixar em branco por enquanto)
NEXTAUTH_SECRET="seu-secret-dev"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (obter em dashboard.stripe.com)
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Claude IA (obter em anthropic.com)
ANTHROPIC_API_KEY="sk-ant-..."

# Email (Gmail, SendGrid, etc)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="seu-email@gmail.com"
SMTP_PASSWORD="sua-senha-app"
```

### 3. Banco de Dados
```bash
npx prisma migrate dev
npx prisma studio  # (opcional - UI para gerenciar DB)
```

### 4. Rodar
```bash
npm run dev
```
Acessa: **http://localhost:3000**

---

## 📱 Testando as Funcionalidades

### Home & Auth
- **/** → Landing page com features
- **/login** → Login (qualquer email/senha funciona)
- **/register** → Registrar

### Dashboard Principal
- **/dashboard** → Métricas e gráficos
  - 4 cards com estatísticas
  - 3 gráficos (leads, receita, distribuição)

### Gerenciamento de Dados
| Seção | URL | Funcionalidade |
|-------|-----|-------------|
| **Leads** | `/dashboard/leads` | CRUD completo + busca + status |
| **Clientes** | `/dashboard/clients` | CRUD com dados pessoais |
| **Expedições** | `/dashboard/expeditions` | Criar/editar/deletar expedições |
| **Reservas** | `/dashboard/bookings` | Visualizar reservas |
| **Fornecedores** | `/dashboard/suppliers` | CRUD com avaliação |
| **Financeiro** | `/dashboard/financial` | Dashboard + registro transações |

### 💬 IA WhatsApp ⭐ (NOVA FASE 3)
- **/dashboard/whatsapp** → Chat funcional com Claude IA
  - **Teste**: Digite "Qual a próxima expedição?"
  - **Resposta**: Bot responde sobre expedições disponíveis
  - **Vendas**: "Quero 2 lugares na Lençóis"
  - **Pagamento**: "Gere um link de pagamento"

### 💳 Pagamentos (NOVA FASE 2)
- **/checkout** → Página de checkout (teste pagamento)
  - Simula envio para Stripe
  - Webhook de confirmação

### 📧 Campanhas de Email (NOVA FASE 2)
- **/dashboard/campaigns** → Enviar emails em massa para leads
  - Selecione leads
  - Escreva mensagem
  - Envie campanha

---

## 🔑 Credenciais para Teste

Como tudo é mock/local, você pode usar dados fictícios:

**Login**:
- Email: `teste@gmail.com`
- Senha: `123456`

**Criar Leads/Clientes**:
- Nome: Qualquer nome
- Email: `seu-email@teste.com`
- Telefone: `11999999999`

---

## 🤖 IA WhatsApp - Como Funciona

A IA é alimentada por Claude 3.5 Sonnet. Exemplos de interações:

### Perguntas sobre Expedições
```
👤 Qual a próxima expedição?
🤖 Temos 3 expedições disponíveis: Lençóis Maranhenses (R$2.500), Vale da Lua (R$1.800), ...
```

### Processamento de Reserva
```
👤 Quero 2 lugares na Lençóis para julho
🤖 Ótimo! Para confirmar a reserva preciso: nome completo, email, telefone
```

### Geração de Link de Pagamento
```
👤 Preciso de um link para pagar
🤖 Segue o link seguro de checkout: https://4x4mundoafora.com/checkout
```

### Envio de Mídia
```
👤 Enviem fotos das expedições
🤖 Você receberá em breve um email com galeria de fotos de todas nossas expedições
```

---

## 🛠️ Troubleshooting

### "Port 3000 já está em uso"
```bash
npx kill-port 3000
npm run dev
```

### "Erro ao compilar TypeScript"
```bash
rm -rf .next
npm run build
```

### "Erro ao conectar com Stripe"
Verifique se `STRIPE_SECRET_KEY` está configurado em `.env.local`

### "IA não responde"
Verifique se `ANTHROPIC_API_KEY` está configurado e válido

---

## 📊 Estrutura do Projeto

```
src/app/
├── page.tsx (Home)
├── checkout/page.tsx (Stripe checkout)
├── login/ + register/ (Auth pages)
└── dashboard/
    ├── layout.tsx (Sidebar nav)
    ├── page.tsx (Dashboard principal)
    ├── leads/page.tsx
    ├── clients/page.tsx
    ├── expeditions/page.tsx
    ├── bookings/page.tsx
    ├── suppliers/page.tsx
    ├── financial/page.tsx
    ├── campaigns/page.tsx (Email marketing)
    └── whatsapp/page.tsx (IA Chat)

src/app/api/
├── payments/create-checkout/ (Stripe checkout)
├── payments/webhook/ (Stripe webhooks)
├── emails/send-campaign/ (Email marketing)
└── whatsapp/message/ (IA Claude)
```

---

## 🚀 Próximas Fases

- **Fase 4**: Deploy Vercel + PostgreSQL
- **Fase 5**: Autenticação real + Admin panel
- **Fase 6**: Escalabilidade + Monetização

---

## 📞 Suporte

- Email: regesjunioroficial8@gmail.com
- Instagram: @4x4mundoafora

---

**Versão**: 1.3.0 (Fase 1 + Fase 2 + Fase 3)  
**Status**: 🟢 Pronto para testar localmente
