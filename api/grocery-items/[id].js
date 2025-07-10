const { authenticateUser } = require('../_lib/auth');
const { getDatabase, groceryItems, familyMembers, eq, and } = require('../_lib/db');

module.exports = async (req, res) => {
  try {
    const user = await authenticateUser(req);
    const db = getDatabase();

    // Extract ID from URL
    const itemId = req.query.id || req.url.split('/').pop();

    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    // Get user's family ID
    const [userFamily] = await db
      .select({ familyId: familyMembers.familyId })
      .from(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'User not in a family' });
    }

    if (req.method === 'PATCH') {
      const { completed } = req.body;

      if (typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Completed status is required' });
      }

      const [updatedItem] = await db
        .update(groceryItems)
        .set({ completed })
        .where(and(
          eq(groceryItems.id, parseInt(itemId)),
          eq(groceryItems.familyId, userFamily.familyId)
        ))
        .returning();

      if (!updatedItem) {
        return res.status(404).json({ message: 'Item not found' });
      }

      return res.status(200).json(updatedItem);
    }

    if (req.method === 'DELETE') {
      const [deletedItem] = await db
        .delete(groceryItems)
        .where(and(
          eq(groceryItems.id, parseInt(itemId)),
          eq(groceryItems.familyId, userFamily.familyId)
        ))
        .returning();

      if (!deletedItem) {
        return res.status(404).json({ message: 'Item not found' });
      }

      return res.status(200).json({ message: 'Item deleted' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling grocery item:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
