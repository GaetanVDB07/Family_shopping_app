import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser } from './_lib/auth';
import { getDatabase, groceryItems, familyMembers, eq } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Handle get grocery items
    try {
      const user = await authenticateUser(req);
      const db = getDatabase();

      // Find the user's family membership
      const [userMembership] = await db
        .select({
          familyId: familyMembers.familyId,
        })
        .from(familyMembers)
        .where(eq(familyMembers.userId, user.id))
        .limit(1);

      if (!userMembership) {
        return res.status(404).json({ message: 'Je bent geen lid van een familie' });
      }

      // Get all grocery items for the family
      const items = await db
        .select()
        .from(groceryItems)
        .where(eq(groceryItems.familyId, userMembership.familyId));

      res.status(200).json({ items });
    } catch (error) {
      console.error('Get grocery items error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon boodschappen niet ophalen" });
    }
  } else if (req.method === 'POST') {
    // Handle add grocery item
    try {
      const user = await authenticateUser(req);
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'Item naam is vereist' });
      }

      const db = getDatabase();

      // Find the user's family membership
      const [userMembership] = await db
        .select({
          familyId: familyMembers.familyId,
        })
        .from(familyMembers)
        .where(eq(familyMembers.userId, user.id))
        .limit(1);

      if (!userMembership) {
        return res.status(404).json({ message: 'Je bent geen lid van een familie' });
      }

      // Create the grocery item
      const [newItem] = await db
        .insert(groceryItems)
        .values({
          name: name.trim(),
          completed: false,
          addedBy: user.id,
          familyId: userMembership.familyId,
        })
        .returning();

      res.status(201).json({ 
        message: 'Item toegevoegd',
        item: newItem
      });
    } catch (error) {
      console.error('Add grocery item error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(400).json({ message: "Kon item niet toevoegen" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
}
