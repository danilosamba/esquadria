import { Budget } from './types';

// Gera um ID de orçamento no formato: 1 Letra maiúscula e 5 Números (Posição aleatória)
export const generateBudgetNumber = (existingBudgets: Budget[]): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let newId = '';
  let isUnique = false;

  while (!isUnique) {
    const letter = letters.charAt(Math.floor(Math.random() * letters.length));
    const nums = Array.from({ length: 5 }, () => numbers.charAt(Math.floor(Math.random() * numbers.length)));
    
    // Insere a letra em uma posição aleatória (0 a 5)
    const position = Math.floor(Math.random() * 6);
    nums.splice(position, 0, letter);
    
    newId = nums.join('');

    // Verifica conflito
    if (!existingBudgets.some(b => b.id === newId)) {
      isUnique = true;
    }
  }

  return newId;
};

// Formata moeda para BRL (com símbolo R$)
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Formata número decimal para PT-BR (sem símbolo, ex: 1.234,56)
export const formatDecimal = (value: number): string => {
  if (value === undefined || value === null || isNaN(value)) return '0,00';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Parse string PT-BR para number
export const parseDecimal = (value: string): number => {
  if (!value) return 0;
  // Remove pontos de milhar e substitui vírgula decimal por ponto
  const clean = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

// Máscara para CPF/CNPJ
export const maskDocument = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 11) {
    // CPF
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  } else {
    // CNPJ
    return clean
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
};

// Máscara para Telefone (xx) x xxxx-xxxx
export const maskPhone = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  return clean
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2')
    .slice(0, 16); // Limita tamanho
};

// Gera ID único para itens
export const generateUUID = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};