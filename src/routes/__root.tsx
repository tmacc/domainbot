import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ConvexProvider, ConvexReactClient } from "convex/react";

import { ThemeProvider } from "../lib/theme-context";
import { UserProvider } from "../lib/user-context";

import appCss from "../styles.css?url";

// Create Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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
            <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
            />
            </ThemeProvider>
          </UserProvider>
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  );
}
