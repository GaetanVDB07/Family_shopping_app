import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser } from './_lib/auth';
import { getDatabase, families, familyMembers, eq } from './_lib/db';

// Helper function to generate a 6-digit family code
function generateFamilyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Handle family creation
    try {
      const user = await authenticateUser(req);
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'Familie naam is vereist' });
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

      // Generate a unique family code
      let familyCode: string;
      let isUnique = false;
      do {
        familyCode = generateFamilyCode();
        const [existing] = await db
          .select()
          .from(families)
          .where(eq(families.code, familyCode))
          .limit(1);
        isUnique = !existing;
      } while (!isUnique);

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

      res.status(201).json({ 
        message: 'Familie succesvol aangemaakt',
        family: {
          id: newFamily.id,
          name: newFamily.name,
          code: newFamily.code,
          role: 'admin',
        }
      });
    } catch (error) {
      console.error('Create family error:', error);
      if (error instanceof Error && error.message.includes('authorization')) {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Kon familie niet aanmaken" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
