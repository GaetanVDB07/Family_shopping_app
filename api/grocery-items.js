const { authenticateUser } = require('../_lib/auth');
const { getDatabase, groceryItems, familyMembers, eq } = require('../_lib/db');

module.exports = async (req, res) => {
  try {
    const user = await authenticateUser(req);
    const db = getDatabase();

    // Get user's family ID
    const [userFamily] = await db
      .select({ familyId: familyMembers.familyId })
      .from(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'User not in a family' });
    }

    if (req.method === 'GET') {
      // Get all grocery items for the family
      const items = await db
        .select()
        .from(groceryItems)
        .where(eq(groceryItems.familyId, userFamily.familyId));

      return res.status(200).json(items);
    }

    if (req.method === 'POST') {
      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'Item name is required' });
      }

      const [newItem] = await db
        .insert(groceryItems)
        .values({
          name: name.trim(),
          completed: false,
          addedBy: user.id,
          familyId: userFamily.familyId,
        })
        .returning();

      return res.status(201).json(newItem);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling grocery items:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
