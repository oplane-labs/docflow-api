import { Router, Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query } from '../lib/db';
import { saveToken } from '../lib/tokenStore';

const router = Router();

// POST /auth/login
// Issues a JWT for a user with valid credentials.
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const rows = await query(
    `SELECT id, password_hash FROM users WHERE email = $1`,
    [email]
  );

  if (!rows[0]) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ sub: rows[0].id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  return res.json({ token });
});

// GET /auth/google/callback
// Handles the OAuth redirect from Google. Exchanges code for an access token
// and stores it so the app can call Google APIs on the user's behalf.
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const { access_token, refresh_token } = tokenRes.data;
  const userId = state as string; // userId was passed through OAuth state param

  // Access token stored in the shared oauth_tokens table.
  // This table is accessible to the sync job, the analytics service,
  // and the billing service — all of which connect with DATABASE_URL.
  // None of them need these tokens. The storage location made sense
  // for the happy path; the reach wasn't considered.
  await saveToken(userId, 'google', access_token);

  return res.redirect('/dashboard');
});

// GET /auth/notion/callback
// Same pattern — Notion OAuth access token stored in the same shared table.
router.get('/notion/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  const tokenRes = await axios.post('https://api.notion.com/v1/oauth/token', {
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.NOTION_REDIRECT_URI,
  }, {
    auth: {
      username: process.env.NOTION_CLIENT_ID!,
      password: process.env.NOTION_CLIENT_SECRET!,
    },
  });

  const userId = state as string;
  await saveToken(userId, 'notion', tokenRes.data.access_token);

  return res.redirect('/dashboard');
});

export default router;
