// Definições de tipos para o sistema de orçamentos

export enum Salesperson {
  NAQUELINE = 'NAQUELINE',
  MYLENA = 'MYLENA',
  YASMIN = 'YASMIN',
  UNSELECTED = ''
}

export interface BudgetItem {
  id: string;
  itemNumber: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  total: number;
  isTopic?: boolean;
  level?: number;
}

export interface ClientInfo {
  name: string;
  document: string; // CPF ou CNPJ
  address: string;
  email: string;
  phone: string;
  architect: string;
  salesperson: Salesperson | string;
  notes: string;
}

export interface Budget {
  id: string; // O código de 6 dígitos (ex: A12345)
  user_id?: string;
  createdAt: number;
  lastModified: number;
  client: ClientInfo;
  items: BudgetItem[];
  globalDiscountPercent: number;
  shippingCost: number;
  otherExpenses: number;
}

// Interface para exportação/importação
export interface BudgetBackup {
  version: number;
  data: Budget[];
}