import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertGroceryItemSchema, type WebSocketMessage } from "@shared/schema";
import { authenticateUser, type AuthenticatedRequest } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Family Management Routes
  app.post("/api/families", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, code, createdBy } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const family = await storage.createFamily({
        name,
        code,
        createdBy: req.user.id,
      });

      // Add creator as admin member
      await storage.addFamilyMember({
        familyId: family.id,
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name || req.user.email, // Fallback to email if name is not available
        role: "admin",
      });

      res.status(201).json(family);
    } catch (error) {
      console.error('Create family error:', error);
      res.status(400).json({ message: "Kon familie niet aanmaken" });
    }
  });

  app.post("/api/families/join", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, userId, userEmail, userName } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const family = await storage.getFamilyByCode(code);
      if (!family) {
        return res.status(404).json({ message: "Familie code niet gevonden" });
      }

      // Check if user is already a member
      const existingMember = await storage.getFamilyMember(family.id, req.user.id);
      if (existingMember) {
        return res.status(400).json({ message: "Je bent al lid van deze familie" });
      }

      await storage.addFamilyMember({
        familyId: family.id,
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name || req.user.email, // Fallback to email if name is not available
        role: "member",
      });

      res.json({ familyName: family.name, familyId: family.id });
    } catch (error) {
      console.error('Join family error:', error);
      res.status(400).json({ message: "Kon niet bij familie voegen" });
    }
  });

  app.get("/api/user/family", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      
      if (!userFamily) {
        return res.status(404).json({ message: "User is not in any family" });
      }
      
      res.json(userFamily);
    } catch (error) {
      console.error('Get user family error:', error);
      res.status(500).json({ message: "Kon familie informatie niet ophalen" });
    }
  });

  app.get("/api/family/details", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      // Check if user is admin
      const member = await storage.getFamilyMember(userFamily.familyId, req.user.id);
      if (!member || member.role !== "admin") {
        return res.status(403).json({ message: "Alleen admins kunnen familie details bekijken" });
      }

      const familyDetails = await storage.getFamilyDetails(userFamily.familyId);
      res.json(familyDetails);
    } catch (error) {
      console.error('Get family details error:', error);
      res.status(500).json({ message: "Kon familie details niet ophalen" });
    }
  });

  app.post("/api/family/leave", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      // Check if user is admin - admins cannot leave
      const member = await storage.getFamilyMember(userFamily.familyId, req.user.id);
      if (member?.role === "admin") {
        return res.status(403).json({ message: "Admins kunnen de familie niet verlaten" });
      }

      const success = await storage.removeFamilyMember(userFamily.familyId, req.user.id);
      if (!success) {
        return res.status(404).json({ message: "Kon familie niet verlaten" });
      }

      res.json({ message: "Familie succesvol verlaten" });
    } catch (error) {
      console.error('Leave family error:', error);
      res.status(500).json({ message: "Kon familie niet verlaten" });
    }
  });

  app.delete("/api/family/members/:memberId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      // Check if user is admin
      const adminMember = await storage.getFamilyMember(userFamily.familyId, req.user.id);
      if (!adminMember || adminMember.role !== "admin") {
        return res.status(403).json({ message: "Alleen admins kunnen leden verwijderen" });
      }

      const memberId = req.params.memberId;
      const memberToRemove = await storage.getFamilyMemberById(memberId);
      
      if (!memberToRemove || memberToRemove.familyId !== userFamily.familyId) {
        return res.status(404).json({ message: "Familielid niet gevonden" });
      }

      // Cannot remove admin
      if (memberToRemove.role === "admin") {
        return res.status(403).json({ message: "Admin kan niet worden verwijderd" });
      }

      const success = await storage.removeFamilyMemberById(memberId);
      if (!success) {
        return res.status(404).json({ message: "Kon familielid niet verwijderen" });
      }

      res.json({ message: "Familielid succesvol verwijderd" });
    } catch (error) {
      console.error('Remove family member error:', error);
      res.status(500).json({ message: "Kon familielid niet verwijderen" });
    }
  });

  app.delete("/api/family", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      // Check if user is admin - only admins can delete families
      const member = await storage.getFamilyMember(userFamily.familyId, req.user.id);
      if (!member || member.role !== "admin") {
        return res.status(403).json({ message: "Alleen admins kunnen de familie verwijderen" });
      }

      const success = await storage.deleteFamily(userFamily.familyId);
      if (!success) {
        return res.status(404).json({ message: "Kon familie niet verwijderen" });
      }

      res.json({ message: "Familie succesvol verwijderd" });
    } catch (error) {
      console.error('Delete family error:', error);
      res.status(500).json({ message: "Kon familie niet verwijderen" });
    }
  });

  // Grocery Items API Routes (now with authentication and family context)
  app.get("/api/grocery-items", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      const items = await storage.getAllGroceryItems(userFamily.familyId);
      res.json(items);
    } catch (error) {
      console.error('Get grocery items error:', error);
      res.status(500).json({ message: "Fout bij ophalen van boodschappenlijst" });
    }
  });

  app.post("/api/grocery-items", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      // ✅ Enhanced Security: Validate if user is trying to add item to a different family
      if (req.body.familyId && req.body.familyId !== userFamily.familyId) {
        console.log(`[${new Date().toISOString()}] SECURITY: User ${req.user.id} attempted to add item to different family. User family: ${userFamily.familyId}, Requested family: ${req.body.familyId}`);
        return res.status(403).json({ 
          message: "Je kunt alleen items toevoegen aan je eigen familie" 
        });
      }

      // ✅ Verify user is actually a member of the family (double-check)
      const familyMember = await storage.getFamilyMember(userFamily.familyId, req.user.id);
      if (!familyMember) {
        console.log(`[${new Date().toISOString()}] SECURITY: User ${req.user.id} is not a verified member of family ${userFamily.familyId}`);
        return res.status(403).json({ 
          message: "Je bent geen geldig lid van deze familie" 
        });
      }

      const validatedData = insertGroceryItemSchema.parse({
        ...req.body,
        addedBy: req.user.id,
        familyId: userFamily.familyId, // Always use the user's actual family
      });

      const item = await storage.createGroceryItem(validatedData);
      
      // Broadcast to family members
      broadcastToFamily(userFamily.familyId, { type: 'itemAdded', item });
      
      res.status(201).json(item);
    } catch (error) {
      console.error('Create grocery item error:', error);
      res.status(400).json({ message: "Ongeldig boodschappenitem" });
    }
  });

  app.patch("/api/grocery-items/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    try {
      if (!req.user) {
        console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: PATCH - No user authenticated`);
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: PATCH - No family found for user ${req.user.id}`);
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      // ✅ Verify user is a member of the family
      const familyMember = await storage.getFamilyMember(userFamily.familyId, req.user.id);
      if (!familyMember) {
        console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: PATCH - User ${req.user.id} is not a verified member of family ${userFamily.familyId}`);
        return res.status(403).json({ 
          message: "Je bent geen geldig lid van deze familie" 
        });
      }

      const id = parseInt(req.params.id);
      const updates = req.body;
      
      console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: PATCH - Updating item ${id} for family ${userFamily.familyId}`);
      const item = await storage.updateGroceryItem(id, updates, userFamily.familyId);
      if (!item) {
        console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: PATCH - Item ${id} not found in family ${userFamily.familyId}`);
        return res.status(404).json({ message: "Boodschappenitem niet gevonden" });
      }
      
      // Broadcast to family members
      broadcastToFamily(userFamily.familyId, { type: 'itemUpdated', item });
      
      res.json(item);
      console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: PATCH - Successfully updated item ${id}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] REQUEST ${requestId}: PATCH - Update grocery item error:`, error);
      res.status(400).json({ message: "Fout bij bijwerken van item" });
    }
  });

  app.delete("/api/grocery-items/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    try {
      if (!req.user) {
        console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: DELETE - No user authenticated`);
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: DELETE - No family found for user ${req.user.id}`);
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      // ✅ Verify user is a member of the family
      const familyMember = await storage.getFamilyMember(userFamily.familyId, req.user.id);
      if (!familyMember) {
        console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: DELETE - User ${req.user.id} is not a verified member of family ${userFamily.familyId}`);
        return res.status(403).json({ 
          message: "Je bent geen geldig lid van deze familie" 
        });
      }

      const id = parseInt(req.params.id);
      
      console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: DELETE - Deleting item ${id} for family ${userFamily.familyId}`);
      const deleted = await storage.deleteGroceryItem(id, userFamily.familyId);
      
      if (!deleted) {
        console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: DELETE - Item ${id} not found in family ${userFamily.familyId}`);
        return res.status(404).json({ message: "Boodschappenitem niet gevonden" });
      }
      
      // Broadcast to family members
      broadcastToFamily(userFamily.familyId, { type: 'itemDeleted', id });
      
      res.status(204).send();
      console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: DELETE - Successfully deleted item ${id}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] REQUEST ${requestId}: DELETE - Delete grocery item error:`, error);
      res.status(500).json({ message: "Fout bij verwijderen van item" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const familyClients = new Map<string, Set<WebSocket>>(); // familyId -> Set<WebSocket>

  wss.on('connection', async (ws, req) => {
    // Extract auth token from connection
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'No authentication token');
      return;
    }

    try {
      // Verify token and get user family
      const { supabase } = await import('./auth');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        ws.close(1008, 'Invalid token');
        return;
      }

      const userFamily = await storage.getUserFamily(user.id);
      if (!userFamily) {
        ws.close(1008, 'No family found');
        return;
      }

      // Add client to family group
      if (!familyClients.has(userFamily.familyId)) {
        familyClients.set(userFamily.familyId, new Set());
      }
      familyClients.get(userFamily.familyId)!.add(ws);

      // Send current state to new client
      const items = await storage.getAllGroceryItems(userFamily.familyId);
      console.log(`[${new Date().toISOString()}] WebSocket sync for family ${userFamily.familyId}: sending ${items.length} items`, items.map(item => ({ id: item.id, name: item.name })));
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'sync', items }));
      }

      ws.on('close', () => {
        familyClients.get(userFamily.familyId)?.delete(ws);
        if (familyClients.get(userFamily.familyId)?.size === 0) {
          familyClients.delete(userFamily.familyId);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        familyClients.get(userFamily.familyId)?.delete(ws);
      });

    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1008, 'Authentication failed');
    }
  });

  function broadcastToFamily(familyId: string, message: WebSocketMessage) {
    const messageString = JSON.stringify(message);
    const clients = familyClients.get(familyId);
    if (clients) {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageString);
        }
      });
    }
  }

  return httpServer;
}
