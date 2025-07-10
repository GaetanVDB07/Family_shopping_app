import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Handle family creation
    try {
      const { name, code, createdBy } = req.body;
      
      // TODO: Add authentication
      // TODO: Add family creation logic
      
      res.status(201).json({ message: 'Family created', name, code });
    } catch (error) {
      console.error('Create family error:', error);
      res.status(400).json({ message: "Kon familie niet aanmaken" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
