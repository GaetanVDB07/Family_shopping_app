// Central API router that handles all API routes
import { createClient } from '@supabase/supabase-js';
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { eq, and, count, inArray } from "drizzle-orm";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.isHttpError = true;
  }
}

// Import schema from shared directory
import { groceryItems, families, familyMembers } from "../shared/schema.js";

const LOCAL_ORIGIN_PREFIXES = ['http://localhost:', 'http://127.0.0.1:'];

function getAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (process.env.VERCEL_URL) {
    configured.push(`https://${process.env.VERCEL_URL}`);
  }

  return [...new Set(configured)];
}

function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const isDev = process.env.NODE_ENV !== 'production';
  const isLocalOrigin = origin && LOCAL_ORIGIN_PREFIXES.some((prefix) => origin.startsWith(prefix));
  const isConfiguredOrigin = origin && getAllowedOrigins().includes(origin);

  if (origin && (isLocalOrigin && isDev || isConfiguredOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function resolveAddedByDisplayName(database, familyId, userId) {
  const [member] = await database
    .select({ userName: familyMembers.userName })
    .from(familyMembers)
    .where(and(
      eq(familyMembers.familyId, familyId),
      eq(familyMembers.userId, userId),
    ))
    .limit(1);

  return member?.userName ?? userId;
}

async function fetchGroceryItemsForFamily(database, familyId) {
  const rows = await database
    .select({
      id: groceryItems.id,
      name: groceryItems.name,
      completed: groceryItems.completed,
      addedByUserId: groceryItems.addedBy,
      familyId: groceryItems.familyId,
      createdAt: groceryItems.createdAt,
    })
    .from(groceryItems)
    .where(eq(groceryItems.familyId, familyId))
    .orderBy(groceryItems.createdAt);

  if (rows.length === 0) {
    return [];
  }

  const userIds = [...new Set(rows.map((row) => row.addedByUserId))];
  const members = await database
    .select({
      userId: familyMembers.userId,
      userName: familyMembers.userName,
    })
    .from(familyMembers)
    .where(and(
      eq(familyMembers.familyId, familyId),
      inArray(familyMembers.userId, userIds),
    ));

  const nameByUserId = new Map(
    members.map((member) => [member.userId, member.userName ?? member.userId]),
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    completed: row.completed,
    addedBy: nameByUserId.get(row.addedByUserId) ?? row.addedByUserId,
    familyId: row.familyId,
    createdAt: row.createdAt,
  }));
}

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
let supabaseService = null;

function getSupabaseClient() {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  }
  return supabase;
}

function getSupabaseServiceClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  if (!supabaseService) {
    supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }

  return supabaseService;
}

// Authentication helper
async function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'No authorization token provided');
  }

  const token = authHeader.substring(7);
  const supabaseClient = getSupabaseClient();
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  
  if (error || !user) {
    throw new HttpError(401, 'Invalid or expired token');
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

// Helper function to generate unique family codes
async function generateUniqueFamilyCode() {
  const database = getDatabase();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateFamilyCode();
    
    // Check if code already exists
    const [existingFamily] = await database
      .select()
      .from(families)
      .where(eq(families.code, code))
      .limit(1);

    if (!existingFamily) {
      return code; // Found unique code
    }
    
    attempts++;
  }
  
  // If we couldn't generate a unique code after max attempts
  throw new Error('Unable to generate unique family code');
}

// Main handler function
async function handler(req, res) {
  try {
    applyCorsHeaders(req, res);

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { url, method } = req;
    const pathname = new URL(url, `http://${req.headers.host}`).pathname;
    
    // Remove /api prefix if present
    const apiPath = pathname.replace(/^\/api/, '');
    
    console.log(`[API] ${method} ${apiPath}`);
    
    const routes = [
      {
        match: (path, mthd) => (path === '/ping' ? {} : null),
        handler: async (_req, res) => res.status(200).json({ ok: true }),
      },
      {
        match: (path, mthd) => (path === '/cron/keepalive' ? {} : null),
        handler: handleKeepalive,
      },
      {
        match: (path, mthd) => (path === '/test' ? { url, method: mthd } : null),
        handler: async (_req, res, params) => res.status(200).json({ message: 'API is working!', method: params.method, url: params.url }),
      },
      {
        match: (path, mthd) => (path === '/user/family' && mthd === 'GET' ? {} : null),
        handler: handleGetUserFamily,
      },
      {
        match: (path, mthd) => (path === '/user/families' && mthd === 'GET' ? {} : null),
        handler: handleGetUserFamilies,
      },
      {
        match: (path, mthd) => (path === '/families' && mthd === 'POST' ? {} : null),
        handler: handleCreateFamily,
      },
      {
        match: (path, mthd) => (path === '/families/join' && mthd === 'POST' ? {} : null),
        handler: handleJoinFamily,
      },
      {
        match: (path, mthd) => (path === '/family/details' && mthd === 'GET' ? {} : null),
        handler: handleGetFamilyDetails,
      },
      {
        match: (path, mthd) => {
          if (path.startsWith('/family/details/') && mthd === 'GET') {
            return { familyId: path.split('/')[3] };
          }
          return null;
        },
        handler: (req, res, params) => handleGetFamilyDetailsByID(req, res, params.familyId),
      },
      {
        match: (path, mthd) => (path === '/family/details' && mthd === 'DELETE' ? {} : null),
        handler: (req, res) => handleDeleteFamily(req, res, req.body?.familyId),
      },
      {
        match: (path, mthd) => {
          if (path.startsWith('/family/details/') && mthd === 'DELETE') {
            return { familyId: path.split('/')[3] };
          }
          return null;
        },
        handler: (req, res, params) => handleDeleteFamily(req, res, params.familyId),
      },
      {
        match: (path, mthd) => (path === '/family/leave' && mthd === 'POST' ? {} : null),
        handler: handleLeaveFamily,
      },
      {
        match: (path, mthd) => {
          if (path.startsWith('/family/members/') && mthd === 'DELETE') {
            return { memberId: path.split('/')[3] };
          }
          return null;
        },
        handler: (req, res, params) => handleRemoveFamilyMember(req, res, params.memberId),
      },
      {
        match: (path, mthd) => (path === '/grocery-items' && mthd === 'GET' ? {} : null),
        handler: handleGetGroceryItems,
      },
      {
        match: (path, mthd) => {
          if (path.startsWith('/grocery-items/') && mthd === 'GET' && path.split('/').length === 3) {
            return { familyId: path.split('/')[2] };
          }
          return null;
        },
        handler: (req, res, params) => handleGetGroceryItemsByFamily(req, res, params.familyId),
      },
      {
        match: (path, mthd) => (path === '/grocery-items' && mthd === 'POST' ? {} : null),
        handler: handleCreateGroceryItem,
      },
      {
        match: (path, mthd) => {
          if (path.startsWith('/grocery-items/delete-all/') && mthd === 'DELETE') {
            return { familyId: path.split('/')[3] };
          }
          return null;
        },
        handler: (req, res, params) => handleDeleteAllGroceryItems(req, res, params.familyId),
      },
      {
        match: (path, mthd) => {
          if (path.startsWith('/grocery-items/mark-all-completed/') && mthd === 'PATCH') {
            return { familyId: path.split('/')[3] };
          }
          return null;
        },
        handler: (req, res, params) => handleMarkAllItemsCompleted(req, res, params.familyId),
      },
      {
        match: (path, mthd) => {
          if (path.startsWith('/grocery-items/mark-all-pending/') && mthd === 'PATCH') {
            return { familyId: path.split('/')[3] };
          }
          return null;
        },
        handler: (req, res, params) => handleMarkAllItemsPending(req, res, params.familyId),
      },
      {
        match: (path, mthd) => {
          if (path.startsWith('/grocery-items/') && mthd === 'PATCH') {
            return { itemId: path.split('/')[2] };
          }
          return null;
        },
        handler: (req, res, params) => handleUpdateGroceryItem(req, res, params.itemId),
      },
      {
        match: (path, mthd) => {
          if (path.startsWith('/grocery-items/') && mthd === 'DELETE') {
            return { itemId: path.split('/')[2] };
          }
          return null;
        },
        handler: (req, res, params) => handleDeleteGroceryItem(req, res, params.itemId),
      },
      {
        match: (path, mthd) => (path === '/cleanup-duplicates' && mthd === 'POST' ? {} : null),
        handler: handleCleanupDuplicates,
      },
      {
        match: (path, mthd) => (path === '/user/account' && mthd === 'DELETE' ? {} : null),
        handler: handleDeleteAccount,
      },
    ];

    for (const route of routes) {
      const params = route.match(apiPath, method);
      if (params) {
        return await route.handler(req, res, params);
      }
    }

    return res.status(404).json({ message: 'API route not found' });
  } catch (error) {
    console.error('API Error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request details:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
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
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Keepalive handler: runs a trivial DB query and a tiny Supabase request
async function handleKeepalive(_req, res) {
  try {
    // Ensure DB client is initialized and touch Postgres
    getDatabase();
    if (client) {
      await client.query('select 1');
    }

    // Optionally touch Supabase (harmless head-count on a small table)
    try {
      const sb = getSupabaseClient();
      // Use a lightweight query that doesn't require auth
      await sb.from('grocery_items').select('id', { count: 'exact', head: true }).limit(1);
    } catch (e) {
      // Don't fail the keepalive if Supabase anon is not configured
      console.warn('[keepalive] Supabase ping skipped/failed:', e?.message || e);
    }

    return res.status(200).json({ ok: true, message: 'keepalive ok' });
  } catch (error) {
    console.error('Keepalive error:', error);
    return res.status(500).json({ ok: false, message: 'keepalive failed' });
  }
}

async function handleGetUserFamilies(req, res) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    // Get all families the user is a member of
    const result = await database
      .select({
        familyId: families.id,
        familyName: families.name,
        familyCode: families.code,
        createdAt: families.createdAt,
        createdBy: families.createdBy,
        role: familyMembers.role,
        joinedAt: familyMembers.joinedAt,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(eq(familyMembers.userId, user.id))
      .orderBy(families.name);

    // For each family, get the member count
    const userFamilies = await Promise.all(
      result.map(async (row) => {
        const [memberCountResult] = await database
          .select({ count: count(familyMembers.id) })
          .from(familyMembers)
          .where(eq(familyMembers.familyId, row.familyId));

        return {
          familyId: row.familyId,
          familyName: row.familyName,
          familyCode: row.familyCode,
          role: row.role,
          joinedAt: row.joinedAt.toISOString(),
          id: row.familyId,
          name: row.familyName,
          code: row.familyCode,
          createdAt: row.createdAt,
          createdBy: row.createdBy,
          memberCount: Number(memberCountResult.count),
        };
      })
    );

    return res.status(200).json(userFamilies);
  } catch (error) {
    console.error('Error fetching user families:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Kon families niet ophalen' });
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
    const code = await generateUniqueFamilyCode();

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
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
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
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
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
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetFamilyDetailsByID(req, res, familyId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    // Check if user is a member of the requested family
    const [userFamily] = await database
      .select({
        family: families,
        member: familyMembers,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(and(
        eq(familyMembers.userId, user.id),
        eq(familyMembers.familyId, familyId)
      ))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'Family not found or access denied' });
    }

    const allMembers = await database
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));

    return res.status(200).json({
      id: userFamily.family.id,
      name: userFamily.family.name,
      code: userFamily.family.code,
      members: allMembers,
      userRole: userFamily.member.role,
    });
  } catch (error) {
    console.error('Error fetching family details by ID:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleDeleteFamily(req, res, familyId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    if (!familyId) {
      return res.status(400).json({ message: 'Family ID is required' });
    }

    const [userFamily] = await database
      .select({
        family: families,
        member: familyMembers,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(and(
        eq(familyMembers.userId, user.id),
        eq(familyMembers.familyId, familyId),
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
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleLeaveFamily(req, res) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();
    const { familyId } = req.body;

    if (!familyId) {
      return res.status(400).json({ message: 'Family ID is required' });
    }

    const [membership] = await database
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.userId, user.id), eq(familyMembers.familyId, familyId)))
      .limit(1);

    if (!membership) {
      return res.status(404).json({ message: 'No family membership found' });
    }

    await database
      .delete(familyMembers)
      .where(and(eq(familyMembers.userId, user.id), eq(familyMembers.familyId, familyId)));

    return res.status(200).json({ message: 'Left family successfully' });
  } catch (error) {
    console.error('Error leaving family:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleRemoveFamilyMember(req, res, memberId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const familyId = requestUrl.searchParams.get('familyId') || req.body?.familyId;

    if (!familyId) {
      return res.status(400).json({ message: 'Family ID is required' });
    }

    const [userFamily] = await database
      .select({
        family: families,
        member: familyMembers,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(and(
        eq(familyMembers.userId, user.id),
        eq(familyMembers.familyId, familyId),
        eq(familyMembers.role, 'admin')
      ))
      .limit(1);

    if (!userFamily) {
      return res.status(404).json({ message: 'Family not found or not authorized' });
    }

    await database
      .delete(familyMembers)
      .where(and(eq(familyMembers.id, memberId), eq(familyMembers.familyId, familyId)));

    return res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing family member:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
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

    const items = await fetchGroceryItemsForFamily(database, userFamily.familyId);

    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching grocery items:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetGroceryItemsByFamily(req, res, familyId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    // Verify user is a member of the requested family
    const [userFamilyMembership] = await database
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.userId, user.id), eq(familyMembers.familyId, familyId)));

    if (!userFamilyMembership) {
      return res.status(403).json({ message: 'Access denied: Not a member of this family' });
    }

    const items = await fetchGroceryItemsForFamily(database, familyId);

    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching grocery items by family:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getUserFamilyMembership(database, userId, familyId) {
  const whereCondition = familyId
    ? and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, familyId))
    : eq(familyMembers.userId, userId);

  const [membership] = await database
    .select()
    .from(familyMembers)
    .where(whereCondition)
    .limit(1);

  if (!membership && familyId) {
    throw new HttpError(403, 'Access denied: Not a member of this family');
  }

  return membership;
}

async function handleCreateGroceryItem(req, res) {
  try {
    const user = await authenticateUser(req);
    const { name, familyId } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    const database = getDatabase();
    const userFamily = await getUserFamilyMembership(database, user.id, familyId);

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
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleUpdateGroceryItem(req, res, itemId) {
  try {
    const user = await authenticateUser(req);
    const { completed, familyId } = req.body;
    const database = getDatabase();
    const userFamily = await getUserFamilyMembership(database, user.id, familyId);

    if (!userFamily) {
      return res.status(404).json({ message: 'No family found' });
    }

    const [item] = await database
      .update(groceryItems)
      .set({ completed })
      .where(and(
  eq(groceryItems.id, Number.parseInt(itemId, 10)),
        eq(groceryItems.familyId, userFamily.familyId)
      ))
      .returning();

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const addedBy = await resolveAddedByDisplayName(database, userFamily.familyId, item.addedBy);

    return res.status(200).json({ ...item, addedBy });
  } catch (error) {
    console.error('Error updating grocery item:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleDeleteGroceryItem(req, res, itemId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const familyId = requestUrl.searchParams.get('familyId') || req.body?.familyId;
    const userFamily = await getUserFamilyMembership(database, user.id, familyId);

    if (!userFamily) {
      return res.status(404).json({ message: 'No family found' });
    }

    await database
      .delete(groceryItems)
      .where(and(
  eq(groceryItems.id, Number.parseInt(itemId, 10)),
        eq(groceryItems.familyId, userFamily.familyId)
      ));

    return res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting grocery item:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleDeleteAllGroceryItems(req, res, familyId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    // Verify user is a member of the requested family
    const [userFamilyMembership] = await database
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.userId, user.id), eq(familyMembers.familyId, familyId)));

    if (!userFamilyMembership) {
      return res.status(403).json({ message: 'Access denied: Not a member of this family' });
    }

    // Delete all items for this family
    const deletedItems = await database
      .delete(groceryItems)
      .where(eq(groceryItems.familyId, familyId))
      .returning();

    return res.status(200).json({ 
      message: 'All items deleted successfully',
      deletedCount: deletedItems.length
    });
  } catch (error) {
    console.error('Error deleting all grocery items:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleMarkAllItemsCompleted(req, res, familyId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    // Verify user is a member of the requested family
    const [userFamilyMembership] = await database
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.userId, user.id), eq(familyMembers.familyId, familyId)));

    if (!userFamilyMembership) {
      return res.status(403).json({ message: 'Access denied: Not a member of this family' });
    }

    // Mark all items as completed for this family
    const updatedItems = await database
      .update(groceryItems)
      .set({ completed: true })
      .where(eq(groceryItems.familyId, familyId))
      .returning();

    return res.status(200).json({ 
      message: 'All items marked as completed',
      updatedCount: updatedItems.length,
      items: updatedItems
    });
  } catch (error) {
    console.error('Error marking all items as completed:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleMarkAllItemsPending(req, res, familyId) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    // Verify user is a member of the requested family
    const [userFamilyMembership] = await database
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.userId, user.id), eq(familyMembers.familyId, familyId)));

    if (!userFamilyMembership) {
      return res.status(403).json({ message: 'Access denied: Not a member of this family' });
    }

    // Mark all items as pending for this family
    const updatedItems = await database
      .update(groceryItems)
      .set({ completed: false })
      .where(eq(groceryItems.familyId, familyId))
      .returning();

    return res.status(200).json({ 
      message: 'All items marked as pending',
      updatedCount: updatedItems.length,
      items: updatedItems
    });
  } catch (error) {
    console.error('Error marking all items as pending:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Express middleware adapter for development
function expressMiddleware(req, res, next) {
  // Adapt Express request to Vercel format
  const vercelReq = {
    ...req,
    url: req.originalUrl || req.url,
    method: req.method,
    headers: req.headers,
    body: req.body
  };

  // Adapt Express response to Vercel format
  const vercelRes = {
    setHeader: (name, value) => {
      res.setHeader(name, value);
      return vercelRes;
    },
    status: (code) => {
      res.status(code);
      return vercelRes;
    },
    json: (data) => {
      res.json(data);
      return vercelRes;
    },
    end: () => {
      res.end();
      return vercelRes;
    }
  };

  // Call the handler and handle any errors
  handler(vercelReq, vercelRes)
    .catch(next);
}

// Cleanup duplicate items handler
async function handleCleanupDuplicates(req, res) {
  try {
    await authenticateUser(req);
    const database = getDatabase();
    
    console.log('🧹 Starting duplicate cleanup...');
    
    // Get all grocery items grouped by family
    const allItems = await database.select().from(groceryItems);
    
    console.log(`Found ${allItems.length} total items`);
    
    // Group by family and name to find duplicates
    const familyGroups = {};
    for (const item of allItems) {
      const key = `${item.familyId}-${item.name.toLowerCase()}`;
      if (!familyGroups[key]) {
        familyGroups[key] = [];
      }
      familyGroups[key].push(item);
    }
    
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    
    // Process each group
    for (const items of Object.values(familyGroups)) {
      if (items.length > 1) {
        duplicatesFound += items.length - 1;
        console.log(`Found ${items.length} duplicates of "${items[0].name}" in family ${items[0].familyId}`);
        
        // Keep the first item (oldest), delete the rest
        const itemsToDelete = items.slice(1);
        
        for (const item of itemsToDelete) {
          await database
            .delete(groceryItems)
            .where(eq(groceryItems.id, item.id));
          duplicatesRemoved++;
          console.log(`Deleted duplicate item ID ${item.id}: "${item.name}"`);
        }
      }
    }
    
    const response = {
      success: true,
      message: `Cleanup complete`,
      duplicatesFound,
      duplicatesRemoved,
      totalItemsAfter: allItems.length - duplicatesRemoved
    };
    
    console.log('✅ Cleanup results:', response);
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    if (error instanceof HttpError || error?.status) {
      return res.status(error.status || 500).json({ message: error.message });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup duplicates', 
      error: error.message 
    });
  }
}

async function handleDeleteAccount(req, res) {
  try {
    const user = await authenticateUser(req);
    const database = getDatabase();

    const result = await database.transaction(async (tx) => {
      const memberships = await tx
        .select({
          membershipId: familyMembers.id,
          familyId: familyMembers.familyId,
          role: familyMembers.role,
        })
        .from(familyMembers)
        .where(eq(familyMembers.userId, user.id));

      const adminFamilies = memberships
        .filter((membership) => membership.role === 'admin')
        .map((membership) => membership.familyId);

      let familiesDeleted = 0;
      for (const familyId of adminFamilies) {
        await tx.delete(families).where(eq(families.id, familyId));
        familiesDeleted += 1;
      }

      const removedMemberships = await tx
        .delete(familyMembers)
        .where(eq(familyMembers.userId, user.id))
        .returning({ familyId: familyMembers.familyId });

      return {
        familiesDeleted,
        membershipsRemoved: removedMemberships.length,
      };
    });

    let supabaseUserDeleted = false;
    const supabaseServiceClient = getSupabaseServiceClient();
    if (supabaseServiceClient) {
      const { error } = await supabaseServiceClient.auth.admin.deleteUser(user.id);
      if (error) {
        console.error('Failed to delete Supabase user during account deletion:', error);
      } else {
        supabaseUserDeleted = true;
      }
    } else {
      console.warn('Supabase service role key not configured; skipped deleting user from Supabase.');
    }

    return res.status(200).json({
      message: 'Account deleted successfully',
      familiesDeleted: result.familiesDeleted,
      membershipsRemoved: result.membershipsRemoved,
      supabaseUserDeleted,
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    if (error.status === 401) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Export for Vercel serverless function (production)
export default handler;

// Export for Express middleware (development)
export { expressMiddleware };
