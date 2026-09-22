import { Router, Response } from 'express';
import { query } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /documents/:id
// Fetches a document by ID. User must be authenticated.
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const rows = await query(
    `SELECT id, title, content, owner_id, created_at FROM documents WHERE id = $1 AND owner_id = $2`,
    [id, req.userId]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.json(rows[0]);
});

// GET /documents
// Lists documents belonging to the authenticated user.
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const rows = await query(
    `SELECT id, title, owner_id, created_at FROM documents WHERE owner_id = $1 ORDER BY created_at DESC`,
    [req.userId]
  );
  return res.json(rows);
});

// POST /documents
// Creates a new document owned by the authenticated user.
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { title, content } = req.body;
  const rows = await query(
    `INSERT INTO documents (title, content, owner_id, created_at)
     VALUES ($1, $2, $3, NOW()) RETURNING id`,
    [title, content, req.userId]
  );
  return res.status(201).json({ id: rows[0].id });
});

export default router;
