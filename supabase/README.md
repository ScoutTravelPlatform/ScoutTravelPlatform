# Scout database

Migrations in this directory are the source of truth for new environments.

The baseline was reconstructed from the application because the original remote
schema was not versioned. Do not apply it blindly to the existing Supabase
project: first compare it with the live schema using the Supabase CLI database
diff workflow. The next migration will introduce organizations, memberships,
ownership columns, and row-level security.
