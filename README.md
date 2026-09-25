# SquadZone

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
App de comunicação ao estilo Discord, com o tema roxo do SquadZone.

## Funcionalidades

- Registo e login (JWT)
- Amigos: adicionar pelo username (único, sem distinguir maiúsculas), pedidos pendentes, aceitar/recusar, estado online em tempo real
- Servidores: criar, entrar com código de convite, sair, apagar (dono)
- Cargos: nome, cor e opção Admin (só o dono gere cargos de admin)
- Categorias: visíveis para todos ou só para cargos escolhidos (o dono e os admins veem sempre tudo)
- Canais de texto com mensagens em tempo real e lista de membros
- Canais de voz com microfone, mute, deafen e partilha de ecrã (WebRTC peer-to-peer)
- Gestão de membros: dar/tirar cargos e expulsar

## Estrutura

<<<<<<< HEAD
=======
=======
## Estrutura

>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
```
SquadZone/
├── backend/
│   ├── src/
│   │   ├── middleware/auth.ts
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
│   │   ├── realtime/socket.ts
│   │   ├── routes/ (auth, friends, servers, channels)
│   │   ├── services/permissions.ts
│   │   ├── utils/http.ts
<<<<<<< HEAD
=======
=======
│   │   ├── routes/auth.ts
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
│   │   ├── config.ts
│   │   ├── db.ts
│   │   └── index.ts
│   ├── database.sql
│   └── .env.example
└── frontend/
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
    ├── public/
    └── src/
        ├── api/
        ├── components/ (app, auth, chat, layout, routes, server, ui, voice)
        ├── context/ (Auth, Socket, Voice)
        ├── hooks/
        ├── pages/ (Login, Signup, Friends, Server)
        ├── styles/
        ├── types/
        ├── utils/
<<<<<<< HEAD
=======
=======
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
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
        ├── App.tsx
        └── main.tsx
```

## Como correr

<<<<<<< HEAD
1. Criar a base de dados no PostgreSQL (por exemplo no pgAdmin):
=======
<<<<<<< HEAD
1. Criar a base de dados no PostgreSQL (por exemplo no pgAdmin):
=======
1. Criar a base de dados no PostgreSQL:
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f

```
CREATE DATABASE squadzone;
```

<<<<<<< HEAD
As tabelas são criadas automaticamente quando o backend arranca.

=======
<<<<<<< HEAD
As tabelas são criadas automaticamente quando o backend arranca.

=======
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
2. Backend:

```
cd backend
<<<<<<< HEAD
copy .env.example .env
=======
<<<<<<< HEAD
copy .env.example .env
=======
cp .env.example .env
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
npm install
npm run dev
```

<<<<<<< HEAD
No `.env`, mete a password do teu utilizador `postgres` no `DATABASE_URL` e muda o `JWT_SECRET`.
=======
<<<<<<< HEAD
No `.env`, mete a password do teu utilizador `postgres` no `DATABASE_URL` e muda o `JWT_SECRET`.
=======
Mudar `YOUR_PASSWORD` e `JWT_SECRET` no `.env`. A tabela `users` é criada automaticamente ao arrancar.
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f

3. Frontend (noutro terminal):

```
cd frontend
npm install
npm run dev
```

<<<<<<< HEAD
Abre http://localhost:5173.

Para testar amigos e voz com duas contas, usa dois browsers diferentes ou uma janela normal e outra anónima.
=======
<<<<<<< HEAD
Abre http://localhost:5173.

Para testar amigos e voz com duas contas, usa dois browsers diferentes ou uma janela normal e outra anónima.
=======
Abrir http://localhost:5173
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f

## API

| Método | Rota | Descrição |
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
|---|---|---|
| POST | /api/auth/register | Criar conta |
| POST | /api/auth/login | Entrar |
| GET | /api/auth/me | Utilizador atual |
| GET | /api/friends | Amigos e pedidos |
| POST | /api/friends | Enviar pedido `{ username }` |
| POST | /api/friends/:userId/accept | Aceitar pedido |
| DELETE | /api/friends/:userId | Remover / recusar / cancelar |
| GET | /api/servers | Os meus servidores |
| POST | /api/servers | Criar servidor `{ name }` |
| POST | /api/servers/join | Entrar `{ inviteCode }` |
| GET | /api/servers/:id | Detalhes (só canais visíveis) |
| PATCH / DELETE | /api/servers/:id | Renomear / apagar |
| POST | /api/servers/:id/invite | Novo código de convite |
| POST | /api/servers/:id/leave | Sair |
| DELETE | /api/servers/:id/members/:userId | Expulsar |
| PUT | /api/servers/:id/members/:userId/roles | Definir cargos `{ roleIds }` |
| POST / PATCH / DELETE | /api/servers/:id/roles[/:roleId] | Cargos |
| POST / PATCH / DELETE | /api/servers/:id/categories[/:categoryId] | Categorias `{ name, isPrivate, roleIds }` |
| POST / PATCH / DELETE | /api/servers/:id/channels[/:channelId] | Canais `{ name, type, categoryId }` |
| GET / POST | /api/channels/:id/messages | Mensagens |

O tempo real (presença, mensagens, estado da voz e sinalização WebRTC) usa Socket.IO.

## Notas

- A voz é peer-to-peer. Funciona bem em localhost e na mesma rede. Entre redes diferentes pela internet pode ser preciso um servidor TURN.
- Mensagens privadas (DMs) ainda não estão feitas.
<<<<<<< HEAD
=======
=======
| --- | --- | --- |
| GET | /api/health | Estado do servidor |
| POST | /api/auth/register | Criar conta (email, username, password) |
| POST | /api/auth/login | Login (email, password) |
| GET | /api/auth/me | Utilizador atual (Bearer token) |
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
>>>>>>> 884ce0ebbacabe8dd580de6863d4ac9f30d9ed1f
