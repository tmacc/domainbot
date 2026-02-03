import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";

import { env } from "../lib/env";
import { ThemeProvider } from "../lib/theme-context";
import { UserProvider } from "../lib/user-context";

import appCss from "../styles.css?url";

// Create Convex client (env.ts validates VITE_CONVEX_URL exists)
const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "DomainBot - AI Domain Discovery",
      },
      {
        name: "description",
        content: "Find the perfect domain name for your project with AI-powered suggestions",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
      },
    ],
  }),

  component: RootComponent,
});

function RootComponent(): JSX.Element {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexProvider client={convex}>
          <UserProvider>
            <ThemeProvider>
              <div className="h-screen bg-background text-text">
                {children}
              </div>
            </ThemeProvider>
          </UserProvider>
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  );
}
