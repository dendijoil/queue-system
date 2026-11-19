-- ADR-002: paksa RLS juga berlaku untuk pemilik tabel (role migrasi/aplikasi non-superuser).
ALTER TABLE "branches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "services" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_series" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tickets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_events" FORCE ROW LEVEL SECURITY;
