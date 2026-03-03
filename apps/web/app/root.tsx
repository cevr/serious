import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  Link,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/root";

import "./app.css";

export const meta: Route.MetaFunction = () => [
  { title: "Serious" },
  { name: "description", content: "Spaced repetition for language learning" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function GlobalLoadingBar() {
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  if (!isLoading) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-primary/20">
      <div className="h-full w-1/3 animate-pulse bg-primary" />
    </div>
  );
}

export default function Root() {
  return (
    <>
      <GlobalLoadingBar />
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const title = is404 ? "not found" : "something went wrong";
  const message = is404
    ? "this page doesn\u2019t exist."
    : isRouteErrorResponse(error)
      ? error.data
      : error instanceof Error
        ? error.message
        : "Unknown error";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
      <p className="mt-3 text-muted-foreground">{message}</p>
      <Link
        to="/"
        className="mt-6 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; home
      </Link>
    </div>
  );
}
