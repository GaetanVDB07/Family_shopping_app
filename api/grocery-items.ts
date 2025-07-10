import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Handle get grocery items
    try {
      // TODO: Add authentication
      // TODO: Add grocery items retrieval logic
      
      res.status(200).json({ items: [] });
    } catch (error) {
      console.error('Get grocery items error:', error);
      res.status(500).json({ message: "Kon boodschappen niet ophalen" });
    }
  } else if (req.method === 'POST') {
    // Handle add grocery item
    try {
      const { name, quantity, category } = req.body;
      
      // TODO: Add authentication
      // TODO: Add grocery item creation logic
      
      res.status(201).json({ message: 'Item added', name, quantity, category });
    } catch (error) {
      console.error('Add grocery item error:', error);
      res.status(400).json({ message: "Kon item niet toevoegen" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
