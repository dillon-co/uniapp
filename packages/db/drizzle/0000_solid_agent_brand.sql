CREATE TABLE "agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"memory_type" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_gates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"agent_run_id" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"responder_id" uuid,
	"note" text,
	"expires_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"agent_type" text NOT NULL,
	"agent_entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"tool_name" text,
	"duration_ms" integer,
	"cost_usd" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"proposal" jsonb NOT NULL,
	"counter_proposal" jsonb,
	"response" jsonb,
	"negotiation_id" uuid,
	"auto_accept_threshold_cents" bigint,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"terms" jsonb NOT NULL,
	"price_cents" bigint NOT NULL,
	"deposit_cents" bigint DEFAULT 0,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"negotiation_id" uuid,
	"confirmed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"payment_intent_id" text,
	"stripe_charge_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"state" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"timezone" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"permit_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"regulatory_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"diff" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"edl" jsonb NOT NULL,
	"plan" jsonb,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"latitude" double precision,
	"longitude" double precision,
	"attendance_min" integer,
	"attendance_max" integer,
	"budget_cents" bigint,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"initiator_type" text NOT NULL,
	"initiator_id" uuid NOT NULL,
	"responder_type" text NOT NULL,
	"responder_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"subject" text NOT NULL,
	"rounds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_round" integer DEFAULT 1 NOT NULL,
	"max_rounds" integer DEFAULT 10 NOT NULL,
	"resolved_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"outcome" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"channel" text DEFAULT 'in_app' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"invited_by" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"city_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trust_score" double precision DEFAULT 50,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"payment_intent_id" text NOT NULL,
	"stripe_charge_id" text,
	"amount_cents" bigint NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text DEFAULT 'card',
	"metadata" jsonb,
	"refund_reason" text,
	"refunded_at" timestamp with time zone,
	"refund_amount_cents" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_payment_intent_id_unique" UNIQUE("payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "permits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"application_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tracking_number" text,
	"notes" text,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permits_tracking_number_unique" UNIQUE("tracking_number")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"event_id" uuid,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_revenue_cents" bigint DEFAULT 0 NOT NULL,
	"total_spend_cents" bigint DEFAULT 0 NOT NULL,
	"net_cents" bigint DEFAULT 0 NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outstanding_payments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "shift_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"checked_in_at" timestamp with time zone,
	"checked_out_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsorships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"type" text DEFAULT 'financial' NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"contract_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"city_id" uuid,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trust_score" double precision DEFAULT 50,
	"refresh_token_hash" text,
	"reset_token" text,
	"reset_token_expires_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"service_area" text[] DEFAULT '{}' NOT NULL,
	"pricing_range" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"portfolio" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trust_score" double precision DEFAULT 50,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"capacity" integer NOT NULL,
	"venue_type" text[] NOT NULL,
	"amenities" text[] DEFAULT '{}' NOT NULL,
	"pricing" jsonb NOT NULL,
	"availability" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"images" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"verification_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"notes" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" text NOT NULL,
	"role" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"slots" integer DEFAULT 1 NOT NULL,
	"filled" integer DEFAULT 0 NOT NULL,
	"requirements" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"availability" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verified_skills" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "volunteers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "approval_gates" ADD CONSTRAINT "approval_gates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_gates" ADD CONSTRAINT "approval_gates_responder_id_users_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_history" ADD CONSTRAINT "event_history_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_history" ADD CONSTRAINT "event_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permits" ADD CONSTRAINT "permits_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permits" ADD CONSTRAINT "permits_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_signups" ADD CONSTRAINT "shift_signups_shift_id_volunteer_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."volunteer_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_signups" ADD CONSTRAINT "shift_signups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_waitlist" ADD CONSTRAINT "shift_waitlist_shift_id_volunteer_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."volunteer_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_waitlist" ADD CONSTRAINT "shift_waitlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_sponsor_id_organizations_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_shifts" ADD CONSTRAINT "volunteer_shifts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;