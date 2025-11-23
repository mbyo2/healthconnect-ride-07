import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Download, Calendar, Filter, Heart, Activity, Droplet, Weight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useHealthData } from '@/hooks/useHealthData';
import { useAuth } from '@/hooks/useAuth';

const HealthAnalytics = () => {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState('7days');
    const { heartRateData, activityData, sleepData, loading } = useHealthData(user?.id, timeRange);

    // Fallback data if empty (to show empty charts or skeletons)
    // For now, we'll just let the charts handle empty data or show a message


    const insights = [
        {
            title: 'Heart Rate Improving',
            description: 'Your resting heart rate has decreased by 3% this week, indicating improved cardiovascular fitness.',
            trend: 'positive',
            metric: '-3%'
        },
        {
            title: 'Activity Goal Achieved',
            description: 'You\'ve exceeded your daily step goal 5 out of 7 days this week. Great job!',
            trend: 'positive',
            metric: '71%'
        },
        {
            title: 'Sleep Pattern Stable',
            description: 'Your sleep duration is consistent. Consider maintaining this routine for optimal rest.',
            trend: 'neutral',
            metric: '7.7h avg'
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-green-50/20 to-background p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                            <BarChart3 className="w-10 h-10 text-green-600" />
                            Health Data Analytics
                        </h1>
                        <p className="text-muted-foreground mt-1">Comprehensive insights into your health trends</p>
                    </div>
                    <div className="flex gap-3">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7days">Last 7 Days</SelectItem>
                                <SelectItem value="30days">Last 30 Days</SelectItem>
                                <SelectItem value="90days">Last 90 Days</SelectItem>
                                <SelectItem value="1year">Last Year</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Export Report
                        </Button>
                    </div>
                </div>

                {/* Key Insights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insights.map((insight, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold">{insight.title}</h3>
                                    <span className={`text-lg font-bold ${insight.trend === 'positive' ? 'text-green-600' :
                                        insight.trend === 'negative' ? 'text-red-600' : 'text-blue-600'
                                        }`}>
                                        {insight.metric}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{insight.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Analytics Tabs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Analytics</CardTitle>
                        <CardDescription>Explore your health metrics over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="heart-rate">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="heart-rate">Heart Rate</TabsTrigger>
                                <TabsTrigger value="activity">Activity</TabsTrigger>
                                <TabsTrigger value="sleep">Sleep</TabsTrigger>
                                <TabsTrigger value="vitals">Vitals</TabsTrigger>
                            </TabsList>

                            <TabsContent value="heart-rate" className="mt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Heart Rate Trends</h3>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                <span>Average</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                <span>Min</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span>Max</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <LineChart data={heartRateData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} name="Average" />
                                            <Line type="monotone" dataKey="min" stroke="#22c55e" strokeWidth={1} name="Min" />
                                            <Line type="monotone" dataKey="max" stroke="#ef4444" strokeWidth={1} name="Max" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </TabsContent>

                            <TabsContent value="activity" className="mt-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Daily Activity</h3>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <BarChart data={activityData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="steps" fill="#3b82f6" name="Steps" />
                                            <Bar dataKey="calories" fill="#22c55e" name="Calories" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </TabsContent>

                            <TabsContent value="sleep" className="mt-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Sleep Quality</h3>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <AreaChart data={sleepData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Area type="monotone" dataKey="deep" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Deep Sleep" />
                                            <Area type="monotone" dataKey="light" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Light Sleep" />
                                            <Area type="monotone" dataKey="rem" stackId="1" stroke="#22c55e" fill="#22c55e" name="REM Sleep" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </TabsContent>

                            <TabsContent value="vitals" className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Heart className="w-4 h-4 text-red-500" />
                                                Blood Pressure
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">120/80</div>
                                            <p className="text-sm text-muted-foreground mt-1">mmHg - Normal</p>
                                            <p className="text-xs text-green-600 mt-2">↓ 2% from last week</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Droplet className="w-4 h-4 text-blue-500" />
                                                Oxygen Saturation
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">98%</div>
                                            <p className="text-sm text-muted-foreground mt-1">SpO2 - Excellent</p>
                                            <p className="text-xs text-green-600 mt-2">Stable</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Weight className="w-4 h-4 text-purple-500" />
                                                Weight
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">70 kg</div>
                                            <p className="text-sm text-muted-foreground mt-1">BMI: 22.5 - Healthy</p>
                                            <p className="text-xs text-green-600 mt-2">↓ 0.5 kg this month</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-orange-500" />
                                                Resting Heart Rate
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">62 bpm</div>
                                            <p className="text-sm text-muted-foreground mt-1">Excellent fitness level</p>
                                            <p className="text-xs text-green-600 mt-2">↓ 3 bpm this month</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-green-100">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Personalized Recommendations</h3>
                                <ul className="mt-3 space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600">•</span>
                                        <span>Continue your current exercise routine - your cardiovascular health is improving</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600">•</span>
                                        <span>Try to maintain consistent sleep schedule - your body responds well to routine</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-600">•</span>
                                        <span>Consider adding strength training 2-3 times per week for balanced fitness</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default HealthAnalytics;
