import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register the routes
registerRoutes(app);

// Export for Vercel
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
