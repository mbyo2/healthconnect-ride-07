
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const InstitutionPatients = () => {
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Patients</h1>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Patient List
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Patient management module coming soon.</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default InstitutionPatients;
