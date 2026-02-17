import type { Express } from "express";
import { createServer, type Server } from "node:http";
import {
  listOutages,
  getOutage,
  createOutage,
  batchCreateOutages,
  confirmOutage,
  restoreOutage,
  getStats,
  registerUser,
  loginUser,
  getUserById,
  getUserOutages,
  deleteOutage,
  updateOutage,
  listAllUsers,
  deleteUser,
  setUserAdmin,
} from "./appwrite";

export async function registerRoutes(app: Express): Promise<Server> {

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { phone, password, displayName } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ error: "Numéro et mot de passe requis" });
      }
      if (password.length < 4) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 4 caractères" });
      }
      const user = await registerUser(phone, password, displayName);
      res.status(201).json(user);
    } catch (e: any) {
      if (e.code === 409) return res.status(409).json({ error: e.message });
      console.error("POST /api/auth/register error:", e);
      res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ error: "Numéro et mot de passe requis" });
      }
      const user = await loginUser(phone, password);
      res.json(user);
    } catch (e: any) {
      if (e.code === 401) return res.status(401).json({ error: e.message });
      console.error("POST /api/auth/login error:", e);
      res.status(500).json({ error: "Erreur lors de la connexion" });
    }
  });

  app.get("/api/auth/user/:id", async (req, res) => {
    try {
      const user = await getUserById(req.params.id);
      res.json(user);
    } catch (e: any) {
      if (e.code === 404) return res.status(404).json({ error: "Utilisateur non trouvé" });
      console.error("GET /api/auth/user/:id error:", e);
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.get("/api/auth/user/:id/outages", async (req, res) => {
    try {
      const outages = await getUserOutages(req.params.id);
      res.json(outages);
    } catch (e) {
      console.error("GET /api/auth/user/:id/outages error:", e);
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.get("/api/outages", async (req, res) => {
    try {
      const { type, region, hours } = req.query as Record<string, string>;
      const result = await listOutages({ type, region, hours });
      res.json(result);
    } catch (e) {
      console.error("GET /api/outages error:", e);
      res.status(500).json({ error: "Failed to fetch outages" });
    }
  });

  app.get("/api/outages/:id", async (req, res) => {
    try {
      const result = await getOutage(req.params.id);
      res.json(result);
    } catch (e: any) {
      if (e.code === 404) return res.status(404).json({ error: "Not found" });
      console.error("GET /api/outages/:id error:", e);
      res.status(500).json({ error: "Failed to fetch outage" });
    }
  });

  app.post("/api/outages", async (req, res) => {
    try {
      const { type, latitude, longitude, quartier, ville, region, photoUri, userId } = req.body;
      if (!type || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "type, latitude, longitude required" });
      }
      const newOutage = await createOutage({
        type, latitude, longitude, quartier, ville, region, photoUri, userId,
      });
      res.status(201).json(newOutage);
    } catch (e) {
      console.error("POST /api/outages error:", e);
      res.status(500).json({ error: "Failed to create outage" });
    }
  });

  app.post("/api/outages/batch", async (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "Array expected" });
      const created = await batchCreateOutages(items);
      res.json({ synced: created });
    } catch (e) {
      console.error("POST /api/outages/batch error:", e);
      res.status(500).json({ error: "Failed to batch sync" });
    }
  });

  app.post("/api/outages/:id/confirm", async (req, res) => {
    try {
      const updated = await confirmOutage(req.params.id);
      res.json(updated);
    } catch (e: any) {
      if (e.code === 404) return res.status(404).json({ error: "Not found" });
      console.error("POST /api/outages/:id/confirm error:", e);
      res.status(500).json({ error: "Failed to confirm" });
    }
  });

  app.post("/api/outages/:id/restore", async (req, res) => {
    try {
      const updated = await restoreOutage(req.params.id);
      res.json(updated);
    } catch (e: any) {
      if (e.code === 404) return res.status(404).json({ error: "Not found" });
      console.error("POST /api/outages/:id/restore error:", e);
      res.status(500).json({ error: "Failed to restore" });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await getStats();
      res.json(stats);
    } catch (e) {
      console.error("GET /api/stats error:", e);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/admin/users", async (_req, res) => {
    try {
      const users = await listAllUsers();
      res.json(users);
    } catch (e) {
      console.error("GET /api/admin/users error:", e);
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      await deleteUser(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      console.error("DELETE /api/admin/users/:id error:", e);
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.post("/api/admin/users/:id/admin", async (req, res) => {
    try {
      const { isAdmin } = req.body;
      const user = await setUserAdmin(req.params.id, isAdmin);
      res.json(user);
    } catch (e: any) {
      console.error("POST /api/admin/users/:id/admin error:", e);
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.delete("/api/admin/outages/:id", async (req, res) => {
    try {
      await deleteOutage(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      console.error("DELETE /api/admin/outages/:id error:", e);
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.put("/api/admin/outages/:id", async (req, res) => {
    try {
      const updated = await updateOutage(req.params.id, req.body);
      res.json(updated);
    } catch (e: any) {
      console.error("PUT /api/admin/outages/:id error:", e);
      res.status(500).json({ error: "Erreur" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
