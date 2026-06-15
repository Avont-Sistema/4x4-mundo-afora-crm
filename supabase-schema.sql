-- =============================================================================
-- 4x4 Mundo Afora CRM — Supabase Schema
-- =============================================================================

-- Enums
CREATE TYPE lead_source AS ENUM ('whatsapp', 'google_ads', 'meta_ads', 'instagram', 'website', 'referral', 'manual', 'other');
CREATE TYPE lead_stage AS ENUM ('novo', 'em_atendimento', 'proposta_enviada', 'sem_resposta', 'finalizado');
CREATE TYPE lead_handled_by AS ENUM ('ia', 'manual');

CREATE TYPE supplier_type AS ENUM ('hotel', 'restaurante', 'transporte', 'guia', 'passeio', 'outro');
CREATE TYPE billing_mode AS ENUM ('per_person', 'per_child', 'per_car', 'per_room', 'flat');

CREATE TYPE expedition_status AS ENUM ('planejamento', 'aberta', 'em_andamento', 'fechada', 'finalizada');
CREATE TYPE enrollment_status AS ENUM ('reservado', 'confirmado', 'cancelado');

CREATE TYPE payable_type AS ENUM ('fornecedor', 'despesa', 'comissao', 'outro');
CREATE TYPE payable_status AS ENUM ('pendente', 'pago');

CREATE TYPE conv_mode AS ENUM ('bot', 'human', 'resolved');

-- Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  cpf TEXT UNIQUE,
  birth_date DATE,
  address TEXT,
  address_number TEXT,
  neighborhood TEXT,
  cep TEXT,
  city TEXT,
  state TEXT,
  job TEXT,
  company TEXT,
  weight NUMERIC,
  height NUMERIC,
  shirt_sizes TEXT[],
  room_config TEXT,
  emergency_contact JSONB,
  pet_info TEXT,
  family JSONB,
  vehicle JSONB,
  notes TEXT,
  origin TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fornecedores
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type supplier_type NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  billing_mode billing_mode NOT NULL DEFAULT 'per_person',
  cost_per_person NUMERIC DEFAULT 0,
  cost_per_child NUMERIC DEFAULT 0,
  cost_per_car NUMERIC DEFAULT 0,
  cost_per_room NUMERIC DEFAULT 0,
  flat_fee NUMERIC DEFAULT 0,
  export_fields TEXT[],
  rating NUMERIC,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expedições
CREATE TABLE expeditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL,
  sector TEXT,
  description TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  slots INTEGER DEFAULT 0,
  price_per_person NUMERIC DEFAULT 0,
  price_per_child NUMERIC DEFAULT 0,
  revenue_goal NUMERIC DEFAULT 0,
  status expedition_status NOT NULL DEFAULT 'planejamento',
  closed_at TIMESTAMP,
  supplier_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Custos manuais de expedições
CREATE TABLE manual_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expedition_id UUID NOT NULL REFERENCES expeditions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Matrículas de clientes em expedições
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expedition_id UUID NOT NULL REFERENCES expeditions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  adults INTEGER DEFAULT 0,
  children INTEGER DEFAULT 0,
  agreed_price NUMERIC DEFAULT 0,
  observations TEXT,
  status enrollment_status NOT NULL DEFAULT 'reservado',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pagamentos de matrículas
CREATE TABLE enrollment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  source lead_source NOT NULL,
  stage lead_stage NOT NULL DEFAULT 'novo',
  handled_by lead_handled_by NOT NULL DEFAULT 'manual',
  interest TEXT,
  value NUMERIC,
  notes TEXT,
  last_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contas a pagar
CREATE TABLE payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type payable_type NOT NULL,
  status payable_status NOT NULL DEFAULT 'pendente',
  due_date DATE,
  paid_at TIMESTAMP,
  expedition_id UUID REFERENCES expeditions(id) ON DELETE SET NULL,
  expedition_name TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Configurações globais
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_paused BOOLEAN DEFAULT FALSE,
  operator_notes TEXT,
  business_hours_enabled BOOLEAN DEFAULT FALSE,
  out_of_hours_message TEXT DEFAULT 'Olá! No momento estamos fora do horário de atendimento, mas já já retornamos por aqui. 😊',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Horários de negócio
CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID NOT NULL REFERENCES settings(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  open TEXT NOT NULL,
  close TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Integrações
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anthropic_api_key TEXT,
  agent_model TEXT DEFAULT 'claude-haiku-4-5',
  pix_key TEXT,
  pix_merchant_name TEXT DEFAULT '4x4 Mundo Afora',
  pix_merchant_city TEXT DEFAULT 'SAO PAULO',
  asaas_api_key TEXT,
  asaas_env TEXT DEFAULT 'sandbox',
  asaas_webhook_token TEXT,
  whatsapp_connector_url TEXT,
  whatsapp_connector_token TEXT,
  leads_webhook_token TEXT,
  smtp_host TEXT,
  smtp_port TEXT,
  smtp_user TEXT,
  smtp_password TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversas do WhatsApp
CREATE TABLE conversations (
  phone TEXT PRIMARY KEY,
  contact_name TEXT,
  mode conv_mode NOT NULL DEFAULT 'bot',
  last_message TEXT,
  last_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mensagens de conversa
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL REFERENCES conversations(phone) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  at TIMESTAMP NOT NULL,
  via TEXT CHECK (via IS NULL OR via IN ('bot', 'human')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- Índices
-- =============================================================================

CREATE INDEX idx_clients_cpf ON clients(cpf);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_source ON leads(source);

CREATE INDEX idx_expeditions_status ON expeditions(status);
CREATE INDEX idx_expeditions_start_date ON expeditions(start_date);

CREATE INDEX idx_enrollments_expedition_id ON enrollments(expedition_id);
CREATE INDEX idx_enrollments_client_id ON enrollments(client_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

CREATE INDEX idx_manual_costs_expedition_id ON manual_costs(expedition_id);

CREATE INDEX idx_payables_expedition_id ON payables(expedition_id);
CREATE INDEX idx_payables_supplier_id ON payables(supplier_id);
CREATE INDEX idx_payables_status ON payables(status);

CREATE INDEX idx_conversations_phone ON conversations(phone);
CREATE INDEX idx_conversation_messages_phone ON conversation_messages(phone);
