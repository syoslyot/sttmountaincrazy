# Troubleshooting

## Year Filter Only Shows ALL

Likely causes:

- `get_expedition_years()` is missing in the target Supabase DB.
- The migration was applied to dev but not prod.
- The frontend is pointed at the wrong Supabase project.

Check the DB repo migration first, then ask the DB admin to run the SQL in Supabase.

## Detail Page 404

Check:

- expedition id exists in Supabase;
- related rows are readable through the expected query;
- required server-side env vars are present;
- RLS policies or RPC grants did not change.

## Map Is Blank

Check browser console for:

- missing GPX/KML file;
- failed Storage redirect;
- MapLibre or Leaflet asset errors;
- container height collapsing on mobile.

## GitHub Actions Does Not Start

Confirm GitHub Actions status first. If GitHub is healthy, push a new commit to the PR branch or rerun the failed workflow from the Actions page.

## GitHub Actions Checkout 403

If logs show `Your account is suspended`, the runner cannot fetch the repo. This is not a code failure. Resolve the GitHub account or repository access issue, then rerun the workflow.
