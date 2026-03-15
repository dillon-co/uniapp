import { eq, and, sql } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { volunteers, volunteerShifts, shiftSignups, notifications, users } from "@uniapp/db";
import { MemoryStore } from "../memory/memory-store.js";

export interface VolunteerMatchResult {
  shiftId: string;
  shiftTitle: string;
  matchedVolunteers: Array<{
    userId: string;
    name: string;
    matchScore: number;
    matchedSkills: string[];
    signupId?: string;
  }>;
  unfilledSlots: number;
}

export class VolunteerAgent {
  private db: Database;
  private memory: MemoryStore;

  constructor(db: Database) {
    this.db = db;
    this.memory = new MemoryStore(db);
  }

  async matchAndAssign(eventId: string, actorId: string): Promise<VolunteerMatchResult[]> {
    const shifts = await this.db.query.volunteerShifts.findMany({
      where: and(
        eq(volunteerShifts.eventId, eventId),
        sql`${volunteerShifts.filled} < ${volunteerShifts.slots}`,
      ),
    });

    const results: VolunteerMatchResult[] = [];

    for (const shift of shifts) {
      const availableSlots = shift.slots - shift.filled;
      if (availableSlots <= 0) continue;

      // Find volunteers with matching skills who haven't signed up yet
      const signedUpIds = (await this.db.query.shiftSignups.findMany({
        where: and(
          eq(shiftSignups.shiftId, shift.id),
          sql`${shiftSignups.status} NOT IN ('cancelled')`,
        ),
        columns: { userId: true },
      })).map((s) => s.userId);

      const allVolunteers = await this.db.query.volunteers.findMany({
        limit: 100,
      });

      const candidates = allVolunteers.filter((v) => !signedUpIds.includes(v.userId));

      // Score each candidate
      const scored = candidates.map((v) => {
        const volunteerSkills = v.skills as string[];
        const requiredSkills = shift.requirements as string[];
        const matchedSkills = requiredSkills.filter((req) =>
          volunteerSkills.some((skill) =>
            skill.toLowerCase().includes(req.toLowerCase()) ||
            req.toLowerCase().includes(skill.toLowerCase())
          )
        );

        // Check availability (simple: not blocked on shift date)
        const availability = v.availability as {
          blockedDates?: string[];
          weeklyBlocks?: Array<{ day: number; startHour: number; endHour: number }>;
        };
        const shiftDate = shift.startTime.toISOString().split("T")[0]!;
        const isBlocked = availability.blockedDates?.includes(shiftDate) ?? false;

        const matchScore = isBlocked ? 0 : (
          requiredSkills.length === 0 ? 50 :
          Math.round((matchedSkills.length / Math.max(requiredSkills.length, 1)) * 100)
        );

        return { userId: v.userId, matchedSkills, matchScore };
      })
        .filter((c) => c.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, availableSlots);

      // Auto-assign top matches
      const assignedVolunteers: VolunteerMatchResult["matchedVolunteers"] = [];

      for (const candidate of scored) {
        try {
          const [signup] = await this.db.insert(shiftSignups).values({
            shiftId: shift.id,
            userId: candidate.userId,
            status: "confirmed",
          }).returning({ id: shiftSignups.id });

          await this.db.update(volunteerShifts)
            .set({ filled: shift.filled + assignedVolunteers.length + 1 })
            .where(eq(volunteerShifts.id, shift.id));

          // Get volunteer's name for the result
          const user = await this.db.query.users.findFirst({
            where: eq(users.id, candidate.userId),
            columns: { name: true },
          });

          // Send confirmation notification
          await this.db.insert(notifications).values({
            userId: candidate.userId,
            type: "system",
            channel: "in_app",
            title: `Volunteer shift confirmed: ${shift.title}`,
            body: `You've been matched to a shift on ${shift.startTime.toLocaleDateString()} at ${shift.startTime.toLocaleTimeString()}. Role: ${shift.role}.`,
            data: { shiftId: shift.id, eventId } as unknown as Record<string, unknown>,
            deliveredAt: new Date(),
          });

          // Record in memory
          await this.memory.save({
            entityType: "volunteer",
            entityId: candidate.userId,
            memoryType: "event_type_preference",
            content: `Matched to shift "${shift.title}" (${shift.role}) for event ${eventId}. Skills used: ${candidate.matchedSkills.join(", ") || "general"}`,
          });

          assignedVolunteers.push({
            userId: candidate.userId,
            name: user?.name ?? "Unknown",
            matchScore: candidate.matchScore,
            matchedSkills: candidate.matchedSkills,
            signupId: signup?.id,
          });
        } catch {
          // Skip duplicate signups
        }
      }

      results.push({
        shiftId: shift.id,
        shiftTitle: shift.title,
        matchedVolunteers: assignedVolunteers,
        unfilledSlots: availableSlots - assignedVolunteers.length,
      });
    }

    return results;
  }

  async trackHours(userId: string, shiftId: string): Promise<{ hoursWorked: number }> {
    const signup = await this.db.query.shiftSignups.findFirst({
      where: and(eq(shiftSignups.userId, userId), eq(shiftSignups.shiftId, shiftId)),
    });

    if (!signup?.checkedInAt || !signup.checkedOutAt) {
      return { hoursWorked: 0 };
    }

    const hoursWorked =
      (signup.checkedOutAt.getTime() - signup.checkedInAt.getTime()) / (1000 * 60 * 60);

    await this.memory.save({
      entityType: "volunteer",
      entityId: userId,
      memoryType: "booking_outcome",
      content: `Completed shift ${shiftId}: ${hoursWorked.toFixed(1)} hours worked`,
    });

    return { hoursWorked: Math.round(hoursWorked * 10) / 10 };
  }
}
