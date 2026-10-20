import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { format } from "date-fns";

/**
 * Vitals Flowsheet - Epic parity
 * Displays vital signs in a flowsheet grid: vital types as rows, time points as columns.
 * Standard in hospital EHRs for tracking trends.
 */

interface VitalReading {
  id: string;
  user_id: string;
  recorded_at: string;
  // Vitals are stored in various columns - check actual schema
  [key: string]: any;
}

// Standard vital types with normal ranges and units
// Keys match the actual vital_signs schema column names
const VITAL_TYPES = [
  { key: 'blood_pressure_systolic', label: 'BP Systolic', unit: 'mmHg', normal: [90, 120] },
  { key: 'blood_pressure_diastolic', label: 'BP Diastolic', unit: 'mmHg', normal: [60, 80] },
  { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', normal: [60, 100] },
  { key: 'respiratory_rate', label: 'Resp Rate', unit: '/min', normal: [12, 20] },
  { key: 'temperature', label: 'Temperature', unit: '°C', normal: [36.1, 37.2] },
  { key: 'oxygen_saturation', label: 'SpO2', unit: '%', normal: [95, 100] },
  { key: 'blood_glucose', label: 'Glucose', unit: 'mg/dL', normal: [70, 140] },
  { key: 'weight', label: 'Weight', unit: 'kg', normal: null },
];

function isAbnormal(value: number, normal: [number, number] | null): boolean {
  if (!normal || value == null) return false;
  return value < normal[0] || value > normal[1];
}

export function VitalsFlowsheet({ patientId }: { patientId: string }) {
  const [limit] = useState(10); // Last 10 readings

  const { data: vitals, isLoading } = useQuery({
    queryKey: ['vitals-flowsheet', patientId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('user_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      // Reverse to show oldest first (left to right)
      return ((data as VitalReading[]) || []).reverse();
    },
    enabled: !!patientId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Loading vitals...</div>
        </CardContent>
      </Card>
    );
  }

  if (!vitals || vitals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No vital signs recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Extract vital values - check both direct columns and metadata
  const getVitalValue = (reading: VitalReading, key: string): number | null => {
    // Try direct column first
    if (reading[key] != null) {
      const v = Number(reading[key]);
      if (Number.isFinite(v)) return v;
    }
    // Try metadata JSONB
    if (reading.metadata && typeof reading.metadata === 'object') {
      const meta = reading.metadata as Record<string, any>;
      if (meta[key] != null) {
        const v = Number(meta[key]);
        if (Number.isFinite(v)) return v;
      }
      // Common aliases (for legacy/metadata-stored vitals)
      const aliases: Record<string, string[]> = {
        'blood_pressure_systolic': ['systolic_bp', 'systolic', 'bp_systolic', 'sbp'],
        'blood_pressure_diastolic': ['diastolic_bp', 'diastolic', 'bp_diastolic', 'dbp'],
        'heart_rate': ['hr', 'pulse', 'bpm'],
        'respiratory_rate': ['rr', 'resp_rate'],
        'temperature': ['temp'],
        'oxygen_saturation': ['spo2', 'o2_sat', 'saturation'],
        'blood_glucose': ['glucose', 'bg', 'blood_sugar'],
      };
      for (const alias of (aliases[key] || [])) {
        if (meta[alias] != null) {
          const v = Number(meta[alias]);
          if (Number.isFinite(v)) return v;
        }
      }
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Vitals Flowsheet
          <Badge variant="secondary" className="ml-2">
            {vitals.length} readings
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background min-w-[140px]">
                  Vital
                </TableHead>
                {vitals.map((v) => (
                  <TableHead key={v.id} className="text-center min-w-[90px]">
                    <div className="text-xs font-medium">
                      {format(new Date(v.recorded_at), 'MMM d')}
                    </div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {format(new Date(v.recorded_at), 'HH:mm')}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {VITAL_TYPES.map((vital) => {
                // Only show rows that have at least one value
                const hasData = vitals.some(v => getVitalValue(v, vital.key) != null);
                if (!hasData) return null;
                
                return (
                  <TableRow key={vital.key}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      <div className="text-sm">{vital.label}</div>
                      <div className="text-xs text-muted-foreground">{vital.unit}</div>
                    </TableCell>
                    {vitals.map((reading) => {
                      const value = getVitalValue(reading, vital.key);
                      const abnormal = value != null && isAbnormal(value, vital.normal);
                      return (
                        <TableCell 
                          key={reading.id} 
                          className="text-center"
                        >
                          {value != null ? (
                            <span className={
                              abnormal 
                                ? "font-semibold text-destructive" 
                                : "text-foreground"
                            }>
                              {value}
                              {abnormal && " ⚠"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          ⚠ indicates value outside normal range. Red values need clinical attention.
        </p>
      </CardContent>
    </Card>
  );
}
