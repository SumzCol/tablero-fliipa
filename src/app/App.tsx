import { useState, useEffect, type ComponentType, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import KanbanBoardImport from "@/features/kanban/KanbanBoard";

const KanbanBoard = KanbanBoardImport as ComponentType<{
  uiVariant: ReturnType<typeof readUiMode>;
  onUiVariantChange: Dispatch<SetStateAction<ReturnType<typeof readUiMode>>>;
  authUser: User | null;
}>;
import LoginScreen from "@/features/auth/LoginScreen";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { LoadingScreen } from "@/shared/components/LoadingScreen";
import { readUiMode, writeUiMode } from "@/shared/lib/uiMode";
import { installStorage } from "@/shared/lib/storage";

function SessionGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.authRequired) {
    if (!auth.ready || auth.checkingAccess) {
      return <LoadingScreen />;
    }
    if (!auth.canUseBoard) {
      return <LoginScreen />;
    }
  }

  return children;
}

function BoardApp() {
  const [uiVariant, setUiVariant] = useState(readUiMode);
  const auth = useAuth();

  useEffect(() => {
    writeUiMode(uiVariant);
  }, [uiVariant]);

  useEffect(() => {
    if (auth.canUseBoard) installStorage();
  }, [auth.canUseBoard]);

  if (!auth.canUseBoard) return null;

  return (
    <KanbanBoard
      uiVariant={uiVariant}
      onUiVariantChange={setUiVariant}
      authUser={auth.user}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SessionGate>
        <BoardApp />
      </SessionGate>
    </AuthProvider>
  );
}
