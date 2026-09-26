import { ChevronRight } from "lucide-react";
import { providerDisplayName } from "@/utils/providerDisplay";

interface AvailableDoctorsRailProps {
  providers: any[];
  onViewAll: () => void;
  onViewProvider: (id: string) => void;
}

/**
 * "Available Doctors" rail — verified providers from the public directory.
 * Rendered on /home for every patient, including those still in the
 * onboarding-checklist state: discovery and booking must never be gated
 * behind profile completeness.
 */
export const AvailableDoctorsRail = ({ providers, onViewAll, onViewProvider }: AvailableDoctorsRailProps) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Available Providers</h2>
          <p className="text-xs text-slate-400 font-medium">Verified providers — open a profile to see live slots</p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-black text-primary-500 hover:underline flex items-center gap-1 px-2 py-2 -mr-2 min-h-[40px]"
        >
          <span>View all</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 text-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No verified providers listed yet.</p>
          <p className="text-xs text-slate-500 mt-1">Search the full directory to find care near you.</p>
          <button
            onClick={onViewAll}
            className="mt-3 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-black text-xs transition-all"
          >
            Search doctors
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((doc: any) => (
            <div
              key={doc.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-3.5">
                {doc.avatar_url ? (
                  <img
                    src={doc.avatar_url}
                    alt={`${doc.first_name || ''} ${doc.last_name || ''}`.trim() || 'Provider photo'}
                    className="h-12 w-12 rounded-2xl object-cover ring-2 ring-primary-500/30"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-blue-950/50 text-primary-500 flex items-center justify-center font-black text-lg ring-2 ring-primary-500/30" aria-hidden>
                    {(doc.first_name?.[0] || 'D')}{(doc.last_name?.[0] || '')}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                    {providerDisplayName({ first_name: doc.first_name, last_name: doc.last_name, role: doc.role })}
                  </h3>
                  <p className="text-xs text-primary-500 font-extrabold">{doc.specialty || 'General Practice'}</p>
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {doc.consultation_fee_min ? `From K${doc.consultation_fee_min}` : 'Fee on request'}
                  </p>
                </div>
              </div>

              <div className="pt-1 border-t border-canvas-silk dark:border-slate-800">
                <button
                  onClick={() => onViewProvider(doc.id)}
                  className="w-full px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-black text-xs flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95 min-h-[44px]"
                >
                  <span>View &amp; book</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
