import { useState } from "react";

interface LandingImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

// Branded gradient placeholder (inline SVG — zero network) shown if the
// photo CDN is unreachable or blocked.
const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#397dff" stop-opacity="0.55"/>` +
      `<stop offset="1" stop-color="#0ea5e9" stop-opacity="0.25"/>` +
      `</linearGradient></defs>` +
      `<rect width="1200" height="800" fill="url(#g)"/>` +
      `<g fill="none" stroke="#ffffff" stroke-width="28" opacity="0.85">` +
      `<circle cx="600" cy="400" r="120"/>` +
      `<path d="M600 340v120M540 400h120"/>` +
      `</g></svg>`
  );

/**
 * Landing-page image with resilience built in:
 * - referrerPolicy="no-referrer": some networks/proxies strip or block
 *   hotlinked images based on the Referer header; omitting it is the
 *   recommended fix for Unsplash hotlinks.
 * - onError fallback: a failed photo swaps to a branded inline placeholder
 *   instead of a broken-image icon.
 */
export const LandingImg = ({ src, alt, onError, ...rest }: LandingImgProps) => {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? PLACEHOLDER : src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
};
