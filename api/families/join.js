const { authenticateUser } = require('../_lib/auth');
const { getDatabase, families, familyMembers, eq } = require('../_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await authenticateUser(req);
    const { code } = req.body;

    if (!code || code.trim().length === 0) {
      return res.status(400).json({ message: 'Family code is required' });
    }

    const db = getDatabase();

    // Find the family by code
    const [family] = await db
      .select()
      .from(families)
      .where(eq(families.code, code.trim()))
      .limit(1);

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (existingMember) {
      return res.status(400).json({ message: 'You are already a member of a family' });
    }

    // Add user to family
    await db
      .insert(familyMembers)
      .values({
        familyId: family.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        role: 'member',
      });

    return res.status(200).json({
      family: {
        id: family.id,
        name: family.name,
        code: family.code,
        role: 'member',
        joinedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error joining family:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
