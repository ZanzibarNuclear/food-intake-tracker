-- Postgres schema for v1.
-- Apply via scripts/setup-db.mjs
--
-- v1: single-user (no user_id). Multi-user: add user_id to personal tables later.

create table if not exists settings (
  id integer primary key default 1,
  daily_calorie_target numeric(8, 2) not null default 2000,
  protein_target_grams numeric(8, 2) not null default 100,
  nutrition_score_target numeric(4, 1) not null default 7,
  goal_weight numeric(6, 2) not null default 170,
  timezone text,
  constraint single_settings_row check (id = 1)
);

create table if not exists foods (
  id bigserial primary key,
  name text not null unique,
  serving_description text not null,
  calories numeric(8, 2) not null,
  protein_grams numeric(8, 2) not null,
  nutrition_score numeric(4, 1) not null,
  satiety_score numeric(4, 1),
  notes text,
  is_system_seed boolean not null default false,
  source text check (source in ('workbook', 'usda', 'user', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists foods_name_idx on foods (name);
create index if not exists foods_system_seed_idx on foods (is_system_seed) where is_system_seed = true;

create table if not exists meal_entries (
  id bigserial primary key,
  entry_date date not null,
  meal text not null,
  food_id bigint not null references foods(id),
  quantity numeric(8, 2) not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_entries_entry_date_idx on meal_entries(entry_date);
create index if not exists meal_entries_food_id_idx on meal_entries(food_id);

create table if not exists weight_entries (
  id bigserial primary key,
  entry_date date not null unique,
  weight numeric(6, 2) not null,
  goal_weight numeric(6, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weight_entries_entry_date_idx on weight_entries(entry_date);

create table if not exists food_favorites (
  food_id bigint primary key references foods(id) on delete cascade,
  sort_order smallint not null default 0
);

create table if not exists food_recent (
  food_id bigint primary key references foods(id) on delete cascade,
  last_used_at timestamptz not null default now(),
  use_count integer not null default 1
);
