import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser } from '../_lib/auth';
import { getDatabase, families, familyMembers, eq } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Handle get family details
    try {
      const user = await authenticateUser(req);
      const db = getDatabase();

      // Find the user's family membership
      const [userMembership] = await db
        .select({
          family: families,
          member: familyMembers,
        })
        .from(familyMembers)
        .innerJoin(families, eq(familyMembers.familyId, families.id))
        .where(eq(familyMembers.userId, user.id))
        .limit(1);

      if (!userMembership) {
        return res.status(404).json({ message: 'Je bent geen lid van een familie' });
      }

      // Get all family members
      const members = await db
        .select({
          id: familyMembers.id,
          userId: familyMembers.userId,
          userEmail: familyMembers.userEmail,
          userName: familyMembers.userName,
          role: familyMembers.role,
          joinedAt: familyMembers.joinedAt,
        })
        .from(familyMembers)
        .where(eq(familyMembers.familyId, userMembership.family.id));

      res.status(200).json({ 
        family: {
          id: userMembership.family.id,
          name: userMembership.family.name,
          code: userMembership.family.code,
          createdAt: userMembership.family.createdAt,
          members: members,
          userRole: userMembership.member.role,
        }
      });
    } catch (error) {
      console.error('Get family details error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon familie details niet ophalen" });
    }
  } else if (req.method === 'DELETE') {
    // Handle delete family (admin only)
    try {
      const user = await authenticateUser(req);
      const db = getDatabase();

      // Find the user's family membership
      const [userMembership] = await db
        .select({
          family: families,
          member: familyMembers,
        })
        .from(familyMembers)
        .innerJoin(families, eq(familyMembers.familyId, families.id))
        .where(eq(familyMembers.userId, user.id))
        .limit(1);

      if (!userMembership) {
        return res.status(404).json({ message: 'Je bent geen lid van een familie' });
      }

      if (userMembership.member.role !== 'admin') {
        return res.status(403).json({ message: 'Alleen familie administrators kunnen families verwijderen' });
      }

      // Delete the family (cascade will handle members and items)
      await db
        .delete(families)
        .where(eq(families.id, userMembership.family.id));

      res.status(200).json({ message: 'Familie succesvol verwijderd' });
    } catch (error) {
      console.error('Delete family error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon familie niet verwijderen" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
    }
  } else if (req.method === 'DELETE') {
    // Handle delete family
    try {
      // TODO: Add authentication
      // TODO: Add family deletion logic
      
      res.status(200).json({ message: 'Familie verwijderd' });
    } catch (error) {
      console.error('Delete family error:', error);
      res.status(500).json({ message: "Kon familie niet verwijderen" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
