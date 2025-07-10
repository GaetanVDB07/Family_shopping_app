const { authenticateUser } = require('../_lib/auth');
const { getDatabase, families, familyMembers } = require('../_lib/db');

function generateFamilyCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await authenticateUser(req);
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Family name is required' });
    }

    const db = getDatabase();
    const familyCode = generateFamilyCode();

    // Create the family
    const [newFamily] = await db
      .insert(families)
      .values({
        name: name.trim(),
        code: familyCode,
        createdBy: user.id,
      })
      .returning();

    // Add the creator as admin
    await db
      .insert(familyMembers)
      .values({
        familyId: newFamily.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        role: 'admin',
      });

    return res.status(201).json({
      family: {
        id: newFamily.id,
        name: newFamily.name,
        code: newFamily.code,
        role: 'admin',
        joinedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error creating family:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
