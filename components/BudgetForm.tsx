import React, { useEffect, useState, useRef } from 'react';
import { Trash2, Plus, Printer, FileDown, Calculator, Save, CheckCircle2, MinusCircle, Package, ChevronRight, ChevronLeft } from 'lucide-react';
import { Budget, BudgetItem, Salesperson } from '../types';
import { formatCurrency, formatDecimal, parseDecimal, maskDocument, maskPhone, generateUUID } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

interface BudgetFormProps {
  budget: Budget;
  onUpdate: (updatedBudget: Budget) => void;
  onDelete: (id: string) => void;
}

// Componente interno para input de moeda (Valor Unitário, Frete, etc)
const CurrencyInput = ({ 
  value, 
  onChange, 
  className, 
  placeholder 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  className?: string;
  placeholder?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(formatDecimal(value));
  
  // Ref para evitar loops de renderização desnecessários
  const lastValueRef = useRef(value);

  useEffect(() => {
    // Sincroniza apenas se o valor externo mudou significativamente (ex: carregamento inicial ou cálculo externo)
    // e se não for igual ao valor que acabamos de parsear (evita cursor pulando)
    const currentParsed = parseDecimal(displayValue);
    
    // Se a diferença for real (mudança externa)
    if (Math.abs(value - lastValueRef.current) > 0.001) {
       setDisplayValue(formatDecimal(value));
       lastValueRef.current = value;
    } else if (Math.abs(value - currentParsed) > 0.001) {
       // Caso raro onde o parse difere do valor (ex: arredondamento)
       // Mas geralmente evitamos atualizar aqui enquanto digita
    }
    
    // Atualiza a ref
    lastValueRef.current = value;
  }, [value, displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Permite apenas dígitos, ponto e vírgula
    if (!/^[\d.,]*$/.test(val)) return;

    setDisplayValue(val);
    const parsed = parseDecimal(val);
    lastValueRef.current = parsed; // Atualiza ref para evitar sobrescrita no useEffect
    onChange(parsed);
  };

  const handleFocus = () => {
    setDisplayValue('');
  };

  const handleBlur = () => {
    setDisplayValue(formatDecimal(value));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  );
};

const AutocompleteDropdown = ({ query, onSelect }: { query: string, onSelect: (p: any) => void }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const { token } = useAuth();
  const lastQuery = useRef('');

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShow(false);
      return;
    }

    if (query === lastQuery.current) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete/products?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShow(data.length > 0);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, token]);

  if (!show) return null;

  return (
    <div className="absolute left-0 top-full w-full bg-white border border-gray-300 shadow-lg z-[200] max-h-48 overflow-y-auto no-print">
      {suggestions.map((p, i) => (
        <div
          key={i}
          className="p-2 hover:bg-gray-100 cursor-pointer text-xs flex justify-between border-b border-gray-100"
          onClick={() => {
            onSelect(p);
            lastQuery.current = p.description;
            setShow(false);
          }}
        >
          <span className="font-bold">{p.description}</span>
          <span className="text-gray-500">{p.unit} - {formatCurrency(p.unit_price)}</span>
        </div>
      ))}
    </div>
  );
};

const BudgetForm: React.FC<BudgetFormProps> = ({ budget, onUpdate, onDelete }) => {
  const [localBudget, setLocalBudget] = useState<Budget>(budget);
  const { token } = useAuth();
  const { showModal } = useModal();
  const [salespersonsList, setSalespersonsList] = useState<{id: string, name: string}[]>([]);
  const hasShownItemSaveRef = useRef(false);

  useEffect(() => {
    fetch('/api/salespersons', {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setSalespersonsList(data))
    .catch(console.error);
  }, [token]);

  useEffect(() => {
    setLocalBudget(budget);
    hasShownItemSaveRef.current = false;
  }, [budget.id]);

  useEffect(() => {
    document.title = `${localBudget.id} - ${localBudget.client.name || 'Novo'}`;
  }, [localBudget.id, localBudget.client.name]);

  const updateBudget = (newData: Budget) => {
    // Recalculate numbering and totals
    const items = [...newData.items];
    const counters: number[] = [];

    items.forEach((item, index) => {
      let level = item.level || 0;

      // Clamping logic: first item is always level 0, subsequent items can be at most prevItem.level + 1
      if (index === 0) {
        level = 0;
      } else {
        const prevLevel = items[index - 1].level || 0;
        if (level > prevLevel + 1) level = prevLevel + 1;
      }
      item.level = level;

      // Reset counters for deeper levels
      while (counters.length > level + 1) counters.pop();
      // Initialize counter for current level if it doesn't exist
      while (counters.length <= level) counters.push(0);

      counters[level]++;
      // Reset counters for levels below the current one
      for (let i = level + 1; i < counters.length; i++) counters[i] = 0;

      item.itemNumber = counters.slice(0, level + 1).join('.');

      if (item.isTopic) {
        // Calculate total for this topic
        let topicTotal = 0;
        for (let j = index + 1; j < items.length; j++) {
          const nextItem = items[j];
          if (nextItem.level !== undefined && nextItem.level <= level) break;
          if (!nextItem.isTopic) {
            topicTotal += nextItem.total;
          }
        }
        item.total = topicTotal;
      }
    });

    const finalData = { ...newData, items };
    setLocalBudget(finalData);
    onUpdate(finalData);
  };

  const handleClientChange = (field: keyof typeof localBudget.client, value: string) => {
    let finalValue = value.toUpperCase();
    if (field === 'document') finalValue = maskDocument(finalValue);
    if (field === 'phone') finalValue = maskPhone(finalValue);
    const updatedClient = { ...localBudget.client, [field]: finalValue };
    updateBudget({ ...localBudget, client: updatedClient, lastModified: Date.now() });
  };

  const handleAddItem = () => {
    const lastItem = localBudget.items[localBudget.items.length - 1];
    let level = 0;
    if (lastItem) {
      level = lastItem.isTopic ? (lastItem.level || 0) + 1 : (lastItem.level || 0);
    }
    const newItem: BudgetItem = {
      id: generateUUID(),
      itemNumber: '',
      description: '',
      quantity: 1,
      unit: 'M',
      unitPrice: 0,
      discountPercent: 0,
      total: 0,
      isTopic: false,
      level: level
    };
    const newItems = [...localBudget.items, newItem];
    updateBudget({ ...localBudget, items: newItems, lastModified: Date.now() });
    
    if (!hasShownItemSaveRef.current) {
      showSaveMessage();
      hasShownItemSaveRef.current = true;
    }
  };

  const handleAddTopic = () => {
    const lastItem = localBudget.items[localBudget.items.length - 1];
    let level = 0;
    if (lastItem) {
      level = lastItem.isTopic ? (lastItem.level || 0) + 1 : (lastItem.level || 0);
    }
    const newItem: BudgetItem = {
      id: generateUUID(),
      itemNumber: '',
      description: '',
      quantity: 1,
      unit: 'M',
      unitPrice: 0,
      discountPercent: 0,
      total: 0,
      isTopic: true,
      level: level
    };
    const newItems = [...localBudget.items, newItem];
    updateBudget({ ...localBudget, items: newItems, lastModified: Date.now() });
  };

  const handleRemoveItem = (itemId: string) => {
    const newItems = localBudget.items.filter(item => item.id !== itemId);
    updateBudget({ ...localBudget, items: newItems, lastModified: Date.now() });
  };

  const handleIndent = (id: string, delta: number) => {
    const newItems = localBudget.items.map(item => {
      if (item.id !== id) return item;
      const newLevel = Math.max(0, (item.level || 0) + delta);
      return { ...item, level: newLevel };
    });
    updateBudget({ ...localBudget, items: newItems, lastModified: Date.now() });
  };

  const handleItemChange = (id: string, field: keyof BudgetItem, value: string | number) => {
    handleMultipleItemChange(id, { [field]: value });
  };

  const handleMultipleItemChange = (id: string, updates: Partial<BudgetItem>) => {
    const newItems = localBudget.items.map(item => {
      if (item.id !== id) return item;
      const updatedItem = { ...item, ...updates };
      
      const qty = updatedItem.quantity;
      const price = updatedItem.unitPrice;
      const disc = updatedItem.discountPercent;
      updatedItem.total = qty * price * (1 - disc / 100);

      if (updates.description !== undefined) {
        updatedItem.description = String(updates.description).toUpperCase();
      }
      return updatedItem;
    });
    updateBudget({ ...localBudget, items: newItems, lastModified: Date.now() });
  };

  const totalItemsValue = localBudget.items.reduce((acc, item) => item.isTopic ? acc : acc + item.total, 0);
  const totalQuantity = localBudget.items.reduce((acc, item) => acc + Number(item.quantity), 0);
  
  // New calculations
  const discountValue = totalItemsValue * (localBudget.globalDiscountPercent / 100);
  const shippingCost = localBudget.shippingCost || 0;
  const otherExpenses = localBudget.otherExpenses || 0;
  
  const finalTotal = totalItemsValue - discountValue + shippingCost + otherExpenses;

  const [saveMessage, setSaveMessage] = useState('');

  const showSaveMessage = () => {
    setSaveMessage('Orçamento salvo com sucesso!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleSave = () => {
    onUpdate(localBudget);
    showSaveMessage();
  };

  const handlePrint = () => {
    if (!localBudget.client.name) {
      showModal({
        title: 'Dados Incompletos',
        message: 'Por favor, preencha o nome do cliente antes de imprimir.',
        type: 'warning'
      });
      return;
    }
    handleSave();
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto p-8 bg-white shadow-xl min-h-[29.7cm] print:min-h-0 print:shadow-none print:w-full print:max-w-none print:p-0">
      
      {/* Toast Notification */}
      {saveMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-[100] no-print">
          <CheckCircle2 size={20} />
          <span className="font-medium text-sm">{saveMessage}</span>
        </div>
      )}

      {/* Cabeçalho do Relatório */}
      <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-gray-900 pb-6 mb-6 print:flex-row print:pb-4 print:mb-4">
        <div className="flex flex-col items-center md:items-start print:items-start">
           <img 
            src="https://luziluminacao.com.br/logo-preta.png" 
            alt="Luz Iluminação" 
            className="h-20 object-contain mb-2 block"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML += '<div class="h-16 text-black flex items-center font-bold text-2xl tracking-widest border border-black px-4">LUZ ILUMINAÇÃO</div>';
            }}
          />
          <div className="text-xs text-gray-600 mt-1 space-y-0.5 print:text-black">
            <p className="font-bold uppercase text-sm text-gray-900">Luz Iluminação Com. de Artigos de Iluminação LTDA</p>
            <p>CNPJ: 61.583.596/0001-94</p>
            <p>Rua Barão de Souza Leão, Nº 1139, Boa Viagem - Recife/PE</p>
            <p>1º Andar, Sala 4, CEP: 51.030-300</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 text-center md:text-right text-sm text-gray-600 print:text-right print:text-black">
          <div className="bg-gray-100 p-3 rounded print:bg-transparent print:p-0 print:border print:border-gray-300 print:px-4 print:py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 print:text-black">Orçamento Nº</p>
            <p className="text-3xl font-bold text-gray-900 leading-none">{localBudget.id}</p>
          </div>
          <div className="mt-2 space-y-1">
            <p>Data: <b>{new Date(localBudget.createdAt).toLocaleDateString('pt-BR')}</b></p>
            <p>Validade: <b>15 Dias</b></p>
            <p className="text-xs mt-2 font-bold">Contatos:</p>
            <p>(81) 9 9540-4746</p>
            <p>(81) 9 9186-3342</p>
          </div>
        </div>
      </div>

      {/* Dados do Cliente - Layout Otimizado para Impressão */}
      <div className="mb-8 print:mb-4 border border-gray-200 rounded p-4 print:border-gray-400 print:p-2">
        <h2 className="text-xs font-bold uppercase text-gray-500 mb-3 border-b border-gray-100 pb-1 print:text-black print:border-gray-300">Dados do Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-3 gap-x-4 print:grid-cols-12 print:gap-y-1 print:text-sm">
          
          <div className="md:col-span-8 print:col-span-8 relative">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Nome do Cliente</label>
            <input 
              id="clientNameInput"
              type="text" 
              className="w-full border-b border-gray-300 px-1 py-1 focus:outline-none focus:border-black uppercase font-bold text-gray-900 bg-transparent"
              value={localBudget.client.name}
              onChange={(e) => handleClientChange('name', e.target.value)}
              placeholder="Digite o nome..."
            />
          </div>
          <div className="md:col-span-4 print:col-span-4">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">CPF / CNPJ</label>
            <input 
              type="text" 
              inputMode="numeric"
              className="w-full border-b border-gray-300 px-1 py-1 focus:outline-none focus:border-black uppercase font-bold text-gray-900 bg-transparent"
              value={localBudget.client.document}
              onChange={(e) => handleClientChange('document', e.target.value)}
              placeholder="..."
            />
          </div>
          
          <div className="md:col-span-8 print:col-span-8">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Endereço</label>
            <input 
              type="text" 
              className="w-full border-b border-gray-300 px-1 py-1 focus:outline-none focus:border-black uppercase font-bold text-gray-900 bg-transparent"
              value={localBudget.client.address}
              onChange={(e) => handleClientChange('address', e.target.value)}
              placeholder="..."
            />
          </div>
          <div className="md:col-span-4 print:col-span-4">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Telefone / WhatsApp</label>
            <input 
              type="text" 
              inputMode="tel"
              className="w-full border-b border-gray-300 px-1 py-1 focus:outline-none focus:border-black uppercase font-bold text-gray-900 bg-transparent"
              value={localBudget.client.phone}
              onChange={(e) => handleClientChange('phone', e.target.value)}
              placeholder="..."
            />
          </div>

          <div className="md:col-span-5 print:col-span-5">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">E-mail</label>
            <input 
              type="email" 
              inputMode="email"
              className="w-full border-b border-gray-300 px-1 py-1 focus:outline-none focus:border-black uppercase font-bold text-gray-900 bg-transparent"
              value={localBudget.client.email}
              onChange={(e) => handleClientChange('email', e.target.value)}
              placeholder="..."
            />
          </div>
          <div className="md:col-span-4 print:col-span-4">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Profissional / Arquiteto(a)</label>
            <input 
              type="text" 
              className="w-full border-b border-gray-300 px-1 py-1 focus:outline-none focus:border-black uppercase font-bold text-gray-900 bg-transparent"
              value={localBudget.client.architect}
              onChange={(e) => handleClientChange('architect', e.target.value)}
              placeholder="..."
            />
          </div>
          <div className="md:col-span-3 print:col-span-3">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Vendedora</label>
            <div className="relative">
                <select 
                className="w-full border-b border-gray-300 px-1 py-1 focus:outline-none focus:border-black uppercase bg-transparent appearance-none text-gray-900 font-bold"
                value={localBudget.client.salesperson}
                onChange={(e) => handleClientChange('salesperson', e.target.value)}
                >
                <option value="">SELECIONE</option>
                {/* DB list */}
                {salespersonsList.map(s => (
                    <option key={`db-${s.id}`} value={s.name}>{s.name}</option>
                ))}
                {localBudget.client.salesperson && !salespersonsList.find(s => s.name === localBudget.client.salesperson) && (
                    <option value={localBudget.client.salesperson}>{localBudget.client.salesperson}</option>
                )}
                </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Itens */}
      <div className="mb-6">
        <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 uppercase text-[10px] font-bold text-gray-600 print:bg-gray-200 print:text-black">
                <tr>
                    <th className="px-2 py-2 border border-gray-300 text-center w-10">#</th>
                    <th className="px-2 py-2 border border-gray-300">Descrição do Produto</th>
                    <th className="px-2 py-2 border border-gray-300 text-center w-12">Unid.</th>
                    <th className="px-2 py-2 border border-gray-300 text-center w-16">Qtd.</th>
                    <th className="px-2 py-2 border border-gray-300 text-right w-24">Vl. Unit.</th>
                    <th className="px-2 py-2 border border-gray-300 text-center w-16">Desc%</th>
                    <th className="px-2 py-2 border border-gray-300 text-right w-24">Total</th>
                    <th className="px-1 py-1 w-8 no-print border-none bg-white"></th>
                </tr>
            </thead>
            <tbody className="text-gray-800">
                {localBudget.items.map((item) => (
                    <tr key={item.id} className={`transition-colors print:hover:bg-transparent ${item.isTopic ? 'bg-gray-200 font-bold' : 'hover:bg-gray-50'}`}>
                        <td className={`px-2 py-1 border border-gray-300 text-center text-xs ${item.isTopic ? 'font-bold' : 'font-normal'}`}>
                            {item.itemNumber}
                        </td>
                        <td
                          className="px-2 py-1 border border-gray-300 relative"
                          style={{ paddingLeft: `${(item.level || 0) * 1.5 + 0.5}rem` }}
                          colSpan={item.isTopic ? 5 : 1}
                        >
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col no-print">
                                <button onClick={() => handleIndent(item.id, 1)} className="text-gray-400 hover:text-indigo-600" title="Aumentar Nível"><ChevronRight size={10} /></button>
                                <button onClick={() => handleIndent(item.id, -1)} className="text-gray-400 hover:text-indigo-600" title="Diminuir Nível"><ChevronLeft size={10} /></button>
                              </div>
                              <input
                                  type="text"
                                  className={`w-full bg-transparent border-none focus:ring-0 p-0 uppercase text-xs ${item.isTopic ? 'font-bold' : 'font-normal'}`}
                                  value={item.description}
                                  placeholder={item.isTopic ? "TÓPICO..." : "DESCRIÇÃO..."}
                                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                  autoComplete="off"
                              />
                              {!item.isTopic && (
                                <AutocompleteDropdown
                                  query={item.description}
                                  onSelect={(p) => {
                                    handleMultipleItemChange(item.id, {
                                      description: p.description,
                                      unit: p.unit,
                                      unitPrice: p.unit_price
                                    });
                                  }}
                                />
                              )}
                            </div>
                        </td>
                        {!item.isTopic && (
                          <>
                            <td className="px-2 py-1 border border-gray-300">
                                <select
                                    className="w-full bg-transparent text-center focus:outline-none p-0 text-xs font-normal appearance-none cursor-pointer"
                                    value={item.unit}
                                    onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                >
                                    <option value="M">M</option>
                                    <option value="M2">M2</option>
                                    <option value="M3">M3</option>
                                    <option value="CM">CM</option>
                                    <option value="MM">MM</option>
                                    <option value="UN">UN</option>
                                </select>
                            </td>
                            <td className="px-2 py-1 border border-gray-300">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    className="w-full bg-transparent text-center focus:outline-none p-0 text-xs font-normal"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                />
                            </td>
                            <td className="px-2 py-1 border border-gray-300 text-right">
                                <CurrencyInput
                                    className="w-full bg-transparent text-right focus:outline-none p-0 text-xs font-normal"
                                    value={item.unitPrice}
                                    onChange={(val) => handleItemChange(item.id, 'unitPrice', val)}
                                />
                            </td>
                            <td className="px-2 py-1 border border-gray-300 text-center">
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    max="100"
                                    className="w-full bg-transparent text-center focus:outline-none p-0 text-xs font-normal"
                                    value={item.discountPercent}
                                    onChange={(e) => handleItemChange(item.id, 'discountPercent', e.target.value)}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                />
                            </td>
                          </>
                        )}
                        <td className={`px-2 py-1 border border-gray-300 text-right font-bold text-xs ${item.isTopic ? 'bg-indigo-50/50' : 'bg-gray-50'} print:bg-transparent`}>
                            {formatCurrency(item.total)}
                        </td>
                        <td className="px-1 py-1 text-center no-print border-none">
                            <button 
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-gray-300 hover:text-red-600 transition-colors"
                                tabIndex={-1}
                            >
                                <Trash2 size={14} />
                            </button>
                        </td>
                    </tr>
                ))}
                {/* Linhas vazias para preencher visualmente se tiver poucos itens (apenas na impressão) */}
                {localBudget.items.length < 5 && (
                    <tr className="print:table-row hidden h-8 border border-gray-300">
                      <td colSpan={7} className="bg-gray-50 opacity-20"></td>
                    </tr>
                )}
            </tbody>
        </table>

        <div className="flex gap-4 mt-3 no-print">
          <button
              onClick={handleAddItem}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide"
          >
              <Plus size={14} />
              Adicionar Item
          </button>
          <button
              onClick={handleAddTopic}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide"
          >
              <Plus size={14} />
              Adicionar Tópico
          </button>
        </div>
      </div>

      {/* Rodapé do Relatório: Totais e Observações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4 print:mt-4">
        
        {/* Observações */}
        <div className="flex flex-col h-full">
            <div className="border border-gray-300 rounded h-full flex flex-col p-2 print:border-gray-400">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 bg-white px-1 -mt-4 w-max">Observações</label>
                <textarea 
                    className="w-full h-full resize-none border-none focus:ring-0 uppercase text-xs p-1 bg-transparent"
                    value={localBudget.client.notes}
                    onChange={(e) => handleClientChange('notes', e.target.value)}
                    placeholder="Prazos de entrega, condições de pagamento, detalhes técnicos..."
                />
            </div>
        </div>

        {/* Quadro de Totais */}
        <div className="flex flex-col justify-end">
            <div className="border border-gray-300 rounded p-4 bg-gray-50 print:bg-transparent print:border-gray-400 print:p-2">
                <div className="flex justify-between items-center mb-1 text-xs text-gray-600 print:text-black">
                    <span>Qtd. Itens:</span>
                    <span>{totalQuantity}</span>
                </div>
                <div className="flex justify-between items-center mb-1 text-xs text-gray-600 print:text-black">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totalItemsValue)}</span>
                </div>
                
                {/* Desconto Global */}
                <div className="flex justify-between items-center mb-1 text-xs text-gray-600 print:text-black">
                    <span className="flex items-center gap-1">
                        Desconto Global:
                        <input 
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            className="w-10 text-right border-b border-gray-400 bg-transparent focus:outline-none font-bold text-black"
                            value={localBudget.globalDiscountPercent}
                            onChange={(e) => updateBudget({...localBudget, globalDiscountPercent: Number(e.target.value)})}
                        />
                        %
                    </span>
                    <span className="text-red-600 print:text-black">
                         - {formatCurrency(discountValue)}
                    </span>
                </div>

                 {/* Frete */}
                 <div className="flex justify-between items-center mb-1 text-xs text-gray-600 print:text-black">
                    <span className="flex items-center gap-1">
                        Frete / Entrega:
                    </span>
                    <div className="flex items-center justify-end border-b border-gray-400">
                        <span className="text-xs mr-1">R$</span>
                        <CurrencyInput 
                            className="w-20 text-right bg-transparent focus:outline-none font-medium text-black"
                            value={localBudget.shippingCost || 0}
                            placeholder="0,00"
                            onChange={(val) => updateBudget({...localBudget, shippingCost: val})}
                        />
                    </div>
                </div>

                {/* Outras Despesas */}
                <div className="flex justify-between items-center mb-2 text-xs text-gray-600 print:text-black">
                    <span className="flex items-center gap-1">
                        Outras Despesas:
                    </span>
                    <div className="flex items-center justify-end border-b border-gray-400">
                        <span className="text-xs mr-1">R$</span>
                        <CurrencyInput 
                            className="w-20 text-right bg-transparent focus:outline-none font-medium text-black"
                            value={localBudget.otherExpenses || 0}
                            placeholder="0,00"
                            onChange={(val) => updateBudget({...localBudget, otherExpenses: val})}
                        />
                    </div>
                </div>

                <div className="border-t-2 border-gray-800 pt-2 flex justify-between items-end mt-2 print:border-black">
                    <span className="text-sm font-bold text-gray-800 uppercase print:text-black">Total a Pagar</span>
                    <span className="text-2xl font-bold text-black">{formatCurrency(finalTotal)}</span>
                </div>
            </div>

            {/* Assinatura (Apenas Print) */}
            <div className="hidden print:block mt-8 pt-8 border-t border-gray-400 text-center">
                 <p className="text-xs uppercase text-gray-500">Assinatura do Responsável / Cliente</p>
            </div>
        </div>
      </div>

      {/* Canhoto de Entrega (Stub) - Compacto em uma linha */}
      <div className="mt-2 pt-4 border-t border-dashed border-gray-400 print:mt-auto print:pt-4 print:break-inside-avoid w-full">
        <div className="flex flex-col md:flex-row print:flex-row items-start md:items-end print:items-end justify-between gap-4 text-[9px] font-bold uppercase text-gray-600">
            {/* Texto de Recebimento */}
            <span className="shrink-0 pb-0.5">Recebemos de LUZ ILUMINAÇÃO os produtos deste pedido</span>

            <div className="flex flex-wrap md:flex-nowrap print:flex-nowrap items-end gap-4 w-full md:w-auto print:w-auto">
                {/* Data */}
                <div className="flex items-end gap-1 shrink-0">
                   <span className="pb-0.5">Data:</span>
                   <span className="text-xs font-normal tracking-widest text-black">___/___/______</span>
                </div>

                {/* Assinatura */}
                <div className="flex items-end gap-1 flex-1 min-w-[150px]">
                   <span className="pb-0.5 shrink-0">Assinatura:</span>
                   <div className="border-b border-black flex-1"></div>
                </div>

                 {/* Número do Pedido */}
                 <div className="flex items-end gap-1 shrink-0 pb-0.5">
                     <span>Nº Pedido:</span>
                     <span className="text-sm font-bold text-black leading-none">{localBudget.id}</span>
                 </div>
            </div>
        </div>
      </div>

      {/* Botões de Ação Fixos */}
      <div className="mt-12 flex flex-col-reverse sm:flex-row justify-between gap-3 border-t border-gray-200 pt-6 no-print">
        <button 
            onClick={() => onDelete(localBudget.id)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded transition-colors text-sm font-medium w-full sm:w-auto"
        >
            <Trash2 size={16} />
            Excluir
        </button>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
                onClick={handleSave}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-all shadow-sm text-sm font-medium w-full sm:w-auto"
                title="Salvar orçamento atual"
            >
                <Save size={16} />
                Salvar Orçamento
            </button>
            <button 
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-gray-900 text-white hover:bg-black rounded transition-all shadow-lg text-sm font-medium w-full sm:w-auto"
            >
                <Printer size={16} />
                Imprimir / PDF
            </button>
        </div>
      </div>

    </div>
  );
};

export default BudgetForm;