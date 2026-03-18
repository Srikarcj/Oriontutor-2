create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text not null,
  plan text not null default 'free' check (plan in ('free','pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  current_level text,
  learning_streak int default 0,
  last_active_date date,
  quizzes_passed int default 0,
  courses_completed int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists clerk_user_id text;
alter table public.users add column if not exists username text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists current_level text;
alter table public.users add column if not exists learning_streak int;
alter table public.users add column if not exists last_active_date date;
alter table public.users add column if not exists quizzes_passed int;
alter table public.users add column if not exists courses_completed int;
alter table public.users add column if not exists role text default 'user';
create unique index if not exists users_clerk_user_id_key on public.users (clerk_user_id);
create unique index if not exists users_username_key on public.users (username);

create table if not exists public.videos (
  id text primary key,
  user_id text not null,
  youtube_url text not null,
  title text not null,
  thumbnail text,
  source_video_id text not null,
  created_at timestamptz not null default now(),
  constraint videos_user_fk foreign key (user_id) references public.users(clerk_user_id) on delete cascade
);

create table if not exists public.video_content (
  id uuid primary key default gen_random_uuid(),
  video_id text unique not null,
  transcript text,
  summary text,
  notes jsonb,
  chapters jsonb,
  quiz jsonb,
  pdf_url text,
  created_at timestamptz not null default now(),
  constraint video_content_video_fk foreign key (video_id) references public.videos(id) on delete cascade
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  video_id text unique not null,
  summary text,
  structured_notes jsonb,
  transcript text,
  topics jsonb,
  updated_at timestamptz not null default now(),
  constraint notes_video_fk foreign key (video_id) references public.videos(id) on delete cascade
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  question text not null,
  answer text not null,
  category text,
  difficulty text,
  bullets jsonb,
  position int default 0,
  learned boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flashcards_video_fk foreign key (video_id) references public.videos(id) on delete cascade
);

alter table public.flashcards add column if not exists category text;
alter table public.flashcards add column if not exists difficulty text;
alter table public.flashcards add column if not exists bullets jsonb;
alter table public.flashcards add column if not exists created_at timestamptz;

create table if not exists public.mindmap (
  id uuid primary key default gen_random_uuid(),
  video_id text unique not null,
  mindmap_json jsonb,
  updated_at timestamptz not null default now(),
  constraint mindmap_video_fk foreign key (video_id) references public.videos(id) on delete cascade
);

create table if not exists public.visual_insights (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  timestamp text,
  seconds numeric,
  visual_type text,
  title text,
  image_url text,
  extracted_text text,
  ai_explanation text,
  bullets jsonb,
  tags jsonb,
  key_moment boolean default false,
  created_at timestamptz not null default now(),
  constraint visual_insights_video_fk foreign key (video_id) references public.videos(id) on delete cascade
);

create index if not exists idx_visual_insights_video_id on public.visual_insights(video_id);

create table if not exists public.library (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  video_id text not null,
  saved_at timestamptz not null default now(),
  constraint library_user_fk foreign key (user_id) references public.users(clerk_user_id) on delete cascade,
  constraint library_video_fk foreign key (video_id) references public.videos(id) on delete cascade,
  constraint library_unique unique (user_id, video_id)
);

create index if not exists idx_videos_user_id_created_at on public.videos(user_id, created_at desc);
create index if not exists idx_library_user_id_saved_at on public.library(user_id, saved_at desc);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  instructor text not null,
  rating numeric default 0,
  students int default 0,
  category text,
  level text,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_stages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position int default 0
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  stage_id uuid references public.course_stages(id) on delete set null,
  day_number int not null,
  title text not null,
  duration text,
  keywords jsonb,
  summary text,
  content text,
  created_at timestamptz not null default now()
);
alter table public.course_lessons add column if not exists level text;

create table if not exists public.course_content (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  level text not null check (level in ('Beginner','Intermediate','Advanced')),
  title text not null,
  summary text,
  content text,
  created_at timestamptz not null default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  level text,
  progress numeric default 0,
  status text not null default 'active',
  current_lesson_id uuid references public.course_lessons(id) on delete set null,
  last_accessed_at timestamptz,
  completed_at timestamptz
);
create unique index if not exists course_enrollments_unique on public.course_enrollments (user_id, course_id);

create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  material_type text not null,
  title text not null,
  description text,
  size text,
  url text,
  storage_path text,
  download_count int default 0,
  created_at timestamptz not null default now()
);
alter table public.course_materials add column if not exists level text;

create table if not exists public.lesson_quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  question_type text not null,
  prompt text not null,
  options jsonb,
  answer text,
  explanation text,
  difficulty text,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  notes jsonb,
  summary text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id)
);

create table if not exists public.lesson_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  score numeric not null,
  total int not null,
  passed boolean default false,
  answers jsonb,
  completed_at timestamptz not null default now()
);

create table if not exists public.course_quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.course_lessons(id) on delete set null,
  quiz_type text not null check (quiz_type in ('pre','mini','final')),
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.course_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.course_quizzes(id) on delete cascade,
  prompt text not null,
  options jsonb,
  answer text,
  explanation text,
  position int default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.course_quiz_results (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.course_quizzes(id) on delete cascade,
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  score numeric not null,
  total int not null,
  passed boolean default false,
  level_assigned text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  status text not null default 'in_progress',
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (lesson_id, user_id)
);

create table if not exists public.diagnostic_results (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.course_enrollments(id) on delete cascade,
  score numeric not null,
  level text not null,
  completed_at timestamptz not null default now()
);

create table if not exists public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.course_enrollments(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  score numeric not null,
  clarity numeric,
  keyword_match numeric,
  confidence numeric,
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  badge_name text not null,
  description text,
  awarded_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_url text,
  issued_at timestamptz not null default now()
);

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  points int default 0,
  quiz_score_avg numeric default 0,
  courses_completed int default 0,
  learning_streak int default 0,
  progress numeric default 0,
  updated_at timestamptz not null default now()
);
alter table public.leaderboard add column if not exists quiz_score_avg numeric;
alter table public.leaderboard add column if not exists courses_completed int;
alter table public.leaderboard add column if not exists learning_streak int;
alter table public.leaderboard add column if not exists progress numeric;

create table if not exists public.learning_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  reminder_text text not null,
  scheduled_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  course_slug text not null,
  passed_days jsonb default '[]'::jsonb,
  scores jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, course_slug)
);
alter table public.course_progress add column if not exists modules_enabled boolean default false;

create table if not exists public.user_library_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  item_type text not null,
  title text not null,
  ref_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pdf_embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.pdf_documents(id) on delete cascade,
  chunk_id uuid references public.pdf_chunks(id) on delete cascade,
  embedding jsonb,
  created_at timestamptz not null default now()
);
alter table public.pdf_embeddings add column if not exists chunk_text text;
alter table public.pdf_embeddings add column if not exists chunk_index int;
alter table public.pdf_embeddings add column if not exists source_type text;
alter table public.pdf_embeddings add column if not exists file_name text;
alter table public.pdf_embeddings add column if not exists course_slug text;
alter table public.pdf_embeddings add column if not exists page_number int;
alter table public.pdf_embeddings add column if not exists section_title text;
alter table public.pdf_embeddings add column if not exists uploaded_at bigint;
alter table public.pdf_embeddings add column if not exists user_id text;

-- Enable RLS
alter table public.users enable row level security;
alter table public.videos enable row level security;
alter table public.video_content enable row level security;
alter table public.notes enable row level security;
alter table public.flashcards enable row level security;
alter table public.mindmap enable row level security;
alter table public.visual_insights enable row level security;
alter table public.library enable row level security;
alter table public.courses enable row level security;
alter table public.course_stages enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_materials enable row level security;
alter table public.course_content enable row level security;
alter table public.lesson_quizzes enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.lesson_quiz_attempts enable row level security;
alter table public.diagnostic_results enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.badges enable row level security;
alter table public.certificates enable row level security;
alter table public.leaderboard enable row level security;
alter table public.learning_reminders enable row level security;
alter table public.course_progress enable row level security;
alter table public.course_activity enable row level security;
alter table public.pdf_documents enable row level security;
alter table public.pdf_chunks enable row level security;
alter table public.user_library_items enable row level security;
alter table public.course_quizzes enable row level security;
alter table public.course_quiz_questions enable row level security;
alter table public.course_quiz_results enable row level security;
alter table public.pdf_embeddings enable row level security;

-- Policies
do $$
begin
  -- Public readable catalog tables
  if not exists (select 1 from pg_policies where policyname = 'read_courses') then
    create policy "read_courses" on public.courses for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'read_course_stages') then
    create policy "read_course_stages" on public.course_stages for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'read_course_lessons') then
    create policy "read_course_lessons" on public.course_lessons for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'read_course_materials') then
    create policy "read_course_materials" on public.course_materials for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'read_course_content') then
    create policy "read_course_content" on public.course_content for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'read_leaderboard') then
    create policy "read_leaderboard" on public.leaderboard for select to anon, authenticated using (true);
  end if;

  -- User-owned tables (service role or matching user)
  if not exists (select 1 from pg_policies where policyname = 'users_self') then
    create policy "users_self" on public.users for select
    using (auth.role() = 'service_role' or auth.uid()::text = clerk_user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'videos_owner') then
    create policy "videos_owner" on public.videos for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'library_owner') then
    create policy "library_owner" on public.library for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'course_enrollments_owner') then
    create policy "course_enrollments_owner" on public.course_enrollments for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'course_progress_owner') then
    create policy "course_progress_owner" on public.course_progress for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'course_activity_owner') then
    create policy "course_activity_owner" on public.course_activity for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'course_quizzes_read') then
    create policy "course_quizzes_read" on public.course_quizzes for select
    using (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'course_quiz_questions_read') then
    create policy "course_quiz_questions_read" on public.course_quiz_questions for select
    using (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'course_quiz_results_owner') then
    create policy "course_quiz_results_owner" on public.course_quiz_results for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'lesson_quiz_attempts_owner') then
    create policy "lesson_quiz_attempts_owner" on public.lesson_quiz_attempts for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'pdf_documents_owner') then
    create policy "pdf_documents_owner" on public.pdf_documents for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'pdf_chunks_owner') then
    create policy "pdf_chunks_owner" on public.pdf_chunks for select
    using (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where policyname = 'pdf_embeddings_owner') then
    create policy "pdf_embeddings_owner" on public.pdf_embeddings for select
    using (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where policyname = 'user_library_owner') then
    create policy "user_library_owner" on public.user_library_items for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;
end $$;

-- Storage buckets for study materials and lesson notes
insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('lesson-notes', 'lesson-notes', false)
on conflict (id) do nothing;

-- Storage policies (authenticated read access)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'read_study_materials'
  ) then
    create policy "read_study_materials"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'study-materials');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'read_lesson_notes'
  ) then
    create policy "read_lesson_notes"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'lesson-notes');
  end if;
end $$;

create table if not exists public.course_activity (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  course_slug text not null,
  day_number int not null,
  seconds_spent int default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pdf_documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  name text not null,
  text text,
  created_at timestamptz not null default now()
);
alter table public.pdf_documents add column if not exists course_slug text;
alter table public.pdf_documents add column if not exists file_hash text;
alter table public.pdf_documents add column if not exists indexed_at timestamptz;
create unique index if not exists pdf_documents_unique_hash
on public.pdf_documents (user_id, course_slug, file_hash);

create table if not exists public.pdf_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.pdf_documents(id) on delete cascade,
  chunk text,
  tokens jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Adaptive Learning System (Replace Learning Tables)
-- ------------------------------------------------------------
drop table if exists public.quiz_results cascade;
drop table if exists public.quiz_attempts cascade;
drop table if exists public.quizzes cascade;
drop table if exists public.exams cascade;
drop table if exists public.exam_results cascade;
drop table if exists public.course_content cascade;
drop table if exists public.course_materials cascade;
drop table if exists public.course_enrollments cascade;
drop table if exists public.modules cascade;
drop table if exists public.enrollments cascade;
drop table if exists public.courses cascade;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  category text,
  difficulty text,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_number int not null,
  title text not null,
  concept text not null,
  explanation text,
  level_type text not null check (level_type in ('beginner','intermediate','advanced')),
  created_at timestamptz not null default now()
);

alter table public.modules add column if not exists introduction text;
alter table public.modules add column if not exists examples text;
alter table public.modules add column if not exists practice_questions jsonb;
alter table public.modules add column if not exists practice_answers jsonb;
alter table public.modules add column if not exists summary text;
alter table public.modules add column if not exists advanced_content text;
alter table public.modules add column if not exists learning_objectives text;
alter table public.modules add column if not exists estimated_time int;

create table if not exists public.module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  status text not null default 'in_progress',
  completed_at timestamptz default now(),
  unique (user_id, module_id)
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  explanation text,
  created_at timestamptz not null default now()
);

create unique index if not exists quizzes_unique_course_question
on public.quizzes (course_id, question);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  skill_level text not null,
  quiz_score numeric not null,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  score numeric not null,
  attempt_count int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(clerk_user_id) on delete cascade,
  item_type text not null,
  title text not null,
  ref_id text,
  metadata jsonb,
  bookmarked boolean default false,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.quizzes enable row level security;
alter table public.enrollments enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.module_progress enable row level security;
alter table public.library_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'read_courses_adaptive') then
    create policy "read_courses_adaptive" on public.courses for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'read_modules_adaptive') then
    create policy "read_modules_adaptive" on public.modules for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'read_quizzes_adaptive') then
    create policy "read_quizzes_adaptive" on public.quizzes for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'enrollments_owner_adaptive') then
    create policy "enrollments_owner_adaptive" on public.enrollments for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'quiz_attempts_owner_adaptive') then
    create policy "quiz_attempts_owner_adaptive" on public.quiz_attempts for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'module_progress_owner_adaptive') then
    create policy "module_progress_owner_adaptive" on public.module_progress for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'library_items_owner_adaptive') then
    create policy "library_items_owner_adaptive" on public.library_items for select
    using (auth.role() = 'service_role' or auth.uid()::text = user_id);
  end if;
end $$;
