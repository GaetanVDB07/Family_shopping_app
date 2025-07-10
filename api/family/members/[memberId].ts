import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser } from '../../_lib/auth';
import { getDatabase, families, familyMembers, eq, and } from '../../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'DELETE') {
    try {
      const user = await authenticateUser(req);
      const { memberId } = req.query;

      if (!memberId || typeof memberId !== 'string') {
        return res.status(400).json({ message: 'Lid ID is vereist' });
      }

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

      // Only admins can remove members
      if (userMembership.member.role !== 'admin') {
        return res.status(403).json({ message: 'Alleen familie administrators kunnen leden verwijderen' });
      }

      // Find the member to remove
      const [memberToRemove] = await db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.id, memberId),
            eq(familyMembers.familyId, userMembership.family.id)
          )
        )
        .limit(1);

      if (!memberToRemove) {
        return res.status(404).json({ message: 'Lid niet gevonden in deze familie' });
      }

      // Prevent removing yourself
      if (memberToRemove.userId === user.id) {
        return res.status(400).json({ message: 'Je kunt jezelf niet verwijderen. Gebruik "familie verlaten" in plaats daarvan' });
      }

      // Remove the member
      await db
        .delete(familyMembers)
        .where(eq(familyMembers.id, memberId));

      res.status(200).json({ message: 'Lid succesvol verwijderd uit familie' });
    } catch (error) {
      console.error('Remove member error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon lid niet verwijderen" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
