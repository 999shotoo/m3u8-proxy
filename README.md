# M3U8 Proxy

An Express and TypeScript proxy for HLS (`.m3u8`) playlists and related media
resources. It is intended for clients that cannot request a remote playlist
directly because of browser CORS restrictions.

The proxy fetches the upstream resource, forwards the relevant request
metadata, and adds permissive CORS response headers. HLS playlists are
streamed through a line transformer so that child playlists and media segments
are routed back through this service.

> **Important:** This project is a general-purpose proxy. Only use it with
> content you are authorized to access and redistribute. Running an unrestricted
> public proxy can expose your server to bandwidth abuse, SSRF, and unwanted
> third-party traffic. Add authentication, host allow-listing, rate limiting,
> and request validation before deploying it publicly.

## Features

- Proxy HLS playlists and media files through a single origin.
- Rewrite relative and absolute playlist URLs.
- Forward `Referer`, `Origin`, and a browser-like `User-Agent` upstream.
- Forward the incoming `Range` header for seeking in media files.
- Proxy WebVTT subtitle files.
- Provide a base64url-encoded playlist mode when raw URLs are inconvenient to
  expose in query strings.
- Serve a small homepage from `public/index.html`.
- Run locally with Node.js or deploy through the included Vercel adapter.

## Requirements

- Node.js 18 or newer is recommended.
- npm.
- Network access to the upstream media host.

## Installation

```bash
git clone https://github.com/999shotoo/m3u8-proxy.git
cd m3u8-proxy
npm install
```

## Running locally

### Development

The development script starts Nodemon against the TypeScript entry point:

```bash
npm run dev
```

The application listens on:

```text
http://localhost:4040
```

### Build and start

Compile TypeScript into `dist/`:

```bash
npm run build
```

Compile and start the compiled server:

```bash
npm start
```

The port is currently fixed to `4040` in `src/index.ts`; there is no
environment-variable port configuration in the current implementation.

## API

All endpoints use `GET` requests. The examples below assume the service is
running at `http://localhost:4040`.

### `GET /m3u8-proxy`

Proxies a URL and rewrites HLS playlist references.

#### Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `url` | Yes | Absolute upstream URL to fetch. |
| `ref` | No | Upstream `Referer` header. Defaults to `http://localhost/`. |
| `orgin` | No | Upstream `Origin` header. Defaults to `http://localhost`. The spelling is intentionally `orgin` to match the existing API. |

For an `.m3u8` URL, playlist lines that look like child playlists, segments,
or other supported resources are rewritten to `/m3u8-proxy?url=...`. Relative
URLs are resolved against the upstream playlist URL before they are encoded.

For static files and non-playlist responses, the upstream response body is
streamed without playlist rewriting. Supported static extensions include:

`.ts`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.ico`, `.html`, `.js`, `.css`, `.txt`,
`.mp4`, `.m4s`, `.aac`, and `.vtt`.

Example:

```text
http://localhost:4040/m3u8-proxy?url=https%3A%2F%2Fexample.com%2Fvideo%2Fmaster.m3u8
```

With upstream request metadata:

```text
http://localhost:4040/m3u8-proxy?url=https%3A%2F%2Fexample.com%2Fvideo%2Fmaster.m3u8&ref=https%3A%2F%2Fexample.com%2F&orgin=https%3A%2F%2Fexample.com
```

The endpoint accepts and forwards a client `Range` header, which allows
range-aware upstream resources to support seeking and return `206 Partial
Content`.

### `GET /vtt-proxy`

Streams a remote WebVTT file and sets the response content type to
`text/vtt`.

#### Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `url` | Yes | Absolute upstream VTT URL. |
| `ref` | No | Upstream `Referer` header. |
| `orgin` | No | Upstream `Origin` header. |

Example:

```text
http://localhost:4040/vtt-proxy?url=https%3A%2F%2Fexample.com%2Fsubtitles%2Fen.vtt
```

### `GET /m3u8-encode`

Equivalent to the playlist proxy, but accepts the upstream URL as an
unpadded base64url query value. Rewritten child URLs are also encoded and
point to `/m3u8-encode`.

#### Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `url` | Yes | Base64url-encoded upstream URL. Standard `+`, `/`, and trailing `=` characters are converted to URL-safe form by the client. |
| `ref` | No | Upstream `Referer` header. |
| `orgin` | No | Upstream `Origin` header. |

Browser example:

```js
const upstreamUrl = "https://example.com/video/master.m3u8";
const encodedUrl = btoa(upstreamUrl)
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

const proxyUrl =
  `http://localhost:4040/m3u8-encode?url=${encodeURIComponent(encodedUrl)}`;
```

This mode is not encryption. Base64url encoding only changes how the URL is
represented; it does not provide confidentiality or access control.

## Example playback

The resulting proxy URL can be supplied to an HLS-capable player:

```js
const source =
  "http://localhost:4040/m3u8-proxy?url=" +
  encodeURIComponent("https://example.com/video/master.m3u8");

// Example shape for a player library:
const video = document.querySelector("video");
if (video.canPlayType("application/vnd.apple.mpegurl")) {
  video.src = source;
}
```

For browsers without native HLS support, use an HLS player library and pass
the same proxy URL as its manifest source.

## Request flow

1. The client requests one of the proxy endpoints with an upstream URL.
2. The controller fetches the URL with Axios using a streaming response.
3. `Referer`, `Origin`, and `User-Agent` are sent upstream.
4. Playlist responses are passed through the line transformer.
5. Relative resource URLs are resolved against the playlist URL.
6. Child URLs are rewritten to a proxy endpoint and returned to the client.
7. Media files, VTT files, and other non-playlist responses are streamed
   directly.

The application also serves `public/index.html` as static content, and the
Express application is exported through `api/index.ts` for serverless
deployment.

## Project structure

```text
.
├── api/
│   └── index.ts                 # Vercel/serverless adapter
├── public/
│   └── index.html               # Browser homepage
├── src/
│   ├── controllers/
│   │   ├── m3u8-encode.ts       # Base64url playlist proxy
│   │   ├── m3u8-proxy.ts        # Standard playlist/resource proxy
│   │   └── vtt-proxy.ts         # WebVTT proxy
│   ├── routes/
│   │   └── route.ts             # Express route definitions
│   ├── utils/
│   │   ├── cache-routes.ts      # Optional cache middleware helper
│   │   └── line-transform.ts    # Playlist URL rewriting streams
│   └── index.ts                 # Express application and local server
├── package.json
├── tsconfig.json
└── vercel.json
```

## Deployment to Vercel

The repository includes `vercel.json` and exports the Express app from
`api/index.ts`. After installing dependencies and building the project, deploy
with the Vercel CLI or connect the repository to Vercel:

```bash
npx vercel
```

The rewrite configuration sends incoming paths to the `/api` function. Verify
the deployed URL with a small upstream playlist before using it in a player.
Serverless execution limits, outbound network policies, and provider billing
can affect long-running media streams.

## Configuration and behavior notes

- CORS is currently enabled for every origin (`*`) on the Express app and proxy
  responses.
- The upstream `cache-control`, `expires`, and `pragma` headers are removed
  from proxied responses. Playlist responses also remove `content-length`
  because their bodies are transformed.
- The `cacheRoutes` helper defines one-hour public caching but is not currently
  attached to any route.
- The `dotenv` dependency is loaded, but the current source does not read any
  environment variables.
- Missing `url` parameters return HTTP `400`.
- Upstream or transformation failures are logged server-side and return HTTP
  `500` when the response has not already started.
- The service does not currently restrict which hosts may be requested. Do not
  expose it to untrusted users without adding an allow-list and other abuse
  protections.

## Development checklist

Before deploying a public instance, consider adding:

1. A host allow-list or explicit upstream domain configuration.
2. Authentication or signed proxy URLs.
3. Rate limiting and maximum response/request timeouts.
4. Request URL validation that blocks private and local network addresses.
5. Structured logging without leaking sensitive query parameters.
6. Tests for relative URLs, protocol-relative URLs, query strings, redirects,
   range requests, and malformed playlists.
7. A configurable port and environment-specific CORS policy.

## License

The package currently declares the `ISC` license. Review the repository's
license and the licenses of any upstream content before redistribution.
