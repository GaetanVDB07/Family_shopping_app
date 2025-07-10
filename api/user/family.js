const { authenticateUser } = require('../_lib/auth');
const { getDatabase, families, familyMembers, eq } = require('../_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await authenticateUser(req);
    const db = getDatabase();

    // Find the user's family membership
    const familyMembership = await db
      .select({
        family: families,
        member: familyMembers,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!familyMembership || familyMembership.length === 0) {
      return res.status(200).json({ family: null });
    }

    const membership = familyMembership[0];
    return res.status(200).json({
      family: {
        id: membership.family.id,
        name: membership.family.name,
        code: membership.family.code,
        role: membership.member.role,
        joinedAt: membership.member.joinedAt,
      }
    });
  } catch (error) {
    console.error('Error fetching user family:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
