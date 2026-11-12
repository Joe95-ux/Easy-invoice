/**
 * Windows: Next/Clerk rewrite to `http://localhost:3000`. If the server is
 * bound to 127.0.0.1, Next treats that as an external proxy and loops.
 *
 * Listen as hostname `localhost` with IPv4-first DNS so the socket is
 * 127.0.0.1 (browsers can use that) while Clerk's localhost rewrite stays
 * same-origin. Also accept ::1 so `http://localhost:3000` works in Chrome.
 */
import { spawn } from "node:child_process";
import dns from "node:dns";
import net from "node:net";
import { createRequire } from "node:module";

dns.setDefaultResultOrder("ipv4first");
process.env.HOSTNAME = "localhost";
process.env.HOST = "localhost";
process.env.__NEXT_PRIVATE_ORIGIN = "http://localhost:3000";
if (!process.env.NODE_OPTIONS?.includes("dns-result-order")) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--dns-result-order=ipv4first"]
    .filter(Boolean)
    .join(" ");
}

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const extra = process.argv.slice(2);

const child = spawn(
  process.execPath,
  ["--dns-result-order=ipv4first", nextBin, "dev", "-H", "localhost", "-p", "3000", ...extra],
  {
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  },
);

const ipv6Proxy = net.createServer((incoming) => {
  const upstream = net.connect({ host: "127.0.0.1", port: 3000 }, () => {
    incoming.pipe(upstream);
    upstream.pipe(incoming);
  });
  upstream.on("error", () => incoming.destroy());
  incoming.on("error", () => upstream.destroy());
});
ipv6Proxy.on("error", (err) => {
  if (err.code !== "EADDRINUSE") {
    console.error("[dev] IPv6 localhost proxy:", err.message);
  }
});
ipv6Proxy.listen(3000, "::1");

function shutdown(code) {
  ipv6Proxy.close();
  process.exit(code);
}

child.on("exit", (code, signal) => {
  if (signal) {
    ipv6Proxy.close();
    process.kill(process.pid, signal);
    return;
  }
  shutdown(code ?? 1);
});
