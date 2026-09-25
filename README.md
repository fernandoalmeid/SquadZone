# SquadZone

## Estrutura

```
SquadZone/
├── backend/
│   ├── src/
│   │   ├── middleware/auth.ts
│   │   ├── routes/auth.ts
│   │   ├── config.ts
│   │   ├── db.ts
│   │   └── index.ts
│   ├── database.sql
│   └── .env.example
└── frontend/
    ├── public/favicon.svg
    └── src/
        ├── api/
        ├── components/
        │   ├── auth/
        │   ├── layout/
        │   └── routes/
        ├── context/
        ├── hooks/
        ├── pages/
        ├── styles/
        ├── types/
        ├── App.tsx
        └── main.tsx
```

## Como correr

1. Criar a base de dados no PostgreSQL:

```
CREATE DATABASE squadzone;
```

2. Backend:

```
cd backend
cp .env.example .env
npm install
npm run dev
```

Mudar `YOUR_PASSWORD` e `JWT_SECRET` no `.env`. A tabela `users` é criada automaticamente ao arrancar.

3. Frontend (noutro terminal):

```
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | /api/health | Estado do servidor |
| POST | /api/auth/register | Criar conta (email, username, password) |
| POST | /api/auth/login | Login (email, password) |
| GET | /api/auth/me | Utilizador atual (Bearer token) |
