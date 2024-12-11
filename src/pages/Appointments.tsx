import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";

const Appointments = () => {
  const appointments = [
    {
      doctor: "Dr. Sarah Johnson",
      date: "2024-03-20",
      time: "10:00 AM",
      type: "General Checkup"
    },
    {
      doctor: "Dr. Michael Chen",
      date: "2024-03-22",
      time: "2:30 PM",
      type: "Follow-up"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-14 px-4">
        <h1 className="text-2xl font-bold mb-4">Your Appointments</h1>
        <div className="space-y-4">
          {appointments.map((appointment, index) => (
            <Card key={index} className="p-4">
              <h3 className="font-semibold">{appointment.doctor}</h3>
              <p className="text-gray-600">{appointment.type}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {appointment.date}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {appointment.time}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Appointments;