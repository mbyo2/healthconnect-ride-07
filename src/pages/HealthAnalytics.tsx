import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Download, Calendar, Filter, Heart, Activity, Droplet, Weight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useHealthData } from '@/hooks/useHealthData';
import { useAuth } from '@/context/AuthContext';
import { AIInsightsWidget } from '@/components/ai/AIInsightsWidget';

const HealthAnalytics = () => {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState('7days');
    const { heartRateData, activityData, sleepData, vitalsData, loading } = useHealthData(user?.id, timeRange);

    // Fallback data if empty (to show empty charts or skeletons)
    // For now, we'll just let the charts handle empty data or show a message



    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <BarChart3 className="w-8 h-8 text-primary" />
                            </div>
                            Health Data Analytics
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">Comprehensive insights into your health trends</p>
                    </div>
                    <div className="flex gap-3">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[180px] h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7days">Last 7 Days</SelectItem>
                                <SelectItem value="30days">Last 30 Days</SelectItem>
                                <SelectItem value="90days">Last 90 Days</SelectItem>
                                <SelectItem value="1year">Last Year</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" className="h-12 px-6 text-base">
                            <Download className="w-5 h-5 mr-2" />
                            Export Report
                        </Button>
                    </div>
                </div>

                {/* AI Health Insights */}
                <AIInsightsWidget
                    context="health"
                    data={{
                        heartRate: heartRateData,
                        activity: activityData,
                        sleep: sleepData,
                        timeRange
                    }}
                />

                {/* Analytics Tabs */}
                <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
                    <CardHeader>
                        <CardTitle className="text-2xl">Detailed Analytics</CardTitle>
                        <CardDescription className="text-base">Explore your health metrics over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="heart-rate">
                            <TabsList className="grid w-full grid-cols-4 h-12">
                                <TabsTrigger value="heart-rate" className="text-base font-semibold">Heart Rate</TabsTrigger>
                                <TabsTrigger value="activity" className="text-base font-semibold">Activity</TabsTrigger>
                                <TabsTrigger value="sleep" className="text-base font-semibold">Sleep</TabsTrigger>
                                <TabsTrigger value="vitals" className="text-base font-semibold">Vitals</TabsTrigger>
                            </TabsList>

                            <TabsContent value="heart-rate" className="mt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-semibold">Heart Rate Trends</h3>
                                        <div className="flex items-center gap-4 text-sm font-medium">
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
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={heartRateData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={3} name="Average" />
                                            <Line type="monotone" dataKey="min" stroke="#22c55e" strokeWidth={2} name="Min" />
                                            <Line type="monotone" dataKey="max" stroke="#ef4444" strokeWidth={2} name="Max" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </TabsContent>

                            <TabsContent value="activity" className="mt-6">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold">Daily Activity</h3>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart data={activityData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="steps" fill="hsl(var(--primary))" name="Steps" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="calories" fill="#22c55e" name="Calories" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </TabsContent>

                            <TabsContent value="sleep" className="mt-6">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold">Sleep Quality</h3>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <AreaChart data={sleepData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Area type="monotone" dataKey="deep" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Deep Sleep" />
                                            <Area type="monotone" dataKey="light" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" name="Light Sleep" />
                                            <Area type="monotone" dataKey="rem" stackId="1" stroke="#22c55e" fill="#22c55e" name="REM Sleep" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </TabsContent>

                            <TabsContent value="vitals" className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
                                        <CardHeader>
                                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                                <div className="p-2 bg-red-100 dark:bg-red-950/20 rounded-lg">
                                                    <Heart className="w-5 h-5 text-red-500 dark:text-red-400" />
                                                </div>
                                                Blood Pressure
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-bold">{vitalsData.bloodPressure}</div>
                                            <p className="text-sm text-muted-foreground mt-2">mmHg - Normal</p>
                                            <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">↓ 2% from last week</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
                                        <CardHeader>
                                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-950/20 rounded-lg">
                                                    <Droplet className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                                </div>
                                                Oxygen Saturation
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-bold">{vitalsData.oxygenSaturation}</div>
                                            <p className="text-sm text-muted-foreground mt-2">SpO2 - Excellent</p>
                                            <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">Stable</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
                                        <CardHeader>
                                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                                <div className="p-2 bg-purple-100 dark:bg-purple-950/20 rounded-lg">
                                                    <Weight className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                                </div>
                                                Weight
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-bold">{vitalsData.weight}</div>
                                            <p className="text-sm text-muted-foreground mt-2">BMI: 22.5 - Healthy</p>
                                            <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">↓ 0.5 kg this month</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
                                        <CardHeader>
                                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                                <div className="p-2 bg-orange-100 dark:bg-orange-950/20 rounded-lg">
                                                    <Activity className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                                                </div>
                                                Resting Heart Rate
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-bold">{vitalsData.restingHeartRate}</div>
                                            <p className="text-sm text-muted-foreground mt-2">Excellent fitness level</p>
                                            <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">↓ 3 bpm this month</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};

export default HealthAnalytics;
