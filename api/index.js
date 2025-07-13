// Central API router that handles all API routes
import { createClient } from '@supabase/supabase-js';
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { eq, and } from "drizzle-orm";

// Import schema from shared directory
import { groceryItems, families, familyMembers } from "../shared/schema.js";

// Database setup for serverless environment
let db = null;
let client = null;

function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (!client) {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    client.connect().catch(console.error);
    db = drizzle(client);
  }
  return db;
}

function getDatabase() {
  if (!db) {
    initializeDatabase();
  }
  return db;
}

// Supabase setup
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  }
  return supabase;
}

// Authentication helper
async function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.substring(7);
  const supabaseClient = getSupabaseClient();
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email?.split('@')[0],
  };
}

// Helper function to generate family codes
function generateFamilyCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Main handler function
export default async function handler(req, res) {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { url, method } = req;
    const pathname = new URL(url, `http://${req.headers.host}`).pathname;
    
    // Remove /api prefix if present
    const apiPath = pathname.replace(/^\/api/, '');
    
    console.log(`[API] ${method} ${apiPath}`);
    
    // Route to appropriate handler
    switch (true) {
      case apiPath === '/ping':
        return res.status(200).json({ ok: true });
        
      case apiPath === '/test':
        return res.status(200).json({ message: 'API is working!', method, url });
        
      case apiPath === '/user/family' && method === 'GET':
        return await handleGetUserFamily(req, res);
        
      case apiPath === '/families' && method === 'POST':
        return await handleCreateFamily(req, res);
        
      case apiPath === '/families/join' && method === 'POST':
        return await handleJoinFamily(req, res);
        
      case apiPath === '/family/details' && method === 'GET':
        return await handleGetFamilyDetails(req, res);
        
      case apiPath === '/family/details' && method === 'DELETE':
        return await handleDeleteFamily(req, res);
        
      case apiPath === '/family/leave' && method === 'POST':
        return await handleLeaveFamily(req, res);
        
      case apiPath.startsWith('/family/members/') && method === 'DELETE':
        const memberId = apiPath.split('/')[3];
        return await handleRemoveFamilyMember(req, res, memberId);
        
      case apiPath === '/grocery-items' && method === 'GET':
        return await handleGetGroceryItems(req, res);
        
      case apiPath === '/grocery-items' && method === 'POST':
        return await handleCreateGroceryItem(req, res);
        
      case apiPath.startsWith('/grocery-items/') && method === 'PATCH':
        const itemId = apiPath.split('/')[2];
        return await handleUpdateGroceryItem(req, res, itemId);
        
      case apiPath.startsWith('/grocery-items/') && method === 'DELETE':
        const deleteItemId = apiPath.split('/')[2];
        return await handleDeleteGroceryItem(req, res, deleteItemId);
        
      default:
        return res.status(404).json({ message: 'API route not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request details:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Route handlers
async function handleGetUserFamily(req, res) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    const [familyMembership] = await database
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

    return res.status(200).json({
      family: {
        id: familyMembership.family.id,
        name: familyMembership.family.name,
        code: familyMembership.family.code,
        role: familyMembership.member.role,
        joinedAt: familyMembership.member.joinedAt,
      }
    });
  } catch (error) {
    console.error('Error fetching user family:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleCreateFamily(req, res) {
  try {
    const user = await authenticateUser(req);
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Family name is required' });
    }

    const database = getDatabase();
    const code = generateFamilyCode();

    const [family] = await database
      .insert(families)
      .values({
        name,
        code,
        createdBy: user.id,
      })
      .returning();

    await database
      .insert(familyMembers)
      .values({
        familyId: family.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        role: 'admin',
      });

    return res.status(201).json({ family });
  } catch (error) {
    console.error('Error creating family:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleJoinFamily(req, res) {
  try {
    const user = await authenticateUser(req);
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Family code is required' });
    }

    const database = getDatabase();

    const [family] = await database
      .select()
      .from(families)
      .where(eq(families.code, code))
      .limit(1);

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const [existingMember] = await database
      .select()
      .from(familyMembers)
      .where(and(
        eq(familyMembers.familyId, family.id),
        eq(familyMembers.userId, user.id)
      ))
      .limit(1);

    if (existingMember) {
      return res.status(400).json({ message: 'Already a member of this family' });
    }

    await database
      .insert(familyMembers)
      .values({
        familyId: family.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        role: 'member',
      });

    return res.status(200).json({ family });
  } catch (error) {
    console.error('Error joining family:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetFamilyDetails(req, res) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    const [userFamily] = await database
      .select({
        family: families,
        member: familyMembers,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'No family found' });
    }

    const allMembers = await database
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, userFamily.family.id));

    return res.status(200).json({
      id: userFamily.family.id,
      name: userFamily.family.name,
      code: userFamily.family.code,
      members: allMembers,
      userRole: userFamily.member.role,
    });
  } catch (error) {
    console.error('Error fetching family details:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleDeleteFamily(req, res) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    const [userFamily] = await database
      .select({
        family: families,
        member: familyMembers,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(and(
        eq(familyMembers.userId, user.id),
        eq(familyMembers.role, 'admin')
      ))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'Family not found or not authorized' });
    }

    await database
      .delete(families)
      .where(eq(families.id, userFamily.family.id));

    return res.status(200).json({ message: 'Family deleted successfully' });
  } catch (error) {
    console.error('Error deleting family:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleLeaveFamily(req, res) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    const [membership] = await database
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!membership) {
      return res.status(404).json({ message: 'No family membership found' });
    }

    await database
      .delete(familyMembers)
      .where(eq(familyMembers.userId, user.id));

    return res.status(200).json({ message: 'Left family successfully' });
  } catch (error) {
    console.error('Error leaving family:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleRemoveFamilyMember(req, res, memberId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    const [userFamily] = await database
      .select({
        family: families,
        member: familyMembers,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(and(
        eq(familyMembers.userId, user.id),
        eq(familyMembers.role, 'admin')
      ))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'Family not found or not authorized' });
    }

    await database
      .delete(familyMembers)
      .where(eq(familyMembers.id, memberId));

    return res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing family member:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetGroceryItems(req, res) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    const [userFamily] = await database
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'No family found' });
    }

    // Join grocery items with family members to get the user name
    const items = await database
      .select({
        id: groceryItems.id,
        name: groceryItems.name,
        completed: groceryItems.completed,
        addedBy: familyMembers.userName,
        familyId: groceryItems.familyId,
        createdAt: groceryItems.createdAt,
      })
      .from(groceryItems)
      .leftJoin(familyMembers, eq(groceryItems.addedBy, familyMembers.userId))
      .where(eq(groceryItems.familyId, userFamily.familyId))
      .orderBy(groceryItems.createdAt);

    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching grocery items:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleCreateGroceryItem(req, res) {
  try {
    const user = await authenticateUser(req);
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    const database = getDatabase();

    const [userFamily] = await database
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'No family found' });
    }

    const [item] = await database
      .insert(groceryItems)
      .values({
        name,
        addedBy: user.id,
        familyId: userFamily.familyId,
      })
      .returning();

    // Return the item with the user name instead of user ID
    const itemWithUserName = {
      ...item,
      addedBy: userFamily.userName || user.name || user.email?.split('@')[0] || 'Onbekend'
    };

    return res.status(201).json(itemWithUserName);
  } catch (error) {
    console.error('Error creating grocery item:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleUpdateGroceryItem(req, res, itemId) {
  try {
    const user = await authenticateUser(req);
    const { completed } = req.body;
    const database = getDatabase();

    const [userFamily] = await database
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'No family found' });
    }

    const [item] = await database
      .update(groceryItems)
      .set({ completed })
      .where(and(
        eq(groceryItems.id, parseInt(itemId)),
        eq(groceryItems.familyId, userFamily.familyId)
      ))
      .returning();

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Get the user name for the addedBy field
    const [itemWithUserName] = await database
      .select({
        id: groceryItems.id,
        name: groceryItems.name,
        completed: groceryItems.completed,
        addedBy: familyMembers.userName,
        familyId: groceryItems.familyId,
        createdAt: groceryItems.createdAt,
      })
      .from(groceryItems)
      .leftJoin(familyMembers, eq(groceryItems.addedBy, familyMembers.userId))
      .where(eq(groceryItems.id, parseInt(itemId)));

    return res.status(200).json(itemWithUserName || item);
  } catch (error) {
    console.error('Error updating grocery item:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleDeleteGroceryItem(req, res, itemId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    const [userFamily] = await database
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, user.id))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'No family found' });
    }

    await database
      .delete(groceryItems)
      .where(and(
        eq(groceryItems.id, parseInt(itemId)),
        eq(groceryItems.familyId, userFamily.familyId)
      ));

    return res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting grocery item:', error);
    if (error.message.includes('authorization')) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}
