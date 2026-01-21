
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Activity, Brain, Baby, Bone, Zap, ShieldAlert, Smile } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
    Smile: <Smile className="h-6 w-6 text-cyan-500" />,
    Zap: <Zap className="h-6 w-6 text-orange-500" />,
    Heart: <Heart className="h-6 w-6 text-red-500" />,
    Brain: <Brain className="h-6 w-6 text-purple-500" />,
    Baby: <Baby className="h-6 w-6 text-blue-500" />,
    Bone: <Bone className="h-6 w-6 text-amber-500" />,
    Activity: <Activity className="h-6 w-6 text-indigo-500" />,
    ShieldAlert: <ShieldAlert className="h-6 w-6 text-rose-500" />,
};

export const SpecializedHelp = () => {
    const navigate = useNavigate();

    const { data: categories, isLoading } = useQuery({
        queryKey: ['specialized-care-categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('specialized_care_categories' as any)
                .select('*')
                .order('display_order');

            if (error) {
                console.error('Error fetching specialized care categories:', error);
                // Fallback to hardcoded values if table doesn't exist
                return [
                    { id: 'dental', name: 'Dental Health', icon_name: 'Smile', color_class: 'bg-cyan-500/10 dark:bg-cyan-500/20', route: '/search?category=dental' },
                    { id: 'skin', name: 'Skin & Hair', icon_name: 'Zap', color_class: 'bg-orange-500/10 dark:bg-orange-500/20', route: '/search?category=skin' },
                    { id: 'heart', name: 'Heart Health', icon_name: 'Heart', color_class: 'bg-red-500/10 dark:bg-red-500/20', route: '/search?category=heart' },
                    { id: 'mental', name: 'Mental Health', icon_name: 'Brain', color_class: 'bg-purple-500/10 dark:bg-purple-500/20', route: '/search?category=mental' },
                    { id: 'pediatrics', name: 'Pediatrics', icon_name: 'Baby', color_class: 'bg-blue-500/10 dark:bg-blue-500/20', route: '/search?category=pediatrics' },
                    { id: 'ortho', name: 'Orthopedics', icon_name: 'Bone', color_class: 'bg-amber-500/10 dark:bg-amber-500/20', route: '/search?category=ortho' },
                    { id: 'neuro', name: 'Neurology', icon_name: 'Activity', color_class: 'bg-indigo-500/10 dark:bg-indigo-500/20', route: '/search?category=neuro' },
                    { id: 'emergency', name: 'Emergency', icon_name: 'ShieldAlert', color_class: 'bg-rose-500/10 dark:bg-rose-500/20', route: '/emergency' },
                ];
            }
            return data;
        }
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto pb-4 no-scrollbar">
            <div className="flex gap-4 min-w-max px-1">
                {categories?.map((category: any) => (
                    <Card
                        key={category.id}
                        className="w-28 h-28 flex-shrink-0 cursor-pointer hover:shadow-lg transition-all duration-300 border border-border shadow-sm hover:-translate-y-1 active:scale-95 group"
                        onClick={() => navigate(category.route)}
                    >
                        <CardContent className={`p-0 h-full flex flex-col items-center justify-center gap-3 rounded-xl transition-colors duration-300 ${category.color_class}`}>
                            <div className="p-2.5 bg-card border border-border rounded-2xl shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-110">
                                {iconMap[category.icon_name] || <Activity className="h-6 w-6" />}
                            </div>
                            <span className="text-[11px] sm:text-xs font-extrabold text-foreground text-center px-2 leading-tight tracking-tight">
                                {category.name}
                            </span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
