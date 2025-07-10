const { authenticateUser } = require('../_lib/auth');
const { getDatabase, familyMembers, eq } = require('../_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await authenticateUser(req);
    const db = getDatabase();

    // Remove user from family
    const [deletedMember] = await db
      .delete(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .returning();

    if (!deletedMember) {
      return res.status(404).json({ message: 'User not in a family' });
    }

    return res.status(200).json({ message: 'Left family successfully' });
  } catch (error) {
    console.error('Error leaving family:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
