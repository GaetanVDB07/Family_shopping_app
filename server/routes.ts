import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertGroceryItemSchema, type WebSocketMessage } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Grocery Items API Routes
  app.get("/api/grocery-items", async (req, res) => {
    try {
      const items = await storage.getAllGroceryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Fout bij ophalen van boodschappenlijst" });
    }
  });

  app.post("/api/grocery-items", async (req, res) => {
    try {
      const validatedData = insertGroceryItemSchema.parse(req.body);
      const item = await storage.createGroceryItem(validatedData);
      
      // Broadcast to all connected clients
      broadcastMessage({ type: 'itemAdded', item });
      
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ message: "Ongeldig boodschappenitem" });
    }
  });

  app.patch("/api/grocery-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const item = await storage.updateGroceryItem(id, updates);
      if (!item) {
        return res.status(404).json({ message: "Boodschappenitem niet gevonden" });
      }
      
      // Broadcast to all connected clients
      broadcastMessage({ type: 'itemUpdated', item });
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Fout bij bijwerken van item" });
    }
  });

  app.delete("/api/grocery-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteGroceryItem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Boodschappenitem niet gevonden" });
      }
      
      // Broadcast to all connected clients
      broadcastMessage({ type: 'itemDeleted', id });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Fout bij verwijderen van item" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', async (ws) => {
    clients.add(ws);
    
    // Send current state to new client
    try {
      const items = await storage.getAllGroceryItems();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'sync', items }));
      }
    } catch (error) {
      console.error('Error sending sync data:', error);
    }

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  function broadcastMessage(message: WebSocketMessage) {
    const messageString = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }

  return httpServer;
}
