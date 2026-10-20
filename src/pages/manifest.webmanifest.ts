// Web app manifest: name and the 192px app icon (public/brand/outbite-mark-192.png).
// Built as /manifest.webmanifest; the name comes from src/config/site.json.
import { assetPath, defaultLocale, getTagline, siteName } from '../i18n';

export function GET() {
  const manifest = {
    name: siteName,
    short_name: siteName,
    description: getTagline(defaultLocale),
    start_url: assetPath(''),
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#17306a',
    icons: [{ src: assetPath('brand/outbite-mark-192.png'), sizes: '192x192', type: 'image/png' }],
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}
