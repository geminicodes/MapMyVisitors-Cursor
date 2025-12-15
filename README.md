# MapMyVisitors

MapMyVisitors is a SaaS product that lets customers embed a **3D globe widget** on any website to visualize **real-time visitor locations**. Customers paste a single `<script>` tag; the widget tracks pageviews, fetches recent visitors, and renders them as dots on a rotating globe.

## How it works

### Customer embed (one line)

```html
<script src="https://mapmyvisitors.com/widget.js?id=USER_WIDGET_ID"></script>
```

### End-to-end flow
- **Page loads** → widget extracts `widgetId` from the script URL
- **Track** → widget sends a fire-and-forget pageview to `POST /api/track`
- **Render** → widget loads `globe.gl` from a CDN and renders a 3D Earth
- **Data** → widget fetches visitor points from `GET /api/visitors/{widgetId}`
- **Live updates** → widget polls every 10s for new visitors
- **Paid gating** → shows a “Powered by MapMyVisitors” watermark when unpaid/unknown

## Key components in this repo

### Embeddable widget source
- **Source**: `public/widget-src.js`
- **Built output**: `public/widget.js` (produced by the build script; intended to be served publicly)

The widget is designed to be safe to embed on arbitrary sites (WordPress/Webflow/Shopify/custom HTML):
- Runs in an IIFE (no global pollution)
- Defensive error handling (should never crash the host page)
- Asynchronous loading (doesn’t block rendering)
- Loads `globe.gl` externally (not bundled)

### Lemon Squeezy webhook (payment-critical)
- **Route**: `app/api/webhook/lemonsqueezy/route.ts`

This endpoint verifies webhook authenticity (HMAC + constant-time compare) and marks users as paid in Supabase. It is intentionally defensive because it gates access after payment.

## Build the widget (esbuild)

The widget build script compiles `public/widget-src.js` → `public/widget.js` with minification and source maps.

```bash
npm install
npm run build:widget
```

Watch mode:

```bash
npm run watch:widget
```

## Environment variables

### Widget build
- **NEXT_PUBLIC_APP_URL**: base URL embedded into the widget at build time (defaults to `https://mapmyvisitors.com`)

### Lemon Squeezy webhook + Supabase
- **LEMONSQUEEZY_WEBHOOK_SECRET**
- **NEXT_PUBLIC_SUPABASE_URL**
- **SUPABASE_SERVICE_ROLE_KEY** (server-side only; never expose client-side)

## Local testing (widget)
1. Build the widget: `npm run build:widget`
2. Serve `public/` with any static server (or via your Next.js app)
3. Load a test page containing the `<script src=".../widget.js?id=...">` tag and watch the browser console logs.