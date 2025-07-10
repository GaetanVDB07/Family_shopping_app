import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser } from '../_lib/auth';
import { getDatabase, families, familyMembers, eq, and } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const user = await authenticateUser(req);
      const db = getDatabase();

      // Find the user's family membership
      const [familyMembership] = await db
        .select({
          family: families,
          member: familyMembers,
        })
        .from(familyMembers)
        .innerJoin(families, eq(familyMembers.familyId, families.id))
        .where(eq(familyMembers.userId, user.id))
        .limit(1);

      if (!familyMembership) {
        return res.status(200).json({ family: null });
      }

      res.status(200).json({
        family: {
          id: familyMembership.family.id,
          name: familyMembership.family.name,
          code: familyMembership.family.code,
          role: familyMembership.member.role,
          joinedAt: familyMembership.member.joinedAt,
        }
      });
    } catch (error) {
      console.error('Get user family error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon familie informatie niet ophalen" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
