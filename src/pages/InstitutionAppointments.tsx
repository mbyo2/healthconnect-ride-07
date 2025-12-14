
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const InstitutionAppointments = () => {
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Appointments</h1>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-6 w-6" />
                        Scheduled Appointments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Appointment management module coming soon.</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default InstitutionAppointments;
