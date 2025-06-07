import React from "react";

/**
 * Vector cinema-themed icons for use throughout the site.
 * Theme: film reel, popcorn, curtains, spotlight, movie ticket, cinema screen.
 * Edit or add more as desired for expansion.
 */

// PUBLIC_INTERFACE
export function FilmReelSVG({ style, size = 34 }) {
  return (
    <svg style={style} width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="19" stroke="#d505ff" strokeWidth="3" fill="#fff" />
      <circle cx="24" cy="24" r="8" stroke="#d505ff" strokeWidth="2" />
      <circle cx="24" cy="6.5" r="2" fill="#d505ff" />
      <circle cx="24" cy="41.5" r="2" fill="#d505ff" />
      <circle cx="41.5" cy="24" r="2" fill="#d505ff" />
      <circle cx="6.5" cy="24" r="2" fill="#d505ff" />
      <circle cx="37.5" cy="37.5" r="1.9" fill="#d505ff" />
      <circle cx="10.5" cy="10.5" r="1.9" fill="#d505ff" />
      <circle cx="37.5" cy="10.5" r="1.9" fill="#d505ff" />
      <circle cx="10.5" cy="37.5" r="1.9" fill="#d505ff" />
    </svg>
  );
}
// PUBLIC_INTERFACE
export function PopcornSVG({ style, size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={style}>
      <ellipse cx="20" cy="10" rx="11" ry="7" fill="#fdedab" />
      <rect x="10" y="10" width="20" height="19" rx="7" fill="#fff" stroke="#d505ff" strokeWidth="1.5"/>
      <ellipse cx="20" cy="29" rx="7" ry="2.5" fill="#fee868" />
      <rect x="13.5" y="20" width="3" height="8.5" fill="#d505ff" rx="1.5"/>
      <rect x="23.5" y="20" width="3" height="8.5" fill="#d505ff" rx="1.5"/>
    </svg>
  );
}
// PUBLIC_INTERFACE
export function CurtainSVG({ style, size = 52 }) {
  return (
    <svg style={style} width={size} height={size * 1.2} viewBox="0 0 52 62" fill="none">
      <rect width="52" height="62" rx="8" fill="#d505ff" />
      <path d="M0 0 Q26 28 52 0" stroke="#fff" strokeWidth="5" fill="none"/>
      <path d="M0 0 Q26 32 52 0" stroke="#000" strokeWidth="1.2" fill="none" opacity="0.2"/>
      <ellipse cx="13" cy="12" rx="4" ry="8" fill="#642585"/>
      <ellipse cx="39" cy="12" rx="4" ry="8" fill="#642585"/>
    </svg>
  );
}
// PUBLIC_INTERFACE
export function SpotlightSVG({ style, size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" style={style} fill="none">
      <ellipse cx="19" cy="27" rx="11" ry="8" fill="#ffeedd" opacity="0.5"/>
      <ellipse cx="19" cy="14" rx="6" ry="6" fill="#ffd53a" />
      <rect x="15" y="2" width="8" height="17" rx="4" fill="#d505ff" />
      <rect x="15.7" y="5" width="6.7" height="3.2" rx="1.6" fill="#fff" opacity="0.75"/>
    </svg>
  );
}
// PUBLIC_INTERFACE
export function MovieTicketSVG({ style, size = 40 }) {
  return (
    <svg width={size} height={size * 0.54} viewBox="0 0 60 32" style={style}>
      <rect x="4" y="4" width="52" height="24" rx="6" fill="#fff6ed" stroke="#d505ff" strokeWidth="2"/>
      <rect x="8" y="8" width="44" height="16" rx="4" fill="#f6dfff" stroke="#d505ff" strokeWidth="1"/>
      <circle cx="10" cy="16" r="1.7" fill="#d505ff"/>
      <circle cx="50" cy="16" r="1.7" fill="#d505ff"/>
      <rect x="20" y="13" width="20" height="6" rx="2.2" fill="#d505ff" opacity="0.3"/>
      <rect x="24" y="16" width="12" height="2.1" rx="1" fill="#d505ff"/>
    </svg>
  );
}
// PUBLIC_INTERFACE
export function CinemaScreenSVG({ style, size = 62 }) {
  return (
    <svg width={size} height={size * 0.58} viewBox="0 0 62 36" style={style}>
      <rect x="2.5" y="8" width="57" height="18" rx="6.7" fill="#e0d0ff" stroke="#d505ff" strokeWidth="2"/>
      <rect x="7.5" y="13" width="47" height="8" rx="3" fill="#fff" />
      <rect x="17" y="28" width="8" height="6" rx="2" fill="#d505ff" />
      <rect x="37" y="28" width="8" height="6" rx="2" fill="#d505ff" />
    </svg>
  );
}
