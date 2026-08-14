import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CodeEditorPage } from './pages/CodeEditorPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoomPage } from './pages/RoomPage';
import { RoomsPage } from './pages/RoomsPage';
import { WhiteboardPage } from './pages/WhiteboardPage';
import { WorkspacePage } from './pages/WorkspacePage';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<HomePage />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="rooms/:roomId" element={<RoomPage />} />
                <Route path="w/:workspaceId" element={<WorkspacePage />} />
              </Route>
              <Route path="doc/:documentId" element={<CodeEditorPage />} />
              <Route path="board/:documentId" element={<WhiteboardPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
