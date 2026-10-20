// robots.txt: while the site is in preview ("preview": true in src/config/site.json), it
// asks every search engine to stay out; every page also carries a noindex tag. At launch
// (preview false) it lets them in.
import site from '../config/site.json';

export function GET() {
  const body = site.preview === true ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
