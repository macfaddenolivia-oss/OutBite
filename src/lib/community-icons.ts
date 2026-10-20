// Community page section icons, shared with the Tools page (the landlord-note card
// reuses the apartment building).
import blockHouses from '../assets/source/block-houses.svg?raw';

// Small flat icons: map pin, row of three houses
// (src/assets/source/block-houses.svg),
// apartment building, truck spraying from the back; the last three stand on a light-blue
// ground strip.
// Outlines and figures use currentColor (navy; off-white in dark mode); fills stay light.
const N = 'currentColor';
// Windows, doors and the cab window stay navy so they show on the light fills in dark mode too.
const NAVY = '#17306A';
export const communityIcons = {
  find: `<svg viewBox="0 0 40 40"><path d="M20 37 C12 26 8 21 8 15 a12 12 0 0 1 24 0 c0 6 -4 11 -12 22 Z" fill="#F0AF74" stroke="${N}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="20" cy="15" r="4.6" fill="#FFFFFF" stroke="${N}" stroke-width="2.4"/></svg>`,
  // Three houses with doors on a ground strip: src/assets/source/block-houses.svg.
  organize: blockHouses
    .replace(/^<svg([^>]*?) width="\d+" height="\d+"/, '<svg$1')
    // House outlines follow the page's ink color (light in dark mode); doors stay navy.
    .replaceAll('stroke="#17306A" stroke-width="2.6"', `stroke="${N}" stroke-width="2.6"`),
  // Apartment building: 3 × 4 windows and a front door, on the ground strip.
  renters: `<svg viewBox="0 0 40 40"><rect x="1" y="33" width="38" height="3" fill="#CBDCEC"/><rect x="9.5" y="6.5" width="21" height="26.5" fill="#F4D1A8" stroke="${N}" stroke-width="1.8"/><path d="M7.5 5.5 H32.5" stroke="${N}" stroke-width="2.6" stroke-linecap="round"/><g fill="#FFFFFF" stroke="${NAVY}" stroke-width="1"><rect x="12.00" y="9.00" width="3.99" height="3.99"/><rect x="18.00" y="9.00" width="3.99" height="3.99"/><rect x="24.00" y="9.00" width="3.99" height="3.99"/><rect x="12.00" y="14.00" width="3.99" height="3.99"/><rect x="18.00" y="14.00" width="3.99" height="3.99"/><rect x="24.00" y="14.00" width="3.99" height="3.99"/><rect x="12.00" y="19.00" width="3.99" height="3.99"/><rect x="18.00" y="19.00" width="3.99" height="3.99"/><rect x="24.00" y="19.00" width="3.99" height="3.99"/><rect x="12.00" y="24.00" width="3.99" height="3.99"/><rect x="18.00" y="24.00" width="3.99" height="3.99"/><rect x="24.00" y="24.00" width="3.99" height="3.99"/></g><rect x="18" y="28.6" width="4" height="4.4" fill="#FFFFFF" stroke="${NAVY}" stroke-width="1.2"/></svg>`,
  // Truck facing right with a nozzle at the back and a fan of spray dots behind it.
  spraying: `<svg viewBox="0 0 40 40"><rect x="1" y="31.5" width="38" height="3" fill="#CBDCEC"/><path d="M9 18 H6.2" stroke="${N}" stroke-width="2.2" stroke-linecap="round"/><g fill="#5B91C2"><circle cx="5.2" cy="16.6" r="1.25"/><circle cx="5.2" cy="19.2" r="1.25"/><circle cx="3.2" cy="14.2" r="1.0"/><circle cx="3.2" cy="17.6" r="1.0"/><circle cx="3.2" cy="21.0" r="1.0"/><circle cx="1.4" cy="11.8" r="0.75"/><circle cx="1.4" cy="15.2" r="0.75"/><circle cx="1.4" cy="18.6" r="0.75"/><circle cx="1.4" cy="22.0" r="0.75"/></g><rect x="9" y="13" width="18" height="14.5" rx="1" fill="#CBDCEC" stroke="${N}" stroke-width="2"/><path d="M27 17 H33 L37.5 22.5 V27.5 H27 Z" fill="#FFFFFF" stroke="${N}" stroke-width="2" stroke-linejoin="round"/><path d="M29 19 H32.2 L34.6 22 H29 Z" fill="#CBDCEC" stroke="${NAVY}" stroke-width="1" stroke-linejoin="round"/><circle cx="14" cy="28.5" r="3" fill="${N}"/><circle cx="32" cy="28.5" r="3" fill="${N}"/></svg>`,
} as Record<string, string>;
