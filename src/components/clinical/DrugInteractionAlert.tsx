import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Ban, Info, ShieldAlert } from 'lucide-react';
import { checkDrugInteractions, checkDrugRiskLevel } from './AllergyAlertSystem';

interface DrugRisk {
  drug_name: string;
  risk_level: string;
  risk_category: string;
  special_instructions: string;
}

interface Interaction {
  drug_a: string;
  drug_b: string;
  severity: string;
  description: string;
  management: string;
}

interface Props {
  prescribedDrugs: string[];
}

const severityColors: Record<string, string> = {
  contraindicated: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  severe: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  moderate: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  mild: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
};

const riskColors: Record<string, string> = {
  high_risk: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  emergency_risk: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export const DrugInteractionAlert = ({ prescribedDrugs }: Props) => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [riskDrugs, setRiskDrugs] = useState<DrugRisk[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prescribedDrugs.length === 0) return;

    const check = async () => {
      setLoading(true);
      try {
        const [interactionResults, ...riskResults] = await Promise.all([
          checkDrugInteractions(prescribedDrugs),
          ...prescribedDrugs.map(d => checkDrugRiskLevel(d)),
        ]);
        setInteractions(interactionResults);
        setRiskDrugs(riskResults.filter(Boolean) as DrugRisk[]);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [prescribedDrugs]);

  if (loading || (interactions.length === 0 && riskDrugs.length === 0)) return null;

  return (
    <div className="space-y-3">
      {/* Drug Interactions */}
      {interactions.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <Ban className="h-4 w-4" /> Drug Interactions Detected ({interactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {interactions.map((i, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${severityColors[i.severity] || severityColors.moderate}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">{i.severity}</span>
                  <span className="text-xs font-semibold">{i.drug_a} ↔ {i.drug_b}</span>
                </div>
                <p className="text-xs">{i.description}</p>
                {i.management && (
                  <p className="text-xs mt-1 font-medium">
                    <Info className="h-3 w-3 inline mr-1" />
                    {i.management}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* High-Risk Drug Alerts */}
      {riskDrugs.length > 0 && (
        <Card className="border-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" /> High-Risk Medications ({riskDrugs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {riskDrugs.map((d, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${riskColors[d.risk_level] || ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive" className="text-[10px] uppercase">{d.risk_level.replace('_', ' ')}</Badge>
                  <span className="text-xs font-semibold">{d.drug_name}</span>
                  {d.risk_category && <Badge variant="outline" className="text-[10px]">{d.risk_category}</Badge>}
                </div>
                <p className="text-xs">{d.special_instructions}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
