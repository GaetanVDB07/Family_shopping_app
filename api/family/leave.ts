import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser } from '../_lib/auth';
import { getDatabase, families, familyMembers, eq } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Handle leave family
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

      // Check if user is the only admin
      if (userMembership.member.role === 'admin') {
        const adminCount = await db
          .select({ count: familyMembers.id })
          .from(familyMembers)
          .where(
            eq(familyMembers.familyId, userMembership.family.id)
          );

        const totalMembers = adminCount.length;

        if (totalMembers === 1) {
          // Last member - delete the entire family
          await db
            .delete(families)
            .where(eq(families.id, userMembership.family.id));
        } else {
          // Check if there are other admins
          const otherAdmins = await db
            .select()
            .from(familyMembers)
            .where(
              eq(familyMembers.familyId, userMembership.family.id)
            );

          const hasOtherAdmins = otherAdmins.some(
            m => m.role === 'admin' && m.userId !== user.id
          );

          if (!hasOtherAdmins) {
            return res.status(400).json({ 
              message: 'Je kunt de familie niet verlaten als je de enige administrator bent. Maak eerst een ander lid administrator.' 
            });
          }

          // Remove the user from the family
          await db
            .delete(familyMembers)
            .where(eq(familyMembers.userId, user.id));
        }
      } else {
        // Regular member - just remove from family
        await db
          .delete(familyMembers)
          .where(eq(familyMembers.userId, user.id));
      }

      res.status(200).json({ message: 'Familie succesvol verlaten' });
    } catch (error) {
      console.error('Leave family error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon familie niet verlaten" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
