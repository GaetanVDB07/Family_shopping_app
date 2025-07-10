const { authenticateUser } = require('../../_lib/auth');
const { getDatabase, familyMembers, eq, and } = require('../../_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await authenticateUser(req);
    const db = getDatabase();

    // Extract member ID from URL
    const memberId = req.query.memberId || req.url.split('/').pop();

    if (!memberId) {
      return res.status(400).json({ message: 'Member ID is required' });
    }

    // Get user's family membership (check if admin)
    const [userMembership] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!userMembership) {
      return res.status(404).json({ message: 'User not in a family' });
    }

    if (userMembership.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }

    // Remove the member from the same family
    const [deletedMember] = await db
      .delete(familyMembers)
      .where(and(
        eq(familyMembers.id, memberId),
        eq(familyMembers.familyId, userMembership.familyId)
      ))
      .returning();

    if (!deletedMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    return res.status(200).json({ message: 'Member removed from family' });
  } catch (error) {
    console.error('Error removing family member:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};
