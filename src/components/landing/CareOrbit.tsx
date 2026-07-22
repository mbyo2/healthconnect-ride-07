import { type PointerEvent, useState } from "react";
import { Activity, HeartPulse, Pill, Stethoscope, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const orbitItems = [
  { label: "Find care", icon: Stethoscope, route: "/search", position: "left-0 top-12" },
  { label: "Video visit", icon: Video, route: "/search?type=telehealth", position: "right-0 top-5" },
  { label: "Pharmacy", icon: Pill, route: "/search?type=pharmacy", position: "right-4 bottom-8" },
  { label: "Health records", icon: Activity, route: "/auth?tab=signup", position: "bottom-0 left-8" },
];

export const CareOrbit = () => {
  const navigate = useNavigate();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - bounds.top) / bounds.height - 0.5) * -12,
      y: ((event.clientX - bounds.left) / bounds.width - 0.5) * 14,
    });
  };

  const openCarePath = (label: string, route: string) => {
    toast.success(`${label} selected`, { description: "Taking you to the right place." });
    navigate(route);
  };

  return (
    <div
      className="relative mx-auto h-[330px] w-full max-w-md select-none [perspective:1000px] sm:h-[380px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div
        className="absolute inset-8 rounded-[2.25rem] border border-primary/15 bg-gradient-to-br from-primary/15 via-background to-cyan-400/10 shadow-2xl shadow-primary/10 transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div className="absolute inset-6 rounded-[1.8rem] border border-primary/10 bg-card/80 backdrop-blur-sm [transform:translateZ(28px)]" />
        <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-xl shadow-primary/30 [transform:translateZ(55px)]">
          <HeartPulse className="h-12 w-12" aria-hidden="true" />
        </div>
        <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/30 [transform:translateZ(20px)]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 [transform:translateZ(6px)]" />
      </div>

      {orbitItems.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => openCarePath(item.label, item.route)}
          className={`absolute z-10 inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-card/95 px-3 py-2 text-left text-xs font-semibold shadow-lg shadow-primary/10 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.position}`}
        >
          <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
          {item.label}
        </button>
      ))}
    </div>
  );
};
