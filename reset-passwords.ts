import { db } from './db.js';
import bcrypt from 'bcryptjs';

const hash = bcrypt.hashSync('142536', 10);
const result = db.prepare('UPDATE users SET password = ?, is_active = 0').run(hash);
console.log(`Updated ${result.changes} users. New password is 142536.`);
