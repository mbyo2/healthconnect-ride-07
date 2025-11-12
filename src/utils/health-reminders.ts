import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { errorHandler } from './error-handler';
import { securityNotificationService } from './security-notifications';

export interface HealthReminder {
  id: string;
  userId: string;
  type: 'medication' | 'appointment' | 'vitals' | 'exercise' | 'screening' | 'follow_up';
  title: string;
  description: string;
  scheduledTime: Date;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  customSchedule?: string; // Cron-like expression
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    medicationId?: string;
    appointmentId?: string;
    dosage?: string;
    instructions?: string;
    [key: string]: any;
  };
  createdAt: Date;
  lastTriggered?: Date;
  nextTrigger: Date;
}

export interface MedicationAlert {
  id: string;
  userId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  times: string[]; // Array of times like ["08:00", "20:00"]
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  adherenceTracking: boolean;
  missedDoses: number;
  totalDoses: number;
  lastTaken?: Date;
  sideEffectsToWatch: string[];
  interactions: string[];
}

export interface ReminderNotification {
  id: string;
  reminderId: string;
  userId: string;
  type: 'push' | 'email' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

class HealthRemindersService {
  private activeReminders: Map<string, HealthReminder> = new Map();
  private medicationAlerts: Map<string, MedicationAlert> = new Map();
  private reminderTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      await this.loadActiveReminders();
      await this.loadMedicationAlerts();
      this.scheduleNextReminders();
      
      logger.info('Health reminders service initialized', 'HEALTH_REMINDERS');
    } catch (error) {
      errorHandler.handleError(error, 'initializeHealthReminders');
    }
  }

  private async loadActiveReminders(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('health_reminders')
        .select('*')
        .eq('is_active', true)
        .gte('next_trigger', new Date().toISOString());

      if (error) throw error;

      data?.forEach(reminder => {
        const healthReminder: HealthReminder = {
          id: reminder.id,
          userId: reminder.user_id,
          type: reminder.type,
          title: reminder.title,
          description: reminder.description,
          scheduledTime: new Date(reminder.scheduled_time),
          frequency: reminder.frequency,
          customSchedule: reminder.custom_schedule,
          isActive: reminder.is_active,
          priority: reminder.priority,
          metadata: reminder.metadata || {},
          createdAt: new Date(reminder.created_at),
          lastTriggered: reminder.last_triggered ? new Date(reminder.last_triggered) : undefined,
          nextTrigger: new Date(reminder.next_trigger)
        };

        this.activeReminders.set(reminder.id, healthReminder);
      });

      logger.info(`Loaded ${this.activeReminders.size} active reminders`, 'HEALTH_REMINDERS');
    } catch (error) {
      logger.error('Failed to load active reminders', 'HEALTH_REMINDERS', error);
    }
  }

  private async loadMedicationAlerts(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('medication_alerts')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      data?.forEach(alert => {
        const medicationAlert: MedicationAlert = {
          id: alert.id,
          userId: alert.user_id,
          medicationId: alert.medication_id,
          medicationName: alert.medication_name,
          dosage: alert.dosage,
          frequency: alert.frequency,
          times: alert.times || [],
          startDate: new Date(alert.start_date),
          endDate: alert.end_date ? new Date(alert.end_date) : undefined,
          isActive: alert.is_active,
          adherenceTracking: alert.adherence_tracking,
          missedDoses: alert.missed_doses || 0,
          totalDoses: alert.total_doses || 0,
          lastTaken: alert.last_taken ? new Date(alert.last_taken) : undefined,
          sideEffectsToWatch: alert.side_effects_to_watch || [],
          interactions: alert.interactions || []
        };

        this.medicationAlerts.set(alert.id, medicationAlert);
      });

      logger.info(`Loaded ${this.medicationAlerts.size} medication alerts`, 'HEALTH_REMINDERS');
    } catch (error) {
      logger.error('Failed to load medication alerts', 'HEALTH_REMINDERS', error);
    }
  }

  async createReminder(reminder: Omit<HealthReminder, 'id' | 'createdAt' | 'nextTrigger'>): Promise<HealthReminder> {
    try {
      const newReminder: HealthReminder = {
        ...reminder,
        id: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        nextTrigger: this.calculateNextTrigger(reminder.scheduledTime, reminder.frequency, reminder.customSchedule)
      };

      // Store in database
      const { error } = await supabase
        .from('health_reminders')
        .insert({
          id: newReminder.id,
          user_id: newReminder.userId,
          type: newReminder.type,
          title: newReminder.title,
          description: newReminder.description,
          scheduled_time: newReminder.scheduledTime.toISOString(),
          frequency: newReminder.frequency,
          custom_schedule: newReminder.customSchedule,
          is_active: newReminder.isActive,
          priority: newReminder.priority,
          metadata: newReminder.metadata,
          created_at: newReminder.createdAt.toISOString(),
          next_trigger: newReminder.nextTrigger.toISOString()
        });

      if (error) throw error;

      // Add to active reminders
      this.activeReminders.set(newReminder.id, newReminder);
      
      // Schedule the reminder
      this.scheduleReminder(newReminder);

      logger.info('Health reminder created', 'HEALTH_REMINDERS', {
        id: newReminder.id,
        type: newReminder.type,
        nextTrigger: newReminder.nextTrigger
      });

      return newReminder;
    } catch (error) {
      errorHandler.handleError(error, 'createReminder');
      throw error;
    }
  }

  async createMedicationAlert(alert: Omit<MedicationAlert, 'id'>): Promise<MedicationAlert> {
    try {
      const newAlert: MedicationAlert = {
        ...alert,
        id: `med-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      // Store in database
      const { error } = await supabase
        .from('medication_alerts')
        .insert({
          id: newAlert.id,
          user_id: newAlert.userId,
          medication_id: newAlert.medicationId,
          medication_name: newAlert.medicationName,
          dosage: newAlert.dosage,
          frequency: newAlert.frequency,
          times: newAlert.times,
          start_date: newAlert.startDate.toISOString(),
          end_date: newAlert.endDate?.toISOString(),
          is_active: newAlert.isActive,
          adherence_tracking: newAlert.adherenceTracking,
          missed_doses: newAlert.missedDoses,
          total_doses: newAlert.totalDoses,
          last_taken: newAlert.lastTaken?.toISOString(),
          side_effects_to_watch: newAlert.sideEffectsToWatch,
          interactions: newAlert.interactions
        });

      if (error) throw error;

      // Add to active alerts
      this.medicationAlerts.set(newAlert.id, newAlert);
      
      // Create reminders for each scheduled time
      await this.createMedicationReminders(newAlert);

      logger.info('Medication alert created', 'HEALTH_REMINDERS', {
        id: newAlert.id,
        medication: newAlert.medicationName,
        times: newAlert.times
      });

      return newAlert;
    } catch (error) {
      errorHandler.handleError(error, 'createMedicationAlert');
      throw error;
    }
  }

  private async createMedicationReminders(alert: MedicationAlert): Promise<void> {
    for (const time of alert.times) {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (scheduledTime <= new Date()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      await this.createReminder({
        userId: alert.userId,
        type: 'medication',
        title: `Take ${alert.medicationName}`,
        description: `Time to take your ${alert.dosage} of ${alert.medicationName}`,
        scheduledTime,
        frequency: 'daily',
        isActive: true,
        priority: 'high',
        metadata: {
          medicationId: alert.medicationId,
          medicationAlertId: alert.id,
          dosage: alert.dosage,
          sideEffectsToWatch: alert.sideEffectsToWatch,
          interactions: alert.interactions
        }
      });
    }
  }

  private calculateNextTrigger(scheduledTime: Date, frequency: string, customSchedule?: string): Date {
    const now = new Date();
    let nextTrigger = new Date(scheduledTime);

    switch (frequency) {
      case 'once':
        return nextTrigger > now ? nextTrigger : scheduledTime;
      
      case 'daily':
        while (nextTrigger <= now) {
          nextTrigger.setDate(nextTrigger.getDate() + 1);
        }
        break;
      
      case 'weekly':
        while (nextTrigger <= now) {
          nextTrigger.setDate(nextTrigger.getDate() + 7);
        }
        break;
      
      case 'monthly':
        while (nextTrigger <= now) {
          nextTrigger.setMonth(nextTrigger.getMonth() + 1);
        }
        break;
      
      case 'custom':
        if (customSchedule) {
          // Simple cron-like parsing (would use proper cron library in production)
          nextTrigger = this.parseCustomSchedule(customSchedule, now);
        }
        break;
    }

    return nextTrigger;
  }

  private parseCustomSchedule(schedule: string, from: Date): Date {
    // Simplified custom schedule parsing
    // Format: "0 8,20 * * *" (minute hour day month dayOfWeek)
    const parts = schedule.split(' ');
    if (parts.length !== 5) return new Date(from.getTime() + 24 * 60 * 60 * 1000);

    const [minute, hour] = parts;
    const hours = hour.split(',').map(Number);
    const nextTrigger = new Date(from);
    
    // Find next occurrence
    for (const h of hours) {
      const candidate = new Date(from);
      candidate.setHours(h, parseInt(minute), 0, 0);
      
      if (candidate > from) {
        return candidate;
      }
    }
    
    // If no time today, try tomorrow
    const tomorrow = new Date(from);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours[0], parseInt(minute), 0, 0);
    
    return tomorrow;
  }

  private scheduleNextReminders(): void {
    this.activeReminders.forEach(reminder => {
      this.scheduleReminder(reminder);
    });
  }

  private scheduleReminder(reminder: HealthReminder): void {
    const now = new Date();
    const timeUntilTrigger = reminder.nextTrigger.getTime() - now.getTime();

    if (timeUntilTrigger <= 0) {
      // Trigger immediately if overdue
      this.triggerReminder(reminder);
    } else if (timeUntilTrigger <= 24 * 60 * 60 * 1000) {
      // Schedule if within 24 hours
      const timer = setTimeout(() => {
        this.triggerReminder(reminder);
      }, timeUntilTrigger);

      this.reminderTimers.set(reminder.id, timer);
    }
  }

  private async triggerReminder(reminder: HealthReminder): Promise<void> {
    try {
      logger.info('Triggering reminder', 'HEALTH_REMINDERS', {
        id: reminder.id,
        type: reminder.type,
        title: reminder.title
      });

      // Send notifications
      await this.sendReminderNotifications(reminder);

      // Update reminder
      reminder.lastTriggered = new Date();
      
      if (reminder.frequency !== 'once') {
        reminder.nextTrigger = this.calculateNextTrigger(
          reminder.scheduledTime,
          reminder.frequency,
          reminder.customSchedule
        );
        
        // Schedule next occurrence
        this.scheduleReminder(reminder);
      } else {
        reminder.isActive = false;
        this.activeReminders.delete(reminder.id);
      }

      // Update in database
      await this.updateReminderInDatabase(reminder);

      // Handle medication-specific logic
      if (reminder.type === 'medication') {
        await this.handleMedicationReminder(reminder);
      }

    } catch (error) {
      errorHandler.handleError(error, 'triggerReminder');
    }
  }

  private async sendReminderNotifications(reminder: HealthReminder): Promise<void> {
    try {
      // Create in-app notification
      await securityNotificationService.createSecurityNotification(
        reminder.userId,
        'suspicious_activity',
        reminder.title,
        reminder.description
      );

      // Send push notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(reminder.title, {
          body: reminder.description,
          icon: '/logo192.png',
          tag: `reminder-${reminder.id}`,
          requireInteraction: reminder.priority === 'critical'
        });
      }

      // Store notification record
      const notification: ReminderNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        reminderId: reminder.id,
        userId: reminder.userId,
        type: 'in_app',
        status: 'sent',
        sentAt: new Date(),
        acknowledged: false
      };

      await this.storeNotification(notification);

    } catch (error) {
      logger.error('Failed to send reminder notifications', 'HEALTH_REMINDERS', error);
    }
  }

  private async handleMedicationReminder(reminder: HealthReminder): Promise<void> {
    try {
      const alertId = reminder.metadata.medicationAlertId;
      if (!alertId) return;

      const alert = this.medicationAlerts.get(alertId);
      if (!alert) return;

      // Increment total doses
      alert.totalDoses++;

      // Check for adherence issues
      const adherenceRate = ((alert.totalDoses - alert.missedDoses) / alert.totalDoses) * 100;
      
      if (adherenceRate < 80 && alert.adherenceTracking) {
        await this.createAdherenceAlert(alert, adherenceRate);
      }

      // Check for potential interactions or side effects
      if (alert.interactions.length > 0 || alert.sideEffectsToWatch.length > 0) {
        await this.createSafetyReminder(alert);
      }

      // Update alert in database
      await this.updateMedicationAlert(alert);

    } catch (error) {
      logger.error('Failed to handle medication reminder', 'HEALTH_REMINDERS', error);
    }
  }

  private async createAdherenceAlert(alert: MedicationAlert, adherenceRate: number): Promise<void> {
    await this.createReminder({
      userId: alert.userId,
      type: 'follow_up',
      title: 'Medication Adherence Alert',
      description: `Your adherence rate for ${alert.medicationName} is ${Math.round(adherenceRate)}%. Consider speaking with your healthcare provider.`,
      scheduledTime: new Date(),
      frequency: 'once',
      isActive: true,
      priority: 'high',
      metadata: {
        medicationId: alert.medicationId,
        adherenceRate,
        alertType: 'adherence'
      }
    });
  }

  private async createSafetyReminder(alert: MedicationAlert): Promise<void> {
    const safetyInfo = [];
    
    if (alert.sideEffectsToWatch.length > 0) {
      safetyInfo.push(`Watch for: ${alert.sideEffectsToWatch.join(', ')}`);
    }
    
    if (alert.interactions.length > 0) {
      safetyInfo.push(`Interactions: ${alert.interactions.join(', ')}`);
    }

    if (safetyInfo.length > 0) {
      await this.createReminder({
        userId: alert.userId,
        type: 'medication',
        title: `${alert.medicationName} Safety Information`,
        description: safetyInfo.join('. '),
        scheduledTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes after taking
        frequency: 'once',
        isActive: true,
        priority: 'medium',
        metadata: {
          medicationId: alert.medicationId,
          alertType: 'safety'
        }
      });
    }
  }

  async markMedicationTaken(alertId: string, takenAt: Date = new Date()): Promise<void> {
    try {
      const alert = this.medicationAlerts.get(alertId);
      if (!alert) throw new Error('Medication alert not found');

      alert.lastTaken = takenAt;
      
      // Update adherence tracking
      if (alert.adherenceTracking) {
        const timeDiff = Math.abs(takenAt.getTime() - new Date().getTime());
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // Consider it missed if taken more than 2 hours late
        if (hoursDiff > 2) {
          alert.missedDoses++;
        }
      }

      await this.updateMedicationAlert(alert);

      logger.info('Medication marked as taken', 'HEALTH_REMINDERS', {
        alertId,
        medication: alert.medicationName,
        takenAt
      });
    } catch (error) {
      errorHandler.handleError(error, 'markMedicationTaken');
    }
  }

  async snoozeReminder(reminderId: string, snoozeMinutes: number = 15): Promise<void> {
    try {
      const reminder = this.activeReminders.get(reminderId);
      if (!reminder) throw new Error('Reminder not found');

      // Clear existing timer
      const existingTimer = this.reminderTimers.get(reminderId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Update next trigger
      reminder.nextTrigger = new Date(Date.now() + snoozeMinutes * 60 * 1000);
      
      // Schedule new timer
      this.scheduleReminder(reminder);
      
      // Update in database
      await this.updateReminderInDatabase(reminder);

      logger.info('Reminder snoozed', 'HEALTH_REMINDERS', {
        reminderId,
        snoozeMinutes,
        nextTrigger: reminder.nextTrigger
      });
    } catch (error) {
      errorHandler.handleError(error, 'snoozeReminder');
    }
  }

  async acknowledgeReminder(reminderId: string): Promise<void> {
    try {
      const reminder = this.activeReminders.get(reminderId);
      if (!reminder) throw new Error('Reminder not found');

      // Mark as acknowledged in notifications
      const { error } = await supabase
        .from('reminder_notifications')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('reminder_id', reminderId);

      if (error) throw error;

      logger.info('Reminder acknowledged', 'HEALTH_REMINDERS', { reminderId });
    } catch (error) {
      errorHandler.handleError(error, 'acknowledgeReminder');
    }
  }

  private async updateReminderInDatabase(reminder: HealthReminder): Promise<void> {
    try {
      const { error } = await supabase
        .from('health_reminders')
        .update({
          last_triggered: reminder.lastTriggered?.toISOString(),
          next_trigger: reminder.nextTrigger.toISOString(),
          is_active: reminder.isActive
        })
        .eq('id', reminder.id);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to update reminder in database', 'HEALTH_REMINDERS', error);
    }
  }

  private async updateMedicationAlert(alert: MedicationAlert): Promise<void> {
    try {
      const { error } = await supabase
        .from('medication_alerts')
        .update({
          missed_doses: alert.missedDoses,
          total_doses: alert.totalDoses,
          last_taken: alert.lastTaken?.toISOString()
        })
        .eq('id', alert.id);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to update medication alert', 'HEALTH_REMINDERS', error);
    }
  }

  private async storeNotification(notification: ReminderNotification): Promise<void> {
    try {
      const { error } = await supabase
        .from('reminder_notifications')
        .insert({
          id: notification.id,
          reminder_id: notification.reminderId,
          user_id: notification.userId,
          type: notification.type,
          status: notification.status,
          sent_at: notification.sentAt?.toISOString(),
          delivered_at: notification.deliveredAt?.toISOString(),
          acknowledged: notification.acknowledged,
          acknowledged_at: notification.acknowledgedAt?.toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to store notification', 'HEALTH_REMINDERS', error);
    }
  }

  async getUserReminders(userId: string): Promise<HealthReminder[]> {
    return Array.from(this.activeReminders.values())
      .filter(reminder => reminder.userId === userId)
      .sort((a, b) => a.nextTrigger.getTime() - b.nextTrigger.getTime());
  }

  async getUserMedicationAlerts(userId: string): Promise<MedicationAlert[]> {
    return Array.from(this.medicationAlerts.values())
      .filter(alert => alert.userId === userId && alert.isActive);
  }

  async deactivateReminder(reminderId: string): Promise<void> {
    try {
      const reminder = this.activeReminders.get(reminderId);
      if (reminder) {
        reminder.isActive = false;
        await this.updateReminderInDatabase(reminder);
        this.activeReminders.delete(reminderId);
      }

      // Clear timer
      const timer = this.reminderTimers.get(reminderId);
      if (timer) {
        clearTimeout(timer);
        this.reminderTimers.delete(reminderId);
      }

      logger.info('Reminder deactivated', 'HEALTH_REMINDERS', { reminderId });
    } catch (error) {
      errorHandler.handleError(error, 'deactivateReminder');
    }
  }

  async getAdherenceReport(userId: string, medicationId?: string): Promise<any> {
    try {
      let query = supabase
        .from('medication_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('adherence_tracking', true);

      if (medicationId) {
        query = query.eq('medication_id', medicationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(alert => ({
        medicationName: alert.medication_name,
        adherenceRate: alert.total_doses > 0 
          ? ((alert.total_doses - alert.missed_doses) / alert.total_doses) * 100 
          : 100,
        totalDoses: alert.total_doses,
        missedDoses: alert.missed_doses,
        lastTaken: alert.last_taken
      })) || [];
    } catch (error) {
      errorHandler.handleError(error, 'getAdherenceReport');
      return [];
    }
  }
}

export const healthRemindersService = new HealthRemindersService();
