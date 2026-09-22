import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import authRouter from './api/auth';
import documentsRouter from './api/documents';

const app = express();
app.use(express.json());

app.use('/auth', authRouter);
app.use('/documents', documentsRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`docflow-api listening on port ${PORT}`);
});
