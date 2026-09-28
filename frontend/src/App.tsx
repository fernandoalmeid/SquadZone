import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/app/AppLayout.tsx";
import GuestRoute from "./components/routes/GuestRoute.tsx";
import ProtectedRoute from "./components/routes/ProtectedRoute.tsx";
import Friends from "./pages/Friends.tsx";
import Login from "./pages/Login.tsx";
import Server from "./pages/Server.tsx";
import Signup from "./pages/Signup.tsx";

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/friends" element={<Friends />} />
          <Route path="/servers/:serverId/:channelId?" element={<Server />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/friends" replace />} />
    </Routes>
  );
}

export default App;
