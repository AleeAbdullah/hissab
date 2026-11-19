ALTER TABLE "users" DROP CONSTRAINT "users_locale_check";--> statement-breakpoint
UPDATE "users" SET "locale" = 'en' WHERE "locale" = 'en-PK';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_locale_check" CHECK ("users"."locale" IN ('en', 'ur-Latn-PK', 'ur-PK', 'ar', 'es', 'fr', 'hi', 'zh-Hans'));
