// QR codes for the printables, made at build time as SVG (qrcode package, MIT license)
// from the one siteUrl setting in src/config/site.json. Until siteUrl is set, they point
// to the reserved placeholder domain outbite.example (it can never open a real site)
// and the printables show "[site address]" under them (see README.md, siteUrl).
import QRCode from 'qrcode';
import site from '../config/site.json';
import { siteAddress } from '../i18n';

export const siteUrlSet = Boolean(site.siteUrl);

/** QR code (inline SVG markup) and the full address for a site path from localizePath. */
export async function qr(path: string): Promise<{ svg: string; url: string; shown: string | null }> {
  const url = siteAddress(path);
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#17306A', light: '#FFFFFF' },
  });
  // The address printed under the code: the real one once set, else null ("[site address]").
  return { svg, url, shown: siteUrlSet ? url.replace(/^https?:\/\//, '') : null };
}
