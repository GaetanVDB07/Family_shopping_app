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
        userName: req.user.name,
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
        userName: req.user.name,
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
      res.json(userFamily);
    } catch (error) {
      console.error('Get user family error:', error);
      res.status(500).json({ message: "Kon familie informatie niet ophalen" });
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

      const validatedData = insertGroceryItemSchema.parse({
        ...req.body,
        addedBy: req.user.id,
        familyId: userFamily.familyId,
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
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const item = await storage.updateGroceryItem(id, updates, userFamily.familyId);
      if (!item) {
        return res.status(404).json({ message: "Boodschappenitem niet gevonden" });
      }
      
      // Broadcast to family members
      broadcastToFamily(userFamily.familyId, { type: 'itemUpdated', item });
      
      res.json(item);
    } catch (error) {
      console.error('Update grocery item error:', error);
      res.status(400).json({ message: "Fout bij bijwerken van item" });
    }
  });

  app.delete("/api/grocery-items/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userFamily = await storage.getUserFamily(req.user.id);
      if (!userFamily) {
        return res.status(404).json({ message: "Geen familie gevonden" });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.deleteGroceryItem(id, userFamily.familyId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Boodschappenitem niet gevonden" });
      }
      
      // Broadcast to family members
      broadcastToFamily(userFamily.familyId, { type: 'itemDeleted', id });
      
      res.status(204).send();
    } catch (error) {
      console.error('Delete grocery item error:', error);
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
