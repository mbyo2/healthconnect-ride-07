import React from "react";

/**
 * Shared page header for the institution / HMS shells
 * (InstitutionDashboard + HospitalManagement).
 *
 * Token-styled: `doc-page-header` sticky bar, canvas surfaces, a
 * `font-display` title and a single 1600px content width so header, tabs
 * and page content line up across both shells. Everything shell-specific
 * (identity chip colour, badges, actions) is passed in as slots so each
 * shell keeps its existing elements and handlers.
 */
export interface InstitutionPageHeaderProps {
  /** Page title (usually the institution name). Rendered in font-display. */
  title: React.ReactNode;
  /** Optional line under the title. */
  subtitle?: React.ReactNode;
  /** Optional identity icon, rendered inside the rounded chip. */
  icon?: React.ReactNode;
  /** Chip classes (e.g. an archetype background via iconStyle). */
  iconClassName?: string;
  /** Inline chip style — used for the per-archetype identity colour. */
  iconStyle?: React.CSSProperties;
  /** Badges rendered inline next to the title (Verified, Super Admin, Live…). */
  badges?: React.ReactNode;
  /** Action buttons rendered on the trailing side of the header. */
  actions?: React.ReactNode;
  /** Title class overrides (defaults to the shared font-display ramp). */
  titleClassName?: string;
  /** Subtitle class overrides. */
  subtitleClassName?: string;
  /** Outer bar class overrides (padding / shadow variants per shell). */
  className?: string;
}

export const InstitutionPageHeader = ({
  title,
  subtitle,
  icon,
  iconClassName = "bg-primary-500 shadow-xs",
  iconStyle,
  badges,
  actions,
  titleClassName = "font-display text-2xl font-medium tracking-tight text-midnight",
  subtitleClassName = "text-sm text-graphite-500 dark:text-slate-400 font-medium tracking-wide",
  className = "py-4 shadow-2xs",
}: InstitutionPageHeaderProps) => {
  return (
    <div className={`doc-page-header px-4 sm:px-6 ${className}`}>
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className={`h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 ${iconClassName}`}
              style={iconStyle}
            >
              {icon}
            </div>
          )}
          <div>
            <h1 className={`${titleClassName} flex items-center gap-2 flex-wrap`}>
              {title}
              {badges}
            </h1>
            {subtitle && <p className={subtitleClassName}>{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
};

export default InstitutionPageHeader;
