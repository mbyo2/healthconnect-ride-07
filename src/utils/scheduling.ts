import { addMinutes, format, parse, isWithinInterval } from "date-fns";

export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  duration: number = 30,
  breakStart?: string,
  breakEnd?: string
): string[] => {
  const slots: string[] = [];
  let current = parse(startTime, "HH:mm", new Date());
  const end = parse(endTime, "HH:mm", new Date());

  while (current < end) {
    const timeString = format(current, "HH:mm");
    
    // Skip slots during break time
    if (breakStart && breakEnd) {
      const breakStartTime = parse(breakStart, "HH:mm", new Date());
      const breakEndTime = parse(breakEnd, "HH:mm", new Date());
      
      if (!isWithinInterval(current, { start: breakStartTime, end: breakEndTime })) {
        slots.push(timeString);
      }
    } else {
      slots.push(timeString);
    }
    
    current = addMinutes(current, duration);
  }

  return slots;
};

export const isSlotAvailable = (
  date: Date,
  time: string,
  appointments: any[],
  duration: number = 30
): boolean => {
  const appointmentStart = parse(time, "HH:mm", date);
  const appointmentEnd = addMinutes(appointmentStart, duration);

  return !appointments.some((appointment) => {
    const existingStart = parse(appointment.time, "HH:mm", new Date(appointment.date));
    const existingEnd = addMinutes(existingStart, appointment.duration || 30);

    return (
      (appointmentStart >= existingStart && appointmentStart < existingEnd) ||
      (appointmentEnd > existingStart && appointmentEnd <= existingEnd)
    );
  });
};