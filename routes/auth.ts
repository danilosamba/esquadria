import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'luz-super-secret-key-2026';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });

  const user = db.prepare('SELECT * FROM users WHERE name = ? COLLATE NOCASE').get(username) as any;
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
  if (user.is_active === 0) return res.status(401).json({ error: 'Conta desativada. Entre em contato com um administrador.' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign({ id: user.id, is_admin: user.is_admin, is_active: user.is_active, force_reset: user.force_reset }, SECRET, { expiresIn: '24h' });
  
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: Boolean(user.is_admin),
      is_active: Boolean(user.is_active),
      force_reset: Boolean(user.force_reset)
    }
  });
});

router.post('/reset-password', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Não autorizado' });

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET) as any;
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, force_reset = 0 WHERE id = ?').run(hash, decoded.id);

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id) as any;
  const newToken = jwt.sign({ id: updatedUser.id, is_admin: updatedUser.is_admin, is_active: updatedUser.is_active, force_reset: updatedUser.force_reset }, SECRET, { expiresIn: '24h' });

  res.json({ 
      message: 'Senha atualizada com sucesso.',
      token: newToken,
      user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          is_admin: Boolean(updatedUser.is_admin),
          is_active: Boolean(updatedUser.is_active),
          force_reset: Boolean(updatedUser.force_reset)
      }
  });
});

export default router;
