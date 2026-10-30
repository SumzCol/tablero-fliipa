import type { User } from "firebase/auth";
import type { ComponentType } from "react";

declare const KanbanBoard: ComponentType<{
  uiVariant?: string;
  onUiVariantChange?: (variant: string) => void;
  authUser?: User | null;
}>;

export default KanbanBoard;
