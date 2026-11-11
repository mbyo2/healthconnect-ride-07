import { useState } from "react";

interface LandingImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

// Branded flat placeholder (inline SVG — zero network) shown if the
// photo CDN is unreachable or blocked.
const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">` +
      `<rect width="1200" height="800" fill="#002991"/>` +
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
