import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser } from '../_lib/auth';
import { getDatabase, families, familyMembers, eq } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const user = await authenticateUser(req);
      const { code } = req.body;
      
      if (!code || typeof code !== 'string' || code.trim().length !== 6) {
        return res.status(400).json({ message: 'Geldige 6-cijferige familiecode is vereist' });
      }

      const db = getDatabase();
      
      // Check if user is already in a family
      const [existingMembership] = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.userId, user.id))
        .limit(1);

      if (existingMembership) {
        return res.status(400).json({ message: 'Je bent al lid van een familie' });
      }

      // Find the family with the given code
      const [family] = await db
        .select()
        .from(families)
        .where(eq(families.code, code.trim()))
        .limit(1);

      if (!family) {
        return res.status(404).json({ message: 'Familie niet gevonden met deze code' });
      }

      // Add the user to the family
      await db
        .insert(familyMembers)
        .values({
          familyId: family.id,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          role: 'member',
        });

      res.status(200).json({ 
        message: 'Succesvol toegevoegd aan familie',
        family: {
          id: family.id,
          name: family.name,
          code: family.code,
          role: 'member',
        }
      });
    } catch (error) {
      console.error('Join family error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon niet deelnemen aan familie" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
