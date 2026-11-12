import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
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

const isApiRoute = createRouteMatcher(["/api(.*)"]);

const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    if (isApiRoute(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Prefer an explicit sign-in redirect over auth.protect()'s 401 on RSC/prefetch.
    // Absolute returnBackUrl is fine — sign-in page normalizes it to a path.
    return redirectToSignIn({ returnBackUrl: request.url });
  }
});

/** Clerk rewrites to http://localhost:3000; Next then HTTP-proxies that as a foreign origin and loops. */
function sameOriginLoopbackRewrite(res: Response, request: NextRequest): Response {
  const rewrite = res.headers.get("x-middleware-rewrite");
  if (!rewrite) return res;
  let dest: URL;
  try {
    dest = new URL(rewrite);
  } catch {
    return res;
  }
  const src = request.nextUrl;
  const loopback =
    dest.hostname === "localhost" ||
    dest.hostname === "127.0.0.1" ||
    dest.origin === src.origin;
  if (!loopback) return res;

  const destPath = dest.pathname + dest.search;
  const srcPath = src.pathname + src.search;
  if (destPath === srcPath) {
    const requestHeaders = new Headers(request.headers);
    res.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith("x-middleware-request-")) {
        requestHeaders.set(key.slice("x-middleware-request-".length), value);
      }
    });
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (dest.origin === src.origin) return res;
  dest.protocol = src.protocol;
  dest.hostname = src.hostname;
  dest.port = src.port;
  const headers = new Headers(res.headers);
  headers.set("x-middleware-rewrite", dest.toString());
  return new NextResponse(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  const res = await clerkHandler(request, event);
  if (!res) return res;
  return sameOriginLoopbackRewrite(res, request);
}

export const config = {
  matcher: [
    // Anchor extensions to the path end so `/invoices/foo.js.map` still runs middleware.
    "/((?!_next|[^?]*\\.(?:html?|css|json?|js|mjs|cjs|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)$).*)",
    "/(api|trpc)(.*)",
  ],
};
