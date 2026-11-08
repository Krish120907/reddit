-- Run once in the Supabase SQL Editor for this project.
-- Public content is readable; authenticated users can only create or change
-- rows they own. RLS stays enabled on every table.

begin;

-- Profiles contain only public Reddit-style profile details.
create policy "Public profiles are readable"
on public.profiles for select
to anon, authenticated
using (true);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Communities are public; only the authenticated creator can add one.
create policy "Communities are readable"
on public.communities for select
to anon, authenticated
using (true);

create policy "Users can create communities as themselves"
on public.communities for insert
to authenticated
with check ((select auth.uid()) = creator_id);

-- Posts and comments are public content; authors control their own rows.
create policy "Posts are readable"
on public.posts for select
to anon, authenticated
using (true);

create policy "Users can create posts as themselves"
on public.posts for insert
to authenticated
with check ((select auth.uid()) = author_id);

create policy "Authors can update their own posts"
on public.posts for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

create policy "Authors can delete their own posts"
on public.posts for delete
to authenticated
using ((select auth.uid()) = author_id);

create policy "Comments are readable"
on public.comments for select
to anon, authenticated
using (true);

create policy "Users can create comments as themselves"
on public.comments for insert
to authenticated
with check ((select auth.uid()) = author_id);

create policy "Authors can update their own comments"
on public.comments for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

-- Users may see and manage only their own follow relationships.
create policy "Users can read their follows"
on public.follows for select
to authenticated
using ((select auth.uid()) = follower_id);

create policy "Users can follow as themselves"
on public.follows for insert
to authenticated
with check ((select auth.uid()) = follower_id);

create policy "Users can unfollow as themselves"
on public.follows for delete
to authenticated
using ((select auth.uid()) = follower_id);

-- Membership visibility is limited to the signed-in user. A creator can
-- create their own owner membership; regular joins must use the member role.
create policy "Users can read their memberships"
on public.memberships for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can join communities"
on public.memberships for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    role = 'member'
    or (
      role = 'owner'
      and exists (
        select 1
        from public.communities c
        where c.id = community_id
          and c.creator_id = (select auth.uid())
      )
    )
  )
);

create policy "Users can leave their memberships"
on public.memberships for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Votes are private to the voter; the public totals live on posts/comments.
create policy "Users can read their post votes"
on public.post_votes for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their post votes"
on public.post_votes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can change their post votes"
on public.post_votes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can remove their post votes"
on public.post_votes for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their comment votes"
on public.comment_votes for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their comment votes"
on public.comment_votes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can change their comment votes"
on public.comment_votes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can remove their comment votes"
on public.comment_votes for delete
to authenticated
using ((select auth.uid()) = user_id);

-- The app only displays reader stats from this table.
create policy "Reader stats are readable"
on public.books for select
to anon, authenticated
using (true);

commit;
