import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'luz-super-secret-key-2026';

// Middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const adminMiddleware = (req: any, res: any, next: any) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Acesso negado' });
  next();
};

router.use(authMiddleware);

// ================= USERS =================
router.get('/users', (req: any, res) => {
  if (req.user.is_admin) {
    const users = db.prepare(`
        SELECT u.id, u.name, u.email, u.is_admin, u.is_active, u.created_at,
               (SELECT COUNT(*) FROM budgets b WHERE b.user_id = u.id) as budget_count
        FROM users u
        ORDER BY u.name ASC
      `).all();
      res.json(users);
  } else {
    const users = db.prepare(`
        SELECT u.id, u.name
        FROM users u
        WHERE u.is_active = 1
        ORDER BY u.name ASC
    `).all();
    res.json(users);
  }
});

router.post('/users', adminMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'O primeiro nome é obrigatório' });
  
  // Create a dummy email to bypass the UNIQUE NOT NULL DB requirement without needing migration
  const dummyEmail = crypto.randomUUID() + '@luz.local';

  try {
    const existingName = db.prepare('SELECT id FROM users WHERE name = ? COLLATE NOCASE').get(name);
    if(existingName) return res.status(400).json({ error: 'Já existe um usuário com esse nome' });

    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync('142536', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password, is_active, force_reset, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, dummyEmail, hash, 1, 1, Date.now());
    res.json({ message: 'Usuário cadastrado com sucesso!' });
  } catch (e: any) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/users/:id/reset-password', adminMiddleware, (req, res) => {
  const { id } = req.params;
  try {
    const userToUpdate = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(id) as any;
    if (!userToUpdate) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    // allow reset password even for admin if needed, or maybe restrict? The prompt: "no modulo usuário crie um botão para redefinição de senha ao apertar o usuário volta a logar com a senha padrão para fazer a redefinição"
    const hash = bcrypt.hashSync('142536', 10);
    db.prepare('UPDATE users SET password = ?, force_reset = 1 WHERE id = ?').run(hash, id);
    res.json({ message: 'Senha redefinida para a padrão (142536)' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

router.put('/users/:id/toggle', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  if (id === req.user?.id) return res.status(400).json({ error: 'Você não pode alterar seu próprio status.' });

  try {
    const userToUpdate = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(id) as any;
    if (!userToUpdate) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (userToUpdate.is_admin === 1) return res.status(400).json({ error: 'Não é possível desativar um administrador.' });

    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id);
    res.json({ message: 'Status atualizado com sucesso' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

router.delete('/users/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;
  if (id === req.user?.id) return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário.' });

  try {
    const userToUpdate = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(id) as any;
    if (!userToUpdate) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (userToUpdate.is_admin === 1) return res.status(400).json({ error: 'Não é possível excluir um administrador.' });

    // Check if user has budgets
    const budgetCount = db.prepare('SELECT COUNT(*) as c FROM budgets WHERE user_id = ?').get(id) as any;
    if (budgetCount && budgetCount.c > 0) {
      return res.status(400).json({ error: 'Não é possível excluir um usuário que possui orçamentos associados. Desative o acesso dele em vez disso.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// ================= SALESPERSONS =================
router.get('/salespersons', (req, res) => {
  const users = db.prepare('SELECT id, name FROM users WHERE is_admin = 0 AND is_active = 1 ORDER BY name ASC').all();
  res.json(users);
});

// ================= BUDGETS =================
router.get('/budgets', (req: any, res) => {
  // Everyone sees all budgets now
  let budgets = db.prepare('SELECT * FROM budgets ORDER BY created_at DESC').all();
  // Parse data JSON
  budgets = budgets.map((b: any) => ({ ...JSON.parse(b.data), user_id: b.user_id }));
  res.json(budgets);
});

router.post('/budgets', (req: any, res) => {
  const budget = req.body;
  if (!budget.id) return res.status(400).json({ error: 'ID do orçamento inválido' });
  
  const existing = db.prepare('SELECT id, user_id FROM budgets WHERE id = ?').get(budget.id) as any;
  
  if (existing) {
    if (!req.user.is_admin && existing.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Não autorizado a modificar este orçamento' });
    }
    db.prepare('UPDATE budgets SET data = ? WHERE id = ?').run(JSON.stringify(budget), budget.id);
  } else {
    db.prepare('INSERT INTO budgets (id, user_id, data, created_at) VALUES (?, ?, ?, ?)').run(
        budget.id, req.user.id, JSON.stringify(budget), Date.now()
    );
  }

  // Save client for autocomplete
  if (budget.client?.name) {
    const { name, document, address, phone, email, architect, salesperson } = budget.client;
    try {
        const existingClient = db.prepare('SELECT id FROM clients WHERE name = ? COLLATE NOCASE').get(name) as any;
        if (existingClient) {
            db.prepare(`
                UPDATE clients SET 
                    document=?, address=?, phone=?, email=?, architect=?, salesperson=?
                WHERE id=?
            `).run(document || '', address || '', phone || '', email || '', architect || '', salesperson || '', existingClient.id);
        } else {
            db.prepare(`
                INSERT INTO clients (id, name, document, address, phone, email, architect, salesperson, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(crypto.randomUUID(), name, document || '', address || '', phone || '', email || '', architect || '', salesperson || '', Date.now());
        }
    } catch(e) {}
  }

  // Save products for autocomplete
  if (budget.items && Array.isArray(budget.items)) {
    const insertProd = db.prepare(`
      INSERT OR IGNORE INTO products (id, description, unit_price) VALUES (?, ?, ?)
    `);
    const updateProd = db.prepare(`
        UPDATE products SET unit_price = ? WHERE description = ?
    `);
    db.transaction(() => {
        budget.items.forEach((item: any) => {
            if (item.description) {
                insertProd.run(crypto.randomUUID(), item.description, item.unitPrice || 0);
                updateProd.run(item.unitPrice || 0, item.description);
            }
        });
    })();
  }

  res.json({ success: true });
});

router.delete('/budgets/:id', (req: any, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT user_id FROM budgets WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Não encontrado' });
  
  if (!req.user.is_admin && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Não autorizado' });
  }

  db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
  res.json({ success: true });
});

// ================= AUTOCOMPLETE =================
router.get('/autocomplete/clients', (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.json([]);
  const clients = db.prepare(`
    SELECT id, name, document, phone, email, salesperson, address, architect 
    FROM clients 
    WHERE name LIKE ? OR document LIKE ? OR phone LIKE ? 
    GROUP BY name COLLATE NOCASE
    LIMIT 10
  `).all(`%${q}%`, `%${q}%`, `%${q}%`);
  res.json(clients);
});

router.get('/autocomplete/products', (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.json([]);
  const products = db.prepare(`
    SELECT description, MAX(unit_price) as unit_price 
    FROM products 
    WHERE description LIKE ? 
    GROUP BY description COLLATE NOCASE
    LIMIT 10
  `).all(`%${q}%`);
  res.json(products);
});

export default router;
