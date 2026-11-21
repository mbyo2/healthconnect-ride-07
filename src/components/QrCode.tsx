import { useMemo } from "react";
import { qrMatrix } from "@/lib/qrCode";

/** Renders a QR code (byte mode, ECC level M) as an SVG. Used for the
 *  ZRA Smart Invoice verification code on fiscal receipts. */
export function QrCode({ value, size = 120, className }: {
  value: string;
  size?: number;
  className?: string;
}) {
  const cells = useMemo(() => {
    try {
      const matrix = qrMatrix(value);
      const n = matrix.length;
      const rects: React.ReactNode[] = [];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix[r][c]) {
            rects.push(<rect key={`${r}-${c}`} x={c} y={r} width={1.02} height={1.02} />);
          }
        }
      }
      return { n, rects };
    } catch {
      return null;
    }
  }, [value]);

  if (!cells) return null;
  return (
    <svg
      viewBox={`-2 -2 ${cells.n + 4} ${cells.n + 4}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="ZRA receipt verification QR code"
    >
      <rect x={-2} y={-2} width={cells.n + 4} height={cells.n + 4} fill="#ffffff" />
      <g fill="#0f172a">{cells.rects}</g>
    </svg>
  );
}
