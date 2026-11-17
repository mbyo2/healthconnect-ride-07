/**
 * ICE servers for in-app voice calls. Free by design — no paid service.
 *
 * Default: public STUN only (Google + Cloudflare). STUN is free and
 * unconditional; it lets two peers that can reach each other directly
 * connect with no relay at all. That covers the common case (home/office
 * Wi-Fi, most mobile data where the carrier NAT is not symmetric).
 *
 * TURN (relay) is needed only when BOTH peers sit behind symmetric NATs /
 * restrictive mobile networks. No free TURN tier could be verified as
 * genuinely usable without a new account:
 *  - Open Relay Project advertises 20 GB/mo free (metered.ca) but needs a
 *    free-account API key, and a second source reports the Metered free
 *    tier is now 500 MB/mo; the shared-credential ("static auth") endpoint
 *    could NOT be verified from this environment (UDP blocked, raw TCP
 *    reset by sandbox egress), so it is NOT shipped as the relay.
 *  - Cloudflare Realtime TURN advertises 1,000 GB/mo free egress shared
 *    with the SFU, then $0.05/GB — the strongest free allowance on paper —
 *    but credentials are issued per-account via the Cloudflare API, so it
 *    needs the CEO's Cloudflare account (his-only step).
 *
 * TURN is therefore pluggable, not hardcoded: set these env vars and the
 * client picks them up with no code change:
 *   VITE_TURN_URLS="turns:turn.example.com:5349?transport=tcp"
 *   VITE_TURN_USERNAME="..."  VITE_TURN_CREDENTIAL="..."
 * Until then the UI tells the truth: if ICE fails, the call reports
 * "could not connect directly" instead of pretending it worked.
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
  const turnUrls = (import.meta.env.VITE_TURN_URLS as string | undefined)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const username = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;
  if (turnUrls && turnUrls.length > 0 && username && credential) {
    servers.push({ urls: turnUrls, username, credential });
  }
  return servers;
}

/** True when a TURN relay is configured (direct P2P may still be enough). */
export function hasTurnConfigured(): boolean {
  return getIceServers().some((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some((u) => u.startsWith("turn"));
  });
}
