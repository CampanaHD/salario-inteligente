-- Execute uma vez: tipo do veículo (carro, moto ou outro).
alter table public.vehicles add column if not exists vehicle_type text not null default 'carro' check (vehicle_type in ('carro','moto','outro'));
