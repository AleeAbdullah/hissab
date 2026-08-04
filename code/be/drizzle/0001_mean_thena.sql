DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM ledger_members
    WHERE status IN ('INVITED', 'REMOVED')
  ) THEN
    RAISE EXCEPTION 'Cannot migrate legacy INVITED or REMOVED ledger memberships without product history';
  END IF;
END;
$$;--> statement-breakpoint
ALTER TABLE "ledger_members" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ledger_members" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::text;--> statement-breakpoint
DROP TYPE "public"."ledger_member_status";--> statement-breakpoint
CREATE TYPE "public"."ledger_member_status" AS ENUM('INVITED', 'ACTIVE', 'DECLINED', 'CANCELLED', 'LEFT');--> statement-breakpoint
ALTER TABLE "ledger_members" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"public"."ledger_member_status";--> statement-breakpoint
ALTER TABLE "ledger_members" ALTER COLUMN "status" SET DATA TYPE "public"."ledger_member_status" USING "status"::"public"."ledger_member_status";--> statement-breakpoint
ALTER TABLE "ledger_members" ADD COLUMN "invited_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_members" ADD COLUMN "invited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ledger_members" ADD COLUMN "joined_at" timestamp with time zone;--> statement-breakpoint
UPDATE "ledger_members"
SET "joined_at" = "created_at"
WHERE "status" IN ('ACTIVE', 'LEFT');--> statement-breakpoint
ALTER TABLE "ledger_members" ADD CONSTRAINT "ledger_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_profiles" DROP COLUMN "group_type";--> statement-breakpoint
ALTER TABLE "ledger_members" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "group_profiles" ADD CONSTRAINT "group_profiles_name_length_check" CHECK (char_length(btrim("group_profiles"."name")) BETWEEN 1 AND 100);--> statement-breakpoint
ALTER TABLE "ledger_members" ADD CONSTRAINT "ledger_members_lifecycle_shape_check" CHECK (("ledger_members"."status" IN ('INVITED', 'DECLINED', 'CANCELLED')
          AND "ledger_members"."invited_by_user_id" IS NOT NULL
          AND "ledger_members"."invited_at" IS NOT NULL)
        OR ("ledger_members"."status" IN ('ACTIVE', 'LEFT')
          AND "ledger_members"."joined_at" IS NOT NULL));--> statement-breakpoint
DROP TYPE "public"."ledger_member_role";--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_ledger_shape(target_ledger_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  ledger_record ledgers%ROWTYPE;
  member_count integer;
  active_member_count integer;
  invalid_member_count integer;
  profile_count integer;
BEGIN
  SELECT * INTO ledger_record FROM ledgers WHERE id = target_ledger_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'ACTIVE')
  INTO member_count, active_member_count
  FROM ledger_members
  WHERE ledger_id = target_ledger_id;

  SELECT count(*) INTO profile_count
  FROM group_profiles
  WHERE ledger_id = target_ledger_id;

  IF ledger_record.type = 'DIRECT' THEN
    SELECT count(*) INTO invalid_member_count
    FROM ledger_members
    WHERE ledger_id = target_ledger_id
      AND (
        user_id NOT IN (
          ledger_record.direct_low_user_id,
          ledger_record.direct_high_user_id
        )
        OR status <> 'ACTIVE'
      );

    IF member_count <> 2 OR invalid_member_count <> 0 THEN
      RAISE EXCEPTION
        'DIRECT ledger % must contain exactly its two active canonical parties',
        target_ledger_id
        USING ERRCODE = '23514';
    END IF;

    IF profile_count <> 0 THEN
      RAISE EXCEPTION 'DIRECT ledger % cannot have a group profile', target_ledger_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF ledger_record.type = 'GROUP' THEN
    IF profile_count <> 1 THEN
      RAISE EXCEPTION 'GROUP ledger % must have exactly one group profile', target_ledger_id
        USING ERRCODE = '23514';
    END IF;

    IF ledger_record.status = 'ACTIVE' AND active_member_count = 0 THEN
      RAISE EXCEPTION 'ACTIVE group ledger % must have an active member', target_ledger_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;
