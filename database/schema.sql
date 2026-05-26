create table ingredientes (
  id bigint generated always as identity primary key,
  nome text not null,
  quantidade numeric default 0,
  unidade text,
  estoque_minimo numeric default 0,
  created_at timestamp default now()
);

create table produtos (
  id bigint generated always as identity primary key,
  nome text not null,
  descricao text,
  preco numeric not null,
  custo numeric default 0,
  imagem text,
  created_at timestamp default now()
);

create table produto_ingredientes (
  id bigint generated always as identity primary key,
  produto_id bigint references produtos(id) on delete cascade,
  ingrediente_id bigint references ingredientes(id),
  quantidade numeric not null
);

create table pedidos (
  id bigint generated always as identity primary key,
  cliente_nome text,
  telefone text,
  total numeric,
  status text default 'novo',
  created_at timestamp default now()
);

create table pedido_itens (
  id bigint generated always as identity primary key,
  pedido_id bigint references pedidos(id) on delete cascade,
  produto_id bigint references produtos(id),
  quantidade integer,
  preco numeric
);

create table fornecedores (
  id bigint generated always as identity primary key,
  nome text,
  telefone text,
  created_at timestamp default now()
);

create table compras_fornecedor (
  id bigint generated always as identity primary key,
  fornecedor_id bigint references fornecedores(id),
  valor numeric,
  descricao text,
  created_at timestamp default now()
);