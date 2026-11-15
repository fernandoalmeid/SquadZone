# SquadZone

**Discord-style communication app** built with TypeScript.

Create servers, chat in real time, manage roles and categories, and join voice channels with screen sharing — all with a purple SquadZone theme.

Perfect for learning full-stack development: authentication, WebSockets, permissions, and WebRTC.

---

## Features

- Register and login (JWT)
- Friends system: add by username, pending requests, accept/refuse, real-time online status
- Servers: create, join with invite code, leave, delete (owner)
- Roles: name, color and Admin option (only owner manages admin roles)
- Categories: visible to everyone or only to selected roles (owner and admins always see everything)
- Text channels with real-time messages and member list
- Voice channels with mic, mute, deafen and screen sharing (WebRTC peer-to-peer)
- Member management: assign/remove roles and kick

## Structure

```
SquadZone/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   ├── realtime/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── config.ts
│   │   ├── db.ts
│   │   └── index.ts
│   ├── database.sql
│   └── .env.example
└── frontend/
    ├── public/
    └── src/
        ├── api/
        ├── components/
        ├── context/
        ├── hooks/
        ├── pages/
        ├── styles/
        ├── types/
        ├── App.tsx
        └── main.tsx
```

## How to run

1. Create the database in PostgreSQL:

```sql
CREATE DATABASE squadzone;
```

Tables are created automatically when the backend starts.

2. Backend:

```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET
npm install
npm run dev
```

3. Frontend (another terminal):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

To test friends and voice with two accounts, use two different browsers or one normal + one private window.

## API (main routes)

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET/POST | /api/friends | List / send friend request |
| POST | /api/friends/:userId/accept | Accept request |
| DELETE | /api/friends/:userId | Remove / refuse |
| GET/POST | /api/servers | List / create server |
| POST | /api/servers/join | Join with invite code |
| ... | ... | Channels, roles, messages |

Real-time (presence, messages, voice signaling) uses Socket.IO.

## Notes

- Voice is peer-to-peer. Works well on localhost and same network. Across different networks a TURN server may be needed.
- Direct messages (DMs) are not implemented yet.

## License

MIT
