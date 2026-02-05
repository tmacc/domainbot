import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { SimpleProductProvider } from "@simple-product/sdk/react";

import { env } from "../lib/env";
import { ThemeProvider } from "../lib/theme-context";
import { UserProvider, useUser } from "../lib/user-context";
import { FeedbackWidget } from "../components/FeedbackWidget";

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
              <AnalyticsWrapper>
                <div className="h-screen bg-background text-text">
                  {children}
                </div>
              </AnalyticsWrapper>
            </ThemeProvider>
          </UserProvider>
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  );
}

// Wrapper component to provide SimpleProduct analytics and feedback widget
function AnalyticsWrapper({ children }: { children: React.ReactNode }): JSX.Element {
  const { userId } = useUser();

  // Only render SimpleProductProvider if API key is configured
  if (!env.VITE_SIMPLE_PRODUCT_API_KEY) {
    return (
      <>
        {children}
        <FeedbackWidget />
      </>
    );
  }

  return (
    <SimpleProductProvider
      apiKey={env.VITE_SIMPLE_PRODUCT_API_KEY}
      user={userId ? { id: userId } : null}
    >
      {children}
      <FeedbackWidget />
    </SimpleProductProvider>
  );
}
