import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";

const Onboarding = () => {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl border-primary/20 shadow-xl">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <AppLogo size="lg" className="p-4 bg-primary/10 rounded-2xl border border-primary/20" />
                    </div>
                    <div className="flex justify-center">
                        <Badge variant="secondary" className="px-4 py-1 text-sm gap-2 animate-in fade-in zoom-in duration-500">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span>Welcome to Doc' O Clock</span>
                        </Badge>
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold text-primary">Set Up Your Profile</CardTitle>
                        <CardDescription className="text-lg mt-2">
                            Complete your profile to unlock your personalized healthcare experience.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <ProfileSetup />
                </CardContent>
            </Card>
        </div>
    );
};

export default Onboarding;
