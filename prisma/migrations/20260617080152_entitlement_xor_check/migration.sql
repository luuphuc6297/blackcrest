-- Entitlement targets EXACTLY ONE of reportId / categoryId (blueprint §4).
-- Prisma cannot express this; enforce it at the database level.
ALTER TABLE "Entitlement"
  ADD CONSTRAINT "Entitlement_report_xor_category"
  CHECK (("reportId" IS NOT NULL) <> ("categoryId" IS NOT NULL));