import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface UserContextValue {
  userId: Id<"users"> | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

// For now, we use a simple anonymous user system
// In production, this would be replaced with Better Auth
const ANONYMOUS_USER_KEY = "domainbot_anonymous_user";

export function UserProvider({ children }: { children: ReactNode }): JSX.Element {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get or create anonymous user
  const getOrCreateUser = useMutation(api.users.getOrCreateAnonymous);

  useEffect(() => {
    // Check localStorage for existing anonymous ID
    const storedId = localStorage.getItem(ANONYMOUS_USER_KEY);
    if (storedId) {
      setAnonymousId(storedId);
    } else {
      // Generate new anonymous ID
      const newId = crypto.randomUUID();
      localStorage.setItem(ANONYMOUS_USER_KEY, newId);
      setAnonymousId(newId);
    }
  }, []);

  useEffect(() => {
    if (!anonymousId) return;

    // Get or create user in Convex
    getOrCreateUser({ anonymousId })
      .then((id) => {
        setUserId(id);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to get/create user:", err);
        setIsLoading(false);
      });
  }, [anonymousId, getOrCreateUser]);

  return (
    <UserContext.Provider value={{ userId, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
