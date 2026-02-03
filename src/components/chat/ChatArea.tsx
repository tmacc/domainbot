import { useState, useRef, useEffect, useCallback } from "react";
import { Globe } from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

import { cn } from "../../lib/utils";
import { useTheme } from "../../lib/theme-context";
import { useUser } from "../../lib/user-context";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import type { Message, DomainResult } from "../../types/chat";

interface ChatAreaProps {
  conversationId?: string;
  onNewConversation?: (id: string, title: string) => void;
}

export function ChatArea({ conversationId, onNewConversation }: ChatAreaProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<Id<"threads"> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { userId, isLoading: userLoading } = useUser();

  // Convex mutations and actions
  const createThread = useMutation(api.threads.create);
  const addMessage = useMutation(api.threads.addMessage);
  const saveDomain = useMutation(api.domains.save);
  const generateAIResponse = useAction(api.actions.generateAIResponse);

  // Query messages if we have a thread
  const threadMessages = useQuery(
    api.threads.getMessages,
    activeThreadId ? { threadId: activeThreadId } : "skip"
  );

  const isNewChat = !conversationId && messages.length === 0;

  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Sync conversationId prop to activeThreadId state
  useEffect(() => {
    if (conversationId) {
      // User selected a conversation from the sidebar
      setActiveThreadId(conversationId as Id<"threads">);
    } else {
      // New chat - clear state
      setActiveThreadId(null);
      setMessages([]);
    }
  }, [conversationId]);

  // Sync Convex messages to local state
  useEffect(() => {
    if (threadMessages) {
      const mapped: Message[] = threadMessages.map((m) => {
        // Extract domain results from toolResults if present
        let domainResults: DomainResult[] | undefined;
        if (m.toolResults && m.toolResults.length > 0) {
          const domainToolResult = m.toolResults.find(
            (tr) => tr.toolCallId === "check-1" || Array.isArray(tr.result)
          );
          if (domainToolResult && Array.isArray(domainToolResult.result)) {
            domainResults = domainToolResult.result as DomainResult[];
          }
        }

        return {
          id: m._id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.createdAt,
          toolCalls: m.toolCalls,
          toolResults: m.toolResults,
          domainResults,
        };
      });
      setMessages(mapped);
    }
  }, [threadMessages]);

  const handleSaveDomain = useCallback(async (domain: string): Promise<void> => {
    if (!userId) return;

    const tld = domain.substring(domain.lastIndexOf("."));
    await saveDomain({
      userId,
      domain,
      tld,
      available: true,
      projectIdea: input || "Domain search",
    });
  }, [userId, saveDomain, input]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!input.trim() || !userId) return;

    const projectIdea = input.trim();

    // Create thread if needed
    let threadId = activeThreadId;
    if (!threadId) {
      threadId = await createThread({
        userId,
        title: projectIdea.length > 30 ? `${projectIdea.slice(0, 30)}...` : projectIdea,
      });
      setActiveThreadId(threadId);
      onNewConversation?.(threadId, projectIdea);
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: projectIdea,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Save user message to Convex
    await addMessage({
      threadId,
      role: "user",
      content: projectIdea,
    });

    try {
      // Call the AI action to generate response and check domains
      const response = await generateAIResponse({
        threadId,
        userMessage: projectIdea,
      });

      // Add thinking message
      const thinkingMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.thinking,
        timestamp: Date.now(),
        toolCalls: response.toolCalls,
      };
      setMessages((prev) => [...prev, thinkingMessage]);

      // Save thinking message
      await addMessage({
        threadId,
        role: "assistant",
        content: response.thinking,
        toolCalls: response.toolCalls,
      });

      // Add results message with domain cards
      const resultsMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.results,
        timestamp: Date.now(),
        domainResults: response.domainResults as DomainResult[],
      };
      setMessages((prev) => [...prev, resultsMessage]);
      setIsTyping(false);

      // Save results message with tool results
      await addMessage({
        threadId,
        role: "assistant",
        content: response.results,
        toolResults: [{ toolCallId: "check-1", result: response.domainResults }],
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      setIsTyping(false);

      // Determine error type and provide specific message
      let errorContent = "Sorry, I encountered an error while processing your request. Please try again.";

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
          errorContent = "Network error: Unable to reach the server. Please check your internet connection and try again.";
        } else if (message.includes("rate limit") || message.includes("429")) {
          errorContent = "Rate limit exceeded. Please wait a moment before sending another message.";
        } else if (message.includes("unauthorized") || message.includes("401") || message.includes("api key")) {
          errorContent = "API configuration error. Please check the server configuration.";
        } else if (message.includes("timeout")) {
          errorContent = "Request timed out. The server took too long to respond. Please try again.";
        } else if (message.includes("500") || message.includes("internal server")) {
          errorContent = "Server error. The AI service is temporarily unavailable. Please try again later.";
        }
      }

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorContent,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  }, [input, userId, activeThreadId, createThread, addMessage, onNewConversation, generateAIResponse]);

  const handleSuggestionClick = useCallback((suggestion: string): void => {
    setInput(suggestion);
  }, []);

  const suggestions = [
    "A social app for pet owners",
    "AI writing assistant",
    "Fitness tracking platform",
    "Recipe sharing community",
  ];

  // Show loading state while user is being created
  if (userLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-text-secondary">
          <Globe className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {isNewChat ? (
          <WelcomeScreen
            onSuggestionClick={handleSuggestionClick}
            theme={theme}
          />
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onSaveDomain={handleSaveDomain}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isTyping || !userId}
        suggestions={suggestions}
        showSuggestions={isNewChat}
        onSuggestionClick={handleSuggestionClick}
      />
    </div>
  );
}

interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
  theme: string;
}

function WelcomeScreen({ onSuggestionClick, theme }: WelcomeScreenProps): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div
          className={cn(
            "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl",
            "bg-primary/10"
          )}
        >
          <Globe className={cn("h-8 w-8 text-primary", theme === "retro80s" && "animate-pulse")} />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-text">
          What are you building?
        </h1>
        <p className="max-w-md text-text-secondary">
          Tell me about your project and I'll help you discover the perfect domain name.
        </p>
      </div>

      <div className="grid max-w-lg gap-3 sm:grid-cols-2">
        {[
          { icon: "🐾", text: "A social app for pet owners" },
          { icon: "✍️", text: "AI writing assistant" },
          { icon: "💪", text: "Fitness tracking platform" },
          { icon: "🍳", text: "Recipe sharing community" },
        ].map((item) => (
          <button
            key={item.text}
            type="button"
            onClick={() => onSuggestionClick(item.text)}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-border p-4",
              "text-left transition-all",
              "hover:border-primary hover:bg-primary/5 hover:shadow-sm"
            )}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-medium text-text">{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
