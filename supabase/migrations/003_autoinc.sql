-- Add auto-increment sequences and defaults for contractors and vehicles ids
create sequence if not exists contractors_id_seq;
alter table public.contractors alter column id set default nextval('contractors_id_seq');
select setval('contractors_id_seq', coalesce((select max(id) from public.contractors), 1));

create sequence if not exists vehicles_id_seq;
alter table public.vehicles alter column id set default nextval('vehicles_id_seq');
select setval('vehicles_id_seq', coalesce((select max(id) from public.vehicles), 1));
