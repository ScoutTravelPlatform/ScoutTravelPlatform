import type { Database, TablesInsert } from "./database.types";

/**
 * organization_id on these tables has no column default — it's populated by a
 * BEFORE INSERT trigger that derives it from the parent trip/quote. Postgres's
 * own schema introspection can't see that, so the generated Insert type marks
 * it required. Use this to type payloads that intentionally omit it.
 */
export type OrgInheritedInsert<T extends keyof Database["public"]["Tables"]> = Omit<
  TablesInsert<T>,
  "organization_id"
>;
