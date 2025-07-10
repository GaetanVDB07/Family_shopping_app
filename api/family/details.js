const { authenticateUser } = require('../_lib/auth');
const { getDatabase, families, familyMembers, eq } = require('../_lib/db');

module.exports = async (req, res) => {
  try {
    const user = await authenticateUser(req);
    const db = getDatabase();

    if (req.method === 'GET') {
      // Get family details and members
      const [userFamily] = await db
        .select({
          family: families,
          member: familyMembers,
        })
        .from(familyMembers)
        .innerJoin(families, eq(familyMembers.familyId, families.id))
        .where(eq(familyMembers.userId, user.id))
        .limit(1);

      if (!userFamily) {
        return res.status(404).json({ message: 'User not in a family' });
      }

      // Get all family members
      const members = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.familyId, userFamily.family.id));

      return res.status(200).json({
        family: userFamily.family,
        members: members,
        userRole: userFamily.member.role,
      });
    }

    if (req.method === 'DELETE') {
      // Delete family (admin only)
      const [userFamily] = await db
        .select({
          family: families,
          member: familyMembers,
        })
        .from(familyMembers)
        .innerJoin(families, eq(familyMembers.familyId, families.id))
        .where(eq(familyMembers.userId, user.id))
        .limit(1);

      if (!userFamily) {
        return res.status(404).json({ message: 'User not in a family' });
      }

      if (userFamily.member.role !== 'admin') {
        return res.status(403).json({ message: 'Only admin can delete family' });
      }

      // Delete the family (cascade will handle members and items)
      await db
        .delete(families)
        .where(eq(families.id, userFamily.family.id));

      return res.status(200).json({ message: 'Family deleted' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling family details:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
