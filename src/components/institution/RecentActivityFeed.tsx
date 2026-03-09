import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, UserPlus, Calendar, Bed, FileText, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'admission' | 'discharge' | 'appointment' | 'staff_join' | 'alert' | 'report';
  title: string;
  description: string;
  timestamp: string;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

const typeConfig = {
  admission: { icon: Bed, color: 'text-blue-500', badge: 'Admission' },
  discharge: { icon: FileText, color: 'text-green-500', badge: 'Discharge' },
  appointment: { icon: Calendar, color: 'text-purple-500', badge: 'Appointment' },
  staff_join: { icon: UserPlus, color: 'text-emerald-500', badge: 'Staff' },
  alert: { icon: AlertTriangle, color: 'text-amber-500', badge: 'Alert' },
  report: { icon: Activity, color: 'text-muted-foreground', badge: 'Report' },
};

export const RecentActivityFeed = ({ activities }: RecentActivityFeedProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-4 pb-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activities.map((item) => {
                const config = typeConfig[item.type];
                const Icon = config.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{config.badge}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
