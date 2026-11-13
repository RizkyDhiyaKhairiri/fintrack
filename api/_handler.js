import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);
const secret = process.env.JWT_SECRET;
const cors = { 'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' };
const send = (res, status, data) => { Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v)); res.status(status).json(data); };
const token = user => jwt.sign({ id: user.id, name: user.name, email: user.email }, secret, { expiresIn: '30d' });
function auth(req) { const raw = (req.headers.authorization || '').replace('Bearer ', '').trim(); return jwt.verify(raw, secret); }
function body(req) { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
function summary(rows, period) { return { period, income: rows.filter(x => x.type === 'income').reduce((s, x) => s + Number(x.amount), 0), expense: rows.filter(x => x.type === 'expense').reduce((s, x) => s + Number(x.amount), 0), transactions: rows }; }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v)); res.status(204).end(); return; }
  const parts = new URL(req.url, 'http://localhost').pathname.split('/').filter(Boolean).slice(1);
  try {
    if (parts[0] === 'health') return send(res, 200, { ok: true, service: 'fintrack-api' });
    if (parts[0] === 'auth' && parts[1] === 'register' && req.method === 'POST') {
      const { name, email, password } = body(req); if (!name || !email || !password || password.length < 6) return send(res, 400, { error: 'Nama, email, dan password minimal 6 karakter wajib diisi.' });
      const hash = await bcrypt.hash(password, 12); const user = { name: name.trim(), email: email.trim().toLowerCase(), password: hash };
      const { data, error } = await supabase.from('users').insert(user).select('id,name,email').single(); if (error) { console.error('Register database error:', error); return send(res, error.code === '23505' ? 409 : 500, { error: error.code === '23505' ? 'Email sudah terdaftar.' : `Database error: ${error.message}` }); } return send(res, 201, { token: token(data), user: data });
    }
    if (parts[0] === 'auth' && parts[1] === 'login' && req.method === 'POST') {
      const { email, password } = body(req); const { data: user, error } = await supabase.from('users').select('*').eq('email', String(email).toLowerCase()).single(); if (error || !user || !(await bcrypt.compare(password || '', user.password))) return send(res, 401, { error: 'Email atau password salah.' }); const safe = { id: user.id, name: user.name, email: user.email }; return send(res, 200, { token: token(safe), user: safe });
    }
    if (parts[0] === 'auth' && parts[1] === 'me') return send(res, 200, auth(req));
    const user = auth(req); const uid = user.id;
    if (parts[0] === 'transactions' && req.method === 'GET') { const { data, error } = await supabase.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }).order('id', { ascending: false }); if (error) throw error; return send(res, 200, data); }
    if (parts[0] === 'transactions' && req.method === 'POST') { const input = body(req); if (!['income', 'expense'].includes(input.type) || !Number(input.amount) || !input.category || !input.date) return send(res, 400, { error: 'Data transaksi tidak lengkap.' }); const { data, error } = await supabase.from('transactions').insert({ user_id: uid, type: input.type, amount: input.amount, category: input.category, note: input.note || '', date: input.date }).select().single(); if (error) throw error; return send(res, 201, data); }
    if (parts[0] === 'transactions' && parts[1] && req.method === 'DELETE') { const { error } = await supabase.from('transactions').delete().eq('id', parts[1]).eq('user_id', uid); if (error) throw error; return send(res, 204, {}); }
    if (parts[0] === 'summary' && parts[1] === 'daily') { const { data, error } = await supabase.from('transactions').select('*').eq('user_id', uid).eq('date', parts[2]).order('id', { ascending: false }); if (error) throw error; return send(res, 200, summary(data, parts[2])); }
    if (parts[0] === 'summary' && parts[1] === 'monthly') { const month = req.query.month || new Date().toISOString().slice(0, 7); const { data, error } = await supabase.from('transactions').select('*').eq('user_id', uid).gte('date', `${month}-01`).lt('date', `${month}-32`); if (error) throw error; return send(res, 200, summary(data, month)); }
    if (parts[0] === 'targets' && req.method === 'GET') { const { data, error } = await supabase.from('targets').select('*').eq('user_id', uid).order('deadline', { ascending: true, nullsFirst: false }); if (error) throw error; return send(res, 200, data); }
    if (parts[0] === 'targets' && req.method === 'POST') { const input = body(req); if (!input.name || !Number(input.target_amount)) return send(res, 400, { error: 'Target tidak lengkap.' }); const { data, error } = await supabase.from('targets').insert({ user_id: uid, name: input.name, target_amount: input.target_amount, current_amount: input.current_amount || 0, deadline: input.deadline || null, kind: input.kind || 'saving' }).select().single(); if (error) throw error; return send(res, 201, data); }
    if (parts[0] === 'targets' && parts[1] && req.method === 'DELETE') { const { error } = await supabase.from('targets').delete().eq('id', parts[1]).eq('user_id', uid); if (error) throw error; return send(res, 204, {}); }
    if (parts[0] === 'predictions') { const { data, error } = await supabase.from('transactions').select('date,type,amount').eq('user_id', uid).order('date'); if (error) throw error; const rows = Object.values(data.reduce((a, x) => { const month = x.date.slice(0, 7); const key = `${month}-${x.type}`; a[key] ||= { month, type: x.type, total: 0 }; a[key].total += Number(x.amount); return a; }, {})); const months = [...new Set(rows.map(x => x.month))]; const avg = type => { const values = months.map(m => rows.find(x => x.month === m && x.type === type)?.total || 0); return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }; const income = avg('income'), expense = avg('expense'); return send(res, 200, { months, history: rows, forecast: { income, expense, balance: income - expense }, message: months.length < 2 ? 'Tambahkan transaksi dari minimal 2 bulan untuk prediksi lebih akurat.' : 'Prediksi berdasarkan rata-rata histori bulanan.' }); }
    return send(res, 404, { error: 'Endpoint tidak ditemukan.' });
  } catch (error) { console.error('API error:', error); return send(res, error.name === 'JsonWebTokenError' ? 401 : 500, { error: error.message || 'Server error.', hint: error.message === 'fetch failed' ? 'Periksa SUPABASE_URL dan koneksi project Supabase.' : undefined }); }
}