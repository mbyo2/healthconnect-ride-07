import React from "react";

export const Procurement = ({ hospital }: { hospital: any }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">Procurement (Debug)</h2>
      <p className="text-sm">Hospital: {hospital?.name || "none"}</p>
      <p className="text-xs text-graphite-500">Minimal version for debugging React #130</p>
    </div>
  );
};
