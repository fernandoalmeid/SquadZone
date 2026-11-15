<div align="center">

# SquadZone

**Discord-style communication app** built with TypeScript.

Create servers, chat in real time, manage roles, and join voice channels with screen sharing.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)

</div>

---

### Features

- Register and login (JWT)
- Friends system with real-time online status
- Servers, invite codes, roles and categories
- Text channels with real-time messages
- Voice channels with mic, mute, deafen and screen sharing (WebRTC)
- Member management (roles + kick)

### Structure

```
SquadZone/
├── backend/
│   ├── src/
│   └── .env.example
└── frontend/
    └── src/
```

### How to run

1. Create the database:
```sql
CREATE DATABASE squadzone;
```

2. Backend:
```bash
cd backend
cp .env.example .env   # set DATABASE_URL + JWT_SECRET
npm install
npm run dev
```

3. Frontend:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Notes

- Voice is peer-to-peer (works well on localhost / same network)
- Direct messages not implemented yet

---

**License:** MIT
