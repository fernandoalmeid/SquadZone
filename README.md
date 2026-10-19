# SquadZone

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

```
SquadZone/
├── backend/
│   ├── src/
│   │   ├── middleware/auth.ts
│   │   ├── realtime/socket.ts
│   │   ├── routes/ (auth, friends, servers, channels)
│   │   ├── services/permissions.ts
│   │   ├── utils/http.ts
│   │   ├── config.ts
│   │   ├── db.ts
│   │   └── index.ts
│   ├── database.sql
│   └── .env.example
└── frontend/
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
        ├── App.tsx
        └── main.tsx
```

## Como correr

1. Criar a base de dados no PostgreSQL (por exemplo no pgAdmin):

```
CREATE DATABASE squadzone;
```

As tabelas são criadas automaticamente quando o backend arranca.

2. Backend:

```
cd backend
copy .env.example .env
npm install
npm run dev
```

No `.env`, mete a password do teu utilizador `postgres` no `DATABASE_URL` e muda o `JWT_SECRET`.

3. Frontend (noutro terminal):

```
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173.

Para testar amigos e voz com duas contas, usa dois browsers diferentes ou uma janela normal e outra anónima.

## API

| Método | Rota | Descrição |
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
