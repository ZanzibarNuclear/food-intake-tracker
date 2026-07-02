-- App schema for production-ready multi-user tracking.
-- Better Auth owns its own auth tables via `npm run auth:migrate`.
-- Apply this file with `npm run db:migrate`.

create table if not exists settings (
  id bigserial primary key,
  user_id text not null unique,
  daily_calorie_target numeric(8, 2) not null default 2000,
  protein_target_grams numeric(8, 2) not null default 100,
  nutrition_score_target numeric(4, 1) not null default 7,
  goal_weight numeric(6, 2) not null default 170,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table settings drop constraint if exists single_settings_row;
alter table settings add column if not exists user_id text;
alter table settings add column if not exists created_at timestamptz not null default now();
alter table settings add column if not exists updated_at timestamptz not null default now();
create sequence if not exists settings_id_seq;
select setval('settings_id_seq', (select coalesce(max(id), 0) + 1 from settings), false);
alter table settings alter column id set default nextval('settings_id_seq');
create unique index if not exists settings_user_id_unique_idx on settings (user_id) where user_id is not null;

create table if not exists foods (
  id bigserial primary key,
  user_id text,
  name text not null,
  serving_description text not null,
  calories numeric(8, 2) not null,
  protein_grams numeric(8, 2) not null,
  nutrition_score numeric(4, 1) not null,
  satiety_score numeric(4, 1),
  notes text,
  is_system_seed boolean not null default false,
  source text check (source in ('workbook', 'usda', 'user', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_food_has_no_user check (
    (is_system_seed and user_id is null) or
    (not is_system_seed and user_id is not null)
  )
);

alter table foods drop constraint if exists foods_name_key;
alter table foods add column if not exists user_id text;
alter table foods add column if not exists is_system_seed boolean not null default false;
alter table foods add column if not exists source text;

create index if not exists foods_name_idx on foods (name);
create index if not exists foods_user_id_idx on foods (user_id) where user_id is not null;
create index if not exists foods_system_seed_idx on foods (is_system_seed) where is_system_seed = true;
create unique index if not exists foods_system_name_unique_idx on foods (lower(name)) where is_system_seed = true;
create unique index if not exists foods_user_name_unique_idx on foods (user_id, lower(name)) where is_system_seed = false;

create table if not exists meal_entries (
  id bigserial primary key,
  user_id text not null,
  entry_date date not null,
  meal text not null,
  food_id bigint not null references foods(id),
  quantity numeric(8, 2) not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table meal_entries add column if not exists user_id text;
create index if not exists meal_entries_user_date_idx on meal_entries(user_id, entry_date);
create index if not exists meal_entries_food_id_idx on meal_entries(food_id);

create table if not exists weight_entries (
  id bigserial primary key,
  user_id text not null,
  entry_date date not null,
  weight numeric(6, 2) not null,
  goal_weight numeric(6, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table weight_entries drop constraint if exists weight_entries_entry_date_key;
alter table weight_entries add column if not exists user_id text;
create index if not exists weight_entries_user_date_idx on weight_entries(user_id, entry_date);
create unique index if not exists weight_entries_user_date_unique_idx on weight_entries (user_id, entry_date) where user_id is not null;

create table if not exists food_favorites (
  user_id text not null,
  food_id bigint not null references foods(id) on delete cascade,
  sort_order smallint not null default 0,
  primary key (user_id, food_id)
);

alter table food_favorites drop constraint if exists food_favorites_pkey;
alter table food_favorites add column if not exists user_id text;
create unique index if not exists food_favorites_user_food_unique_idx on food_favorites (user_id, food_id);

create table if not exists food_recent (
  user_id text not null,
  food_id bigint not null references foods(id) on delete cascade,
  last_used_at timestamptz not null default now(),
  use_count integer not null default 1,
  primary key (user_id, food_id)
);

alter table food_recent drop constraint if exists food_recent_pkey;
alter table food_recent add column if not exists user_id text;
create unique index if not exists food_recent_user_food_unique_idx on food_recent (user_id, food_id);
