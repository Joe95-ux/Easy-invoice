import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/about(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/cookies(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/view(.*)",
  "/portal(.*)",
  // Must be `/f/...` only — `/f(.*)` also matched `/follow-ups`, `/forms`, `/foo`, etc.
  "/f/(.*)",
  "/q/(.*)",
  "/accept-invite(.*)",
  "/api/webhooks(.*)",
  "/api/public(.*)",
  "/api/portal(.*)",
  "/api/company/invites/preview(.*)",
  "/api/cron(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  // Prefer an explicit sign-in redirect over auth.protect()'s 401 on RSC/prefetch requests.
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: request.url });
  }
});

export const config = {
  matcher: [
    // Anchor extensions to the path end so `/invoices/foo.js.map` still runs middleware.
    "/((?!_next|[^?]*\\.(?:html?|css|json?|js|mjs|cjs|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)$).*)",
    "/(api|trpc)(.*)",
  ],
};
