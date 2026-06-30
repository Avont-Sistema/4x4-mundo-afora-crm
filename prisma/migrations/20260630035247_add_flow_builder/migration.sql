-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "source" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'novo',
    "handledBy" TEXT NOT NULL DEFAULT 'manual',
    "interest" TEXT,
    "value" REAL,
    "notes" TEXT,
    "lastMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "cpfCnpj" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "birthDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Expedition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "maxPeople" INTEGER NOT NULL,
    "pricePerPerson" REAL NOT NULL,
    "difficulty" TEXT NOT NULL,
    "images" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "paymentStatus" TEXT NOT NULL DEFAULT 'aguardando',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "documents" TEXT,
    "rating" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "supplierId" TEXT,
    "bookingId" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "clientId" TEXT,
    "message" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "triggerData" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FlowStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "delayMin" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FlowStep_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlowRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FlowRun_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlowMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlowMessage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "FlowRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");
