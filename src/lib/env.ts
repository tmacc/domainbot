/**
 * Environment validation
 * Validates required environment variables at startup
 */

interface EnvConfig {
  VITE_CONVEX_URL: string;
}

function validateEnv(): EnvConfig {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error(
      "Missing required environment variable: VITE_CONVEX_URL\n\n" +
        "Please ensure you have a .env.local file with:\n" +
        "  VITE_CONVEX_URL=https://your-deployment.convex.cloud\n\n" +
        "You can get this value by running: npx convex dev"
    );
  }

  return {
    VITE_CONVEX_URL: convexUrl,
  };
}

// Validate on module load
export const env = validateEnv();
