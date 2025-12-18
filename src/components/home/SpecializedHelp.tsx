
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Activity, Brain, Baby, Bone, Zap, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

const categories = [
    { id: 'skin', name: 'Skin & Hair', icon: <Zap className="h-6 w-6 text-orange-500" />, color: 'bg-orange-50' },
    { id: 'heart', name: 'Heart Health', icon: <Heart className="h-6 w-6 text-red-500" />, color: 'bg-red-50' },
    { id: 'mental', name: 'Mental Health', icon: <Brain className="h-6 w-6 text-purple-500" />, color: 'bg-purple-50' },
    { id: 'pediatrics', name: 'Pediatrics', icon: <Baby className="h-6 w-6 text-blue-500" />, color: 'bg-blue-50' },
    { id: 'ortho', name: 'Orthopedics', icon: <Bone className="h-6 w-6 text-amber-500" />, color: 'bg-amber-50' },
    { id: 'neuro', name: 'Neurology', icon: <Activity className="h-6 w-6 text-indigo-500" />, color: 'bg-indigo-50' },
    { id: 'emergency', name: 'Emergency', icon: <ShieldAlert className="h-6 w-6 text-rose-500" />, color: 'bg-rose-50' },
];

export const SpecializedHelp = () => {
    const navigate = useNavigate();

    return (
        <div className="w-full overflow-x-auto pb-4 no-scrollbar">
            <div className="flex gap-4 min-w-max px-1">
                {categories.map((category) => (
                    <Card
                        key={category.id}
                        className="w-28 h-28 flex-shrink-0 cursor-pointer hover:shadow-md transition-all border-none shadow-sm"
                        onClick={() => {
                            if (category.id === 'emergency') {
                                navigate('/emergency');
                            } else {
                                navigate(`/search?category=${category.id}`);
                            }
                        }}
                    >
                        <CardContent className={`p-0 h-full flex flex-col items-center justify-center gap-3 rounded-xl ${category.color}`}>
                            <div className="p-2 bg-white rounded-full shadow-sm">
                                {category.icon}
                            </div>
                            <span className="text-[10px] font-bold text-gray-700 text-center px-2 leading-tight">
                                {category.name}
                            </span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
