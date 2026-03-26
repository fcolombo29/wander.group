import type { Express } from "express";
import { isAuthenticated } from "../replit_integrations/auth";
import { db } from "../db";
import {
  trips, tripMembers, expenses, payments, activities,
  documents, journalEntries, mapPins, invitationCodes, users
} from "../../shared/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";

function getUserId(req: any): string {
  return req.user?.claims?.sub;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function verifyTripMember(userId: string, tripId: string): Promise<boolean> {
  const [member] = await db.select().from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)));
  return !!member;
}

async function verifyTripAdmin(userId: string, tripId: string): Promise<boolean> {
  const [member] = await db.select().from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId), eq(tripMembers.role, "admin")));
  return !!member;
}

export function registerApiRoutes(app: Express) {

  // ─── TRIPS ──────────────────────────────────────────

  app.get("/api/trips", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const memberRows = await db.select({ tripId: tripMembers.tripId })
        .from(tripMembers)
        .where(eq(tripMembers.userId, userId));
      const tripIds = memberRows.map(m => m.tripId);
      if (tripIds.length === 0) return res.json([]);
      const result = await db.select().from(trips).where(inArray(trips.id, tripIds));
      res.json(result);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  app.get("/api/trips/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const isMember = await verifyTripMember(userId, req.params.id);
      if (!isMember) return res.status(403).json({ message: "No tienes acceso a este viaje" });
      const [trip] = await db.select().from(trips).where(eq(trips.id, req.params.id));
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trip" });
    }
  });

  app.post("/api/trips", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const [trip] = await db.insert(trips).values({
        name: req.body.name || "Nueva Aventura",
        destination: req.body.destination || "Destino",
        startDate: req.body.start_date || new Date().toISOString().split("T")[0],
        endDate: req.body.end_date || new Date().toISOString().split("T")[0],
        status: "active",
        imageUrl: req.body.image_url || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800",
        createdBy: userId,
      }).returning();

      await db.insert(tripMembers).values({
        tripId: trip.id,
        userId: userId,
        role: "admin",
      });

      const code = generateCode();
      await db.insert(invitationCodes).values({
        tripId: trip.id,
        code: code,
        role: "editor",
        createdBy: userId,
      });

      res.json(trip);
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(500).json({ message: "Failed to create trip" });
    }
  });

  app.patch("/api/trips/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const isMember = await verifyTripMember(userId, req.params.id);
      if (!isMember) return res.status(403).json({ message: "No tienes acceso" });
      const updates: any = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.destination !== undefined) updates.destination = req.body.destination;
      if (req.body.start_date !== undefined) updates.startDate = req.body.start_date;
      if (req.body.end_date !== undefined) updates.endDate = req.body.end_date;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.image_url !== undefined) updates.imageUrl = req.body.image_url;

      const [trip] = await db.update(trips).set(updates).where(eq(trips.id, req.params.id)).returning();
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Failed to update trip" });
    }
  });

  // ─── TRIP MEMBERS ───────────────────────────────────

  app.get("/api/trips/:tripId/members", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const isMember = await verifyTripMember(userId, req.params.tripId);
      if (!isMember) return res.status(403).json({ message: "No tienes acceso" });
      const members = await db.select({
        id: tripMembers.id,
        tripId: tripMembers.tripId,
        userId: tripMembers.userId,
        role: tripMembers.role,
        userName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userAvatar: users.profileImageUrl,
      })
        .from(tripMembers)
        .innerJoin(users, eq(tripMembers.userId, users.id))
        .where(eq(tripMembers.tripId, req.params.tripId));

      const result = members.map(m => ({
        id: m.userId,
        email: m.userEmail || "",
        name: [m.userName, m.userLastName].filter(Boolean).join(" ") || m.userEmail || "Usuario",
        avatar_url: m.userAvatar,
        role: m.role,
      }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.patch("/api/trips/:tripId/members/:userId", isAuthenticated, async (req, res) => {
    try {
      const requesterId = getUserId(req);
      const isAdmin = await verifyTripAdmin(requesterId, req.params.tripId);
      if (!isAdmin) return res.status(403).json({ message: "Solo el administrador puede cambiar roles" });
      if (req.params.userId === requesterId) return res.status(400).json({ message: "No puedes cambiar tu propio rol" });
      const { role } = req.body;
      if (!["admin", "editor", "viewer"].includes(role)) return res.status(400).json({ message: "Rol inválido" });
      await db.update(tripMembers).set({ role }).where(
        and(eq(tripMembers.tripId, req.params.tripId), eq(tripMembers.userId, req.params.userId))
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  app.delete("/api/trips/:tripId/members/:userId", isAuthenticated, async (req, res) => {
    try {
      const requesterId = getUserId(req);
      const isAdmin = await verifyTripAdmin(requesterId, req.params.tripId);
      const isSelf = requesterId === req.params.userId;
      if (!isAdmin && !isSelf) return res.status(403).json({ message: "Sin permisos para eliminar este miembro" });
      if (isAdmin && req.params.userId === requesterId) return res.status(400).json({ message: "El administrador no puede eliminarse a sí mismo" });
      await db.delete(tripMembers).where(
        and(eq(tripMembers.tripId, req.params.tripId), eq(tripMembers.userId, req.params.userId))
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // ─── INVITATION CODES ──────────────────────────────

  app.get("/api/trips/:tripId/invite-code", isAuthenticated, async (req, res) => {
    try {
      const [existing] = await db.select().from(invitationCodes)
        .where(eq(invitationCodes.tripId, req.params.tripId));
      if (existing) return res.json({ code: existing.code });

      const code = generateCode();
      const userId = getUserId(req);
      await db.insert(invitationCodes).values({
        tripId: req.params.tripId,
        code,
        role: "editor",
        createdBy: userId,
      });
      res.json({ code });
    } catch (error) {
      res.status(500).json({ message: "Failed to get invite code" });
    }
  });

  app.post("/api/trips/join", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const code = (req.body.code || "").toUpperCase();

      const [invitation] = await db.select().from(invitationCodes)
        .where(eq(invitationCodes.code, code));

      if (!invitation) {
        const [trip] = await db.select().from(trips).where(eq(trips.id, code));
        if (!trip) return res.status(404).json({ message: "Código inválido" });

        const [existingMember] = await db.select().from(tripMembers)
          .where(and(eq(tripMembers.tripId, trip.id), eq(tripMembers.userId, userId)));
        if (!existingMember) {
          await db.insert(tripMembers).values({ tripId: trip.id, userId, role: "viewer" });
        }
        return res.json(trip);
      }

      if (invitation.maxUses && invitation.uses >= invitation.maxUses) {
        return res.status(400).json({ message: "Este código ya alcanzó el máximo de usos" });
      }

      const [existingMember] = await db.select().from(tripMembers)
        .where(and(eq(tripMembers.tripId, invitation.tripId), eq(tripMembers.userId, userId)));

      if (!existingMember) {
        await db.insert(tripMembers).values({
          tripId: invitation.tripId,
          userId,
          role: invitation.role,
        });
        await db.update(invitationCodes)
          .set({ uses: invitation.uses + 1 })
          .where(eq(invitationCodes.id, invitation.id));
      }

      const [trip] = await db.select().from(trips).where(eq(trips.id, invitation.tripId));
      res.json(trip);
    } catch (error) {
      console.error("Error joining trip:", error);
      res.status(500).json({ message: "Failed to join trip" });
    }
  });

  // ─── EXPENSES ───────────────────────────────────────

  app.get("/api/trips/:tripId/expenses", isAuthenticated, async (req, res) => {
    try {
      const result = await db.select().from(expenses).where(eq(expenses.tripId, req.params.tripId));
      res.json(result.map(e => ({
        ...e,
        amount: Number(e.amount),
        payer_id: e.payerId,
        trip_id: e.tripId,
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/trips/:tripId/expenses", isAuthenticated, async (req, res) => {
    try {
      const [expense] = await db.insert(expenses).values({
        tripId: req.params.tripId,
        payerId: req.body.payer_id,
        amount: String(req.body.amount),
        description: req.body.description,
        date: req.body.date,
        category: req.body.category,
        participants: req.body.participants || [],
      }).returning();
      res.json({ ...expense, amount: Number(expense.amount), payer_id: expense.payerId, trip_id: expense.tripId });
    } catch (error) {
      console.error("Error adding expense:", error);
      res.status(500).json({ message: "Failed to add expense" });
    }
  });

  app.patch("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const updates: any = {};
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.amount !== undefined) updates.amount = String(req.body.amount);
      if (req.body.category !== undefined) updates.category = req.body.category;
      if (req.body.date !== undefined) updates.date = req.body.date;
      if (req.body.participants !== undefined) updates.participants = req.body.participants;

      await db.update(expenses).set(updates).where(eq(expenses.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      await db.delete(expenses).where(eq(expenses.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // ─── PAYMENTS ───────────────────────────────────────

  app.get("/api/trips/:tripId/payments", isAuthenticated, async (req, res) => {
    try {
      const result = await db.select().from(payments).where(eq(payments.tripId, req.params.tripId));
      res.json(result.map(p => ({
        ...p, amount: Number(p.amount), from_id: p.fromId, to_id: p.toId, trip_id: p.tripId,
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/trips/:tripId/payments", isAuthenticated, async (req, res) => {
    try {
      const [payment] = await db.insert(payments).values({
        tripId: req.params.tripId,
        fromId: req.body.from_id,
        toId: req.body.to_id,
        amount: String(req.body.amount),
        date: req.body.date,
      }).returning();
      res.json({ ...payment, amount: Number(payment.amount), from_id: payment.fromId, to_id: payment.toId, trip_id: payment.tripId });
    } catch (error) {
      res.status(500).json({ message: "Failed to add payment" });
    }
  });

  // ─── ACTIVITIES ─────────────────────────────────────

  app.get("/api/trips/:tripId/activities", isAuthenticated, async (req, res) => {
    try {
      const result = await db.select().from(activities).where(eq(activities.tripId, req.params.tripId));
      res.json(result.map(a => ({ ...a, trip_id: a.tripId })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post("/api/trips/:tripId/activities", isAuthenticated, async (req, res) => {
    try {
      const [activity] = await db.insert(activities).values({
        tripId: req.params.tripId,
        title: req.body.title,
        description: req.body.description,
        date: req.body.date,
        time: req.body.time,
        status: req.body.status || "pending",
        participants: req.body.participants || [],
      }).returning();
      res.json({ ...activity, trip_id: activity.tripId });
    } catch (error) {
      res.status(500).json({ message: "Failed to add activity" });
    }
  });

  app.patch("/api/activities/:id", isAuthenticated, async (req, res) => {
    try {
      const updates: any = {};
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.date !== undefined) updates.date = req.body.date;
      if (req.body.time !== undefined) updates.time = req.body.time;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.participants !== undefined) updates.participants = req.body.participants;

      await db.update(activities).set(updates).where(eq(activities.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  // ─── DOCUMENTS ──────────────────────────────────────

  app.get("/api/trips/:tripId/documents", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const result = await db.select().from(documents).where(eq(documents.tripId, req.params.tripId));
      const visible = result.filter(d => {
        if (d.visibility === "all") return true;
        if (d.uploadedBy === userId) return true;
        const allowed = (d.allowedUsers as string[]) || [];
        return allowed.includes(userId);
      });
      res.json(visible.map(d => ({
        ...d,
        trip_id: d.tripId,
        uploaded_by: d.uploadedBy,
        file_data: d.fileData,
        mime_type: d.mimeType,
        allowed_users: d.allowedUsers,
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/trips/:tripId/documents", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const [doc] = await db.insert(documents).values({
        tripId: req.params.tripId,
        uploadedBy: userId,
        name: req.body.name,
        type: req.body.type,
        url: req.body.url || "#",
        fileData: req.body.file_data,
        mimeType: req.body.mime_type,
        visibility: req.body.visibility || "all",
        allowedUsers: req.body.allowed_users || [],
        date: req.body.date,
      }).returning();
      res.json({ ...doc, trip_id: doc.tripId, uploaded_by: doc.uploadedBy, file_data: doc.fileData, mime_type: doc.mimeType, allowed_users: doc.allowedUsers });
    } catch (error) {
      console.error("Error adding document:", error);
      res.status(500).json({ message: "Failed to add document" });
    }
  });

  app.patch("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const [existing] = await db.select().from(documents).where(eq(documents.id, req.params.id));
      if (!existing) return res.status(404).json({ message: "Documento no encontrado" });
      if (existing.uploadedBy !== userId) return res.status(403).json({ message: "Solo quien subió el archivo puede modificarlo" });
      const updates: any = {};
      if (req.body.visibility !== undefined) updates.visibility = req.body.visibility;
      if (req.body.allowed_users !== undefined) updates.allowedUsers = req.body.allowed_users;
      const [updated] = await db.update(documents).set(updates).where(eq(documents.id, req.params.id)).returning();
      res.json({ ...updated, trip_id: updated.tripId, uploaded_by: updated.uploadedBy, file_data: updated.fileData, mime_type: updated.mimeType, allowed_users: updated.allowedUsers });
    } catch (error) {
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const [existing] = await db.select().from(documents).where(eq(documents.id, req.params.id));
      if (!existing) return res.status(404).json({ message: "Documento no encontrado" });
      if (existing.uploadedBy !== userId) return res.status(403).json({ message: "Solo quien subió el archivo puede eliminarlo" });
      await db.delete(documents).where(eq(documents.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // ─── MAP PINS ───────────────────────────────────────

  app.get("/api/trips/:tripId/pins", isAuthenticated, async (req, res) => {
    try {
      const result = await db.select().from(mapPins).where(eq(mapPins.tripId, req.params.tripId));
      res.json(result.map(p => ({ ...p, trip_id: p.tripId })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pins" });
    }
  });

  app.post("/api/trips/:tripId/pins", isAuthenticated, async (req, res) => {
    try {
      const [pin] = await db.insert(mapPins).values({
        tripId: req.params.tripId,
        name: req.body.name,
        address: req.body.address,
        category: req.body.category,
      }).returning();
      res.json({ ...pin, trip_id: pin.tripId });
    } catch (error) {
      res.status(500).json({ message: "Failed to add pin" });
    }
  });

  app.delete("/api/pins/:id", isAuthenticated, async (req, res) => {
    try {
      await db.delete(mapPins).where(eq(mapPins.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete pin" });
    }
  });

  // ─── JOURNAL ────────────────────────────────────────

  app.get("/api/trips/:tripId/journal", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const result = await db.select().from(journalEntries)
        .where(and(
          eq(journalEntries.tripId, req.params.tripId),
          or(eq(journalEntries.userId, userId), eq(journalEntries.isShared, true))
        ));
      res.json(result.map(j => ({
        ...j, trip_id: j.tripId, user_id: j.userId, is_shared: j.isShared, created_at: j.createdAt?.toISOString(),
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch journal" });
    }
  });

  app.post("/api/trips/:tripId/journal", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await db.select().from(journalEntries)
        .where(and(
          eq(journalEntries.tripId, req.params.tripId),
          eq(journalEntries.userId, userId),
          eq(journalEntries.date, req.body.date),
        ));

      if (existing.length > 0) {
        const [updated] = await db.update(journalEntries)
          .set({ content: req.body.content, isShared: req.body.is_shared ?? false })
          .where(eq(journalEntries.id, existing[0].id))
          .returning();
        return res.json({
          ...updated, trip_id: updated.tripId, user_id: updated.userId,
          is_shared: updated.isShared, created_at: updated.createdAt?.toISOString(),
        });
      }

      const [entry] = await db.insert(journalEntries).values({
        tripId: req.params.tripId,
        userId,
        date: req.body.date,
        content: req.body.content,
        isShared: req.body.is_shared ?? false,
      }).returning();
      res.json({
        ...entry, trip_id: entry.tripId, user_id: entry.userId,
        is_shared: entry.isShared, created_at: entry.createdAt?.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to save journal entry" });
    }
  });

  // ─── USER PROFILE ──────────────────────────────────

  app.patch("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const updates: any = {};
      if (req.body.first_name !== undefined) updates.firstName = req.body.first_name;
      if (req.body.last_name !== undefined) updates.lastName = req.body.last_name;
      if (req.body.profile_image_url !== undefined) updates.profileImageUrl = req.body.profile_image_url;
      updates.updatedAt = new Date();

      const [user] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/user/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const [user] = await db.select({ notificationSettings: users.notificationSettings }).from(users).where(eq(users.id, userId));
      res.json(user?.notificationSettings || { enabled: false, invitations: true, expenses: true, activities: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification settings" });
    }
  });

  app.patch("/api/user/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const settings = {
        enabled: req.body.enabled ?? false,
        invitations: req.body.invitations ?? true,
        expenses: req.body.expenses ?? true,
        activities: req.body.activities ?? true,
      };
      await db.update(users).set({ notificationSettings: settings, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });
}
