<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the Duet experience as one state-driven index route with its three views and shared state; this preserves in-session selections while switching tabs.
- Capture partner push events with database triggers and atomically claim a durable queue; authenticated foreground heartbeats plus a managed fallback schedule prevent missed additions and cross-tab duplicate sends.
- Keep notification preferences per recipient and presence cooldowns server-enforced; client state must never authorize recipients or reset deduplication.
- Persist each user's color theme in device-local storage, keyed by user ID, and apply semantic CSS overrides to the document. Theme selection must not require Supabase profile migrations or writes; shared records never determine the partner's appearance.
