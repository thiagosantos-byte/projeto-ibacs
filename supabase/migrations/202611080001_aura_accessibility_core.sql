-- AURA · Estrutura inicial para preferências, atividade e comunicação alternativa.
-- Execute no Supabase SQL Editor ou aplique via Supabase CLI.

create table if not exists public.accessibility_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint accessibility_preferences_object check (jsonb_typeof(preferences) = 'object')
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_title text not null check (char_length(event_title) between 1 and 180),
  module text not null check (char_length(module) between 1 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.aac_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phrase text not null check (char_length(phrase) between 1 and 280),
  symbol text not null default '💬' check (char_length(symbol) <= 16),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_created_idx
  on public.activity_logs (user_id, created_at desc);
create index if not exists aac_phrases_user_created_idx
  on public.aac_phrases (user_id, created_at desc);
create index if not exists ai_chat_messages_user_created_idx
  on public.ai_chat_messages (user_id, created_at desc);

-- Em projetos novos/atualizados, o acesso à Data API requer GRANT explícito.
-- RLS continua sendo a segunda camada de autorização por linha.
revoke all on table public.accessibility_preferences from anon, authenticated;
revoke all on table public.activity_logs from anon, authenticated;
revoke all on table public.aac_phrases from anon, authenticated;
revoke all on table public.ai_chat_messages from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.accessibility_preferences to authenticated;
grant select, insert on table public.activity_logs to authenticated;
grant select, insert, update, delete on table public.aac_phrases to authenticated;
grant select, insert, delete on table public.ai_chat_messages to authenticated;

alter table public.accessibility_preferences enable row level security;
alter table public.activity_logs enable row level security;
alter table public.aac_phrases enable row level security;
alter table public.ai_chat_messages enable row level security;

drop policy if exists "Users read their accessibility preferences" on public.accessibility_preferences;
create policy "Users read their accessibility preferences"
  on public.accessibility_preferences for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their accessibility preferences" on public.accessibility_preferences;
create policy "Users create their accessibility preferences"
  on public.accessibility_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their accessibility preferences" on public.accessibility_preferences;
create policy "Users update their accessibility preferences"
  on public.accessibility_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their accessibility preferences" on public.accessibility_preferences;
create policy "Users delete their accessibility preferences"
  on public.accessibility_preferences for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read their own activity" on public.activity_logs;
create policy "Users read their own activity"
  on public.activity_logs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their own activity" on public.activity_logs;
create policy "Users insert their own activity"
  on public.activity_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users read their own AAC phrases" on public.aac_phrases;
create policy "Users read their own AAC phrases"
  on public.aac_phrases for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their own AAC phrases" on public.aac_phrases;
create policy "Users insert their own AAC phrases"
  on public.aac_phrases for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own AAC phrases" on public.aac_phrases;
create policy "Users update their own AAC phrases"
  on public.aac_phrases for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own AAC phrases" on public.aac_phrases;
create policy "Users delete their own AAC phrases"
  on public.aac_phrases for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read their own AI chat history" on public.ai_chat_messages;
create policy "Users read their own AI chat history"
  on public.ai_chat_messages for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their own AI chat messages" on public.ai_chat_messages;
create policy "Users insert their own AI chat messages"
  on public.ai_chat_messages for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own AI chat history" on public.ai_chat_messages;
create policy "Users delete their own AI chat history"
  on public.ai_chat_messages for delete to authenticated
  using ((select auth.uid()) = user_id);
