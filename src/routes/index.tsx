import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Sidebar } from "../components/layout/Sidebar";
import { ChatArea } from "../components/chat/ChatArea";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage(): JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();

  const handleNewChat = (): void => {
    setCurrentConversationId(undefined);
  };

  return (
    <div className="flex h-full">
      <Sidebar
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={(id) => setCurrentConversationId(id)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1">
        <ChatArea
          conversationId={currentConversationId}
          onNewConversation={(id) => setCurrentConversationId(id)}
        />
      </main>
    </div>
  );
}
