import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser } from '../_lib/auth';
import { getDatabase, groceryItems, familyMembers, eq, and } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Item ID is vereist' });
  }

  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return res.status(400).json({ message: 'Ongeldig item ID' });
  }

  if (req.method === 'PATCH') {
    // Handle update grocery item
    try {
      const user = await authenticateUser(req);
      const { completed } = req.body;
      
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Completed status is vereist' });
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

      // Find the item and verify it belongs to the user's family
      const [item] = await db
        .select()
        .from(groceryItems)
        .where(
          and(
            eq(groceryItems.id, itemId),
            eq(groceryItems.familyId, userMembership.familyId)
          )
        )
        .limit(1);

      if (!item) {
        return res.status(404).json({ message: 'Item niet gevonden' });
      }

      // Update the item
      const [updatedItem] = await db
        .update(groceryItems)
        .set({ completed })
        .where(eq(groceryItems.id, itemId))
        .returning();

      res.status(200).json({ 
        message: 'Item bijgewerkt',
        item: updatedItem
      });
    } catch (error) {
      console.error('Update grocery item error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon item niet bijwerken" });
    }
  } else if (req.method === 'DELETE') {
    // Handle delete grocery item
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

      // Find the item and verify it belongs to the user's family
      const [item] = await db
        .select()
        .from(groceryItems)
        .where(
          and(
            eq(groceryItems.id, itemId),
            eq(groceryItems.familyId, userMembership.familyId)
          )
        )
        .limit(1);

      if (!item) {
        return res.status(404).json({ message: 'Item niet gevonden' });
      }

      // Delete the item
      await db
        .delete(groceryItems)
        .where(eq(groceryItems.id, itemId));

      res.status(200).json({ message: 'Item verwijderd' });
    } catch (error) {
      console.error('Delete grocery item error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon item niet verwijderen" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
