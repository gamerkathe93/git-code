import { NextResponse } from "next/server";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GitCode API Docs</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0d1117;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      min-height: 100vh;
    }

    /* ── Top bar ── */
    .topbar-custom {
      background: rgba(13, 17, 23, 0.92);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding: 0 24px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .topbar-logo-icon {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: linear-gradient(135deg, #1d4ed8, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 12px rgba(59,130,246,0.35);
      font-size: 16px;
    }
    .topbar-logo span {
      font-size: 16px;
      font-weight: 700;
      color: #e6edf3;
      letter-spacing: -0.02em;
    }
    .topbar-badge {
      font-size: 11px;
      font-weight: 600;
      color: #58a6ff;
      background: rgba(88,166,255,0.1);
      border: 1px solid rgba(88,166,255,0.2);
      border-radius: 20px;
      padding: 2px 8px;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .topbar-link {
      font-size: 13px;
      color: #8b949e;
      text-decoration: none;
      transition: color 0.15s;
    }
    .topbar-link:hover { color: #e6edf3; }
    .btn-spec {
      font-size: 12px;
      font-weight: 600;
      color: #e6edf3;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      padding: 5px 12px;
      text-decoration: none;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn-spec:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.2);
    }

    /* ── Swagger container ── */
    #swagger-ui {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px 80px;
    }

    /* ── Swagger UI theme overrides ── */
    .swagger-ui { font-family: inherit; }

    /* Hide default swagger topbar */
    .swagger-ui .topbar { display: none !important; }

    /* Info section */
    .swagger-ui .info { margin: 0 0 24px; }
    .swagger-ui .info .title {
      font-size: 26px !important;
      font-weight: 800 !important;
      color: #e6edf3 !important;
      letter-spacing: -0.02em;
    }
    .swagger-ui .info .description p,
    .swagger-ui .info p {
      color: #8b949e !important;
      font-size: 14px !important;
    }
    .swagger-ui .info a { color: #58a6ff !important; }

    /* Version badge */
    .swagger-ui .info .version {
      background: rgba(88,166,255,0.12) !important;
      border: 1px solid rgba(88,166,255,0.25) !important;
      color: #58a6ff !important;
      border-radius: 20px !important;
      padding: 2px 10px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
    }

    /* Scheme selector */
    .swagger-ui .scheme-container {
      background: rgba(22, 27, 34, 0.8) !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      border-radius: 10px !important;
      box-shadow: none !important;
      padding: 16px !important;
      margin: 0 0 24px !important;
    }
    .swagger-ui .scheme-container .schemes > label {
      color: #8b949e !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Authorize button */
    .swagger-ui .auth-wrapper .authorize {
      background: linear-gradient(135deg, #1d4ed8, #2563eb) !important;
      border: none !important;
      color: #fff !important;
      border-radius: 6px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      padding: 8px 16px !important;
      box-shadow: 0 0 12px rgba(37,99,235,0.3) !important;
    }

    /* Tag sections */
    .swagger-ui .opblock-tag {
      border-bottom: 1px solid rgba(255,255,255,0.06) !important;
      color: #e6edf3 !important;
      font-size: 15px !important;
      font-weight: 700 !important;
    }
    .swagger-ui .opblock-tag:hover {
      background: rgba(255,255,255,0.03) !important;
    }
    .swagger-ui .opblock-tag small {
      color: #8b949e !important;
      font-weight: 400 !important;
      font-size: 13px !important;
    }

    /* Operation blocks */
    .swagger-ui .opblock {
      border-radius: 8px !important;
      border: 1px solid rgba(255,255,255,0.06) !important;
      margin: 0 0 8px !important;
      overflow: hidden !important;
      background: rgba(22, 27, 34, 0.6) !important;
      box-shadow: none !important;
    }
    .swagger-ui .opblock:hover { border-color: rgba(255,255,255,0.12) !important; }

    .swagger-ui .opblock .opblock-summary {
      border: none !important;
      background: transparent !important;
    }
    .swagger-ui .opblock .opblock-summary:hover { background: rgba(255,255,255,0.03) !important; }

    .swagger-ui .opblock .opblock-summary-path {
      color: #e6edf3 !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      font-family: "JetBrains Mono", "Fira Code", monospace !important;
    }
    .swagger-ui .opblock .opblock-summary-description {
      color: #8b949e !important;
      font-size: 12px !important;
    }

    /* Method badges */
    .swagger-ui .opblock-summary-method {
      border-radius: 4px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      min-width: 60px !important;
      text-align: center !important;
    }
    .swagger-ui .opblock.opblock-get    { border-left: 3px solid #3fb950 !important; }
    .swagger-ui .opblock.opblock-post   { border-left: 3px solid #58a6ff !important; }
    .swagger-ui .opblock.opblock-put    { border-left: 3px solid #d29922 !important; }
    .swagger-ui .opblock.opblock-patch  { border-left: 3px solid #f78166 !important; }
    .swagger-ui .opblock.opblock-delete { border-left: 3px solid #f85149 !important; }

    .swagger-ui .opblock.opblock-get    .opblock-summary-method { background: rgba(63,185,80,0.15) !important; color: #3fb950 !important; }
    .swagger-ui .opblock.opblock-post   .opblock-summary-method { background: rgba(88,166,255,0.15) !important; color: #58a6ff !important; }
    .swagger-ui .opblock.opblock-put    .opblock-summary-method { background: rgba(210,153,34,0.15) !important; color: #d29922 !important; }
    .swagger-ui .opblock.opblock-patch  .opblock-summary-method { background: rgba(247,129,102,0.15) !important; color: #f78166 !important; }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: rgba(248,81,73,0.15) !important; color: #f85149 !important; }

    /* Expanded body */
    .swagger-ui .opblock-body { background: rgba(13,17,23,0.6) !important; }
    .swagger-ui .opblock-section-header {
      background: rgba(22,27,34,0.8) !important;
      border-top: 1px solid rgba(255,255,255,0.06) !important;
    }
    .swagger-ui .opblock-section-header h4 {
      color: #8b949e !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Tables */
    .swagger-ui table thead tr th {
      color: #8b949e !important;
      border-bottom: 1px solid rgba(255,255,255,0.06) !important;
      font-size: 12px !important;
      font-weight: 600 !important;
    }
    .swagger-ui table tbody tr td {
      color: #e6edf3 !important;
      border-bottom: 1px solid rgba(255,255,255,0.04) !important;
      font-size: 13px !important;
    }
    .swagger-ui .parameter__name { color: #e6edf3 !important; font-weight: 600 !important; }
    .swagger-ui .parameter__type { color: #58a6ff !important; font-family: monospace !important; }
    .swagger-ui .parameter__in   { color: #8b949e !important; font-size: 11px !important; }

    /* Code / JSON */
    .swagger-ui .highlight-code, .swagger-ui pre {
      background: rgba(13,17,23,0.8) !important;
      border: 1px solid rgba(255,255,255,0.06) !important;
      border-radius: 6px !important;
    }
    .swagger-ui .model-box { background: rgba(22,27,34,0.6) !important; border-radius: 6px !important; }
    .swagger-ui .model { color: #e6edf3 !important; }
    .swagger-ui .prop-type { color: #58a6ff !important; }
    .swagger-ui .prop-name { color: #e6edf3 !important; }

    /* Execute button */
    .swagger-ui .btn.execute {
      background: linear-gradient(135deg, #1d4ed8, #2563eb) !important;
      border: none !important;
      color: #fff !important;
      border-radius: 6px !important;
      font-weight: 600 !important;
      box-shadow: 0 0 10px rgba(37,99,235,0.25) !important;
    }
    .swagger-ui .btn.execute:hover { opacity: 0.9 !important; }

    .swagger-ui .btn.cancel {
      background: transparent !important;
      border: 1px solid rgba(255,255,255,0.15) !important;
      color: #8b949e !important;
      border-radius: 6px !important;
    }

    /* Try it out */
    .swagger-ui .try-out__btn {
      background: transparent !important;
      border: 1px solid rgba(88,166,255,0.3) !important;
      color: #58a6ff !important;
      border-radius: 6px !important;
      font-size: 12px !important;
    }

    /* Response codes */
    .swagger-ui .response-col_status { color: #e6edf3 !important; font-weight: 700 !important; }
    .swagger-ui .response-col_description { color: #8b949e !important; }

    /* Inputs */
    .swagger-ui input[type="text"], .swagger-ui textarea, .swagger-ui select {
      background: rgba(22,27,34,0.8) !important;
      border: 1px solid rgba(255,255,255,0.12) !important;
      color: #e6edf3 !important;
      border-radius: 6px !important;
    }
    .swagger-ui input[type="text"]:focus, .swagger-ui textarea:focus {
      border-color: rgba(88,166,255,0.4) !important;
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(88,166,255,0.08) !important;
    }

    /* Dialog / modal */
    .swagger-ui .dialog-ux .modal-ux {
      background: #161b22 !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 12px !important;
      box-shadow: 0 16px 60px rgba(0,0,0,0.6) !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header {
      border-bottom: 1px solid rgba(255,255,255,0.08) !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header h3 { color: #e6edf3 !important; font-size: 16px !important; font-weight: 700 !important; }
    .swagger-ui .dialog-ux .modal-ux-content p,
    .swagger-ui .dialog-ux .modal-ux-content label { color: #8b949e !important; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
  </style>
</head>
<body>

  <!-- Custom top bar -->
  <nav class="topbar-custom">
    <a class="topbar-logo" href="/">
      <div class="topbar-logo-icon">⌥</div>
      <span>GitCode</span>
    </a>
    <div class="topbar-right">
      <a class="topbar-link" href="/">← Back to app</a>
      <a class="btn-spec" href="/api/openapi" target="_blank">OpenAPI JSON ↗</a>
    </div>
  </nav>

  <div id="swagger-ui"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.min.js"></script>
  <script>
    window.onload = function () {
      SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: "list",
        filter: true,
        tryItOutEnabled: true,
        requestInterceptor: function (req) {
          // Cookies are sent automatically — no manual header needed
          req.credentials = "include";
          return req;
        },
      });
    };
  </script>
</body>
</html>`;

export async function GET() {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
