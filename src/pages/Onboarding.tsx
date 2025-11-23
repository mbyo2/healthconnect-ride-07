// TODO: Implement onboarding flow with gamification (badges, streaks)
// TODO: Personalize onboarding based on user type
import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Onboarding = () => {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold text-primary">Welcome to HealthConnect</CardTitle>
                    <CardDescription>
                        Let's get you set up with your personal health profile.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfileSetup />
                </CardContent>
            </Card>
        </div>
    );
};

export default Onboarding;