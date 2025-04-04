
export const appointmentReminderTemplate = (appointment: {
  date: string;
  time: string;
  provider: { first_name: string; last_name: string };
}) => `
<h2>Appointment Reminder</h2>
<p>This is a reminder for your upcoming appointment:</p>
<ul>
  <li>Date: ${appointment.date}</li>
  <li>Time: ${appointment.time}</li>
  <li>Provider: Dr. ${appointment.provider.first_name} ${appointment.provider.last_name}</li>
</ul>
<p>Please arrive 10 minutes before your scheduled time.</p>
`;

export const paymentConfirmationTemplate = (payment: {
  amount: number;
  date: string;
  service: string;
}) => `
<h2>Payment Confirmation</h2>
<p>Thank you for your payment:</p>
<ul>
  <li>Amount: $${payment.amount}</li>
  <li>Date: ${payment.date}</li>
  <li>Service: ${payment.service}</li>
</ul>
`;

export const registrationConfirmationTemplate = (user: {
  first_name: string;
}) => `
<h2>Welcome to Doc' O Clock!</h2>
<p>Dear ${user.first_name},</p>
<p>Thank you for registering with Doc' O Clock. Your account has been successfully created.</p>
<p>You can now:</p>
<ul>
  <li>Book appointments with healthcare providers</li>
  <li>Access your medical records</li>
  <li>Track your health metrics</li>
  <li>Communicate with your healthcare team</li>
</ul>
`;
