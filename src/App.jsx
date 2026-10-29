import { useState, useEffect } from "react";
import KanbanBoard from "./KanbanBoard";
import { readUiMode, writeUiMode } from "./uiMode";

export default function App() {
  const [uiVariant, setUiVariant] = useState(readUiMode);

  useEffect(() => {
    writeUiMode(uiVariant);
  }, [uiVariant]);

  return <KanbanBoard uiVariant={uiVariant} onUiVariantChange={setUiVariant} />;
}
