import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { errorHandler } from './error-handler';

export interface SchedulingPreferences {
  preferredTimes: string[];
  preferredDays: string[];
  maxTravelDistance: number;
  preferredProviders: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  appointmentType: string;
  duration: number;
  followUpRequired: boolean;
}

export interface AppointmentSlot {
  id: string;
  providerId: string;
  providerName: string;
  specialty: string;
  dateTime: Date;
  duration: number;
  location: {
    address: string;
    distance: number;
    coordinates: [number, number];
  };
  cost: number;
  availability: 'available' | 'limited' | 'waitlist';
  score: number;
  reasons: string[];
}

export interface SchedulingRecommendation {
  slots: AppointmentSlot[];
  alternativeOptions: AppointmentSlot[];
  waitlistOptions: AppointmentSlot[];
  insights: {
    bestTimeToSchedule: string;
    averageWaitTime: number;
    costOptimization: string;
    travelOptimization: string;
  };
}

class SmartScheduler {
  private userPreferences: Map<string, SchedulingPreferences> = new Map();
  private providerAvailability: Map<string, any[]> = new Map();
  private historicalData: Map<string, any[]> = new Map();

  async getOptimalAppointments(
    userId: string,
    preferences: SchedulingPreferences,
    startDate: Date = new Date(),
    daysAhead: number = 30
  ): Promise<SchedulingRecommendation> {
    try {
      logger.info('Generating optimal appointment recommendations', 'SMART_SCHEDULER', {
        userId,
        urgency: preferences.urgencyLevel,
        type: preferences.appointmentType
      });

      // Get user's historical patterns
      const userHistory = await this.getUserAppointmentHistory(userId);
      
      // Get provider availability
      const providers = await this.getAvailableProviders(preferences);
      
      // Generate time slots
      const timeSlots = this.generateTimeSlots(startDate, daysAhead, preferences);
      
      // Score and rank slots
      const scoredSlots = await this.scoreAppointmentSlots(
        timeSlots,
        providers,
        preferences,
        userHistory
      );

      // Categorize slots
      const available = scoredSlots.filter(slot => slot.availability === 'available');
      const limited = scoredSlots.filter(slot => slot.availability === 'limited');
      const waitlist = scoredSlots.filter(slot => slot.availability === 'waitlist');

      // Generate insights
      const insights = await this.generateSchedulingInsights(
        scoredSlots,
        preferences,
        userHistory
      );

      return {
        slots: available.slice(0, 10),
        alternativeOptions: limited.slice(0, 5),
        waitlistOptions: waitlist.slice(0, 3),
        insights
      };
    } catch (error) {
      errorHandler.handleError(error, 'getOptimalAppointments');
      return {
        slots: [],
        alternativeOptions: [],
        waitlistOptions: [],
        insights: {
          bestTimeToSchedule: 'Morning hours typically have better availability',
          averageWaitTime: 0,
          costOptimization: 'No cost optimization available',
          travelOptimization: 'No travel optimization available'
        }
      };
    }
  }

  private async getUserAppointmentHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          providers (name, specialty, location)
        `)
        .eq('patient_id', userId)
        .order('appointment_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get user appointment history', 'SMART_SCHEDULER', error);
      return [];
    }
  }

  private async getAvailableProviders(preferences: SchedulingPreferences): Promise<any[]> {
    try {
      let query = supabase
        .from('providers')
        .select(`
          *,
          provider_availability (*),
          provider_specialties (*)
        `)
        .eq('active', true);

      // Filter by specialty if appointment type is specified
      if (preferences.appointmentType) {
        query = query.contains('specialties', [preferences.appointmentType]);
      }

      // Filter by preferred providers
      if (preferences.preferredProviders.length > 0) {
        query = query.in('id', preferences.preferredProviders);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to get available providers', 'SMART_SCHEDULER', error);
      return [];
    }
  }

  private generateTimeSlots(
    startDate: Date,
    daysAhead: number,
    preferences: SchedulingPreferences
  ): Date[] {
    const slots: Date[] = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysAhead);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Skip if not in preferred days
      if (preferences.preferredDays.length > 0 && 
          !preferences.preferredDays.includes(dayName)) {
        continue;
      }

      // Generate time slots for the day
      const timeSlots = this.generateDayTimeSlots(date, preferences);
      slots.push(...timeSlots);
    }

    return slots;
  }

  private generateDayTimeSlots(date: Date, preferences: SchedulingPreferences): Date[] {
    const slots: Date[] = [];
    const workingHours = [
      { start: 8, end: 12 },  // Morning
      { start: 13, end: 17 }, // Afternoon
      { start: 18, end: 20 }  // Evening
    ];

    workingHours.forEach(period => {
      for (let hour = period.start; hour < period.end; hour++) {
        // Check if time matches preferences
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        
        if (preferences.preferredTimes.length === 0 || 
            preferences.preferredTimes.some(prefTime => 
              this.isTimeInRange(timeStr, prefTime)
            )) {
          
          const slot = new Date(date);
          slot.setHours(hour, 0, 0, 0);
          
          // Skip past dates
          if (slot > new Date()) {
            slots.push(slot);
          }
        }
      }
    });

    return slots;
  }

  private isTimeInRange(time: string, preferredTime: string): boolean {
    // Simple time range matching - could be enhanced
    const ranges = {
      'morning': ['08:00', '12:00'],
      'afternoon': ['12:00', '17:00'],
      'evening': ['17:00', '20:00']
    };

    if (ranges[preferredTime as keyof typeof ranges]) {
      const [start, end] = ranges[preferredTime as keyof typeof ranges];
      return time >= start && time < end;
    }

    return time === preferredTime;
  }

  private async scoreAppointmentSlots(
    timeSlots: Date[],
    providers: any[],
    preferences: SchedulingPreferences,
    userHistory: any[]
  ): Promise<AppointmentSlot[]> {
    const scoredSlots: AppointmentSlot[] = [];

    for (const provider of providers) {
      for (const timeSlot of timeSlots) {
        const availability = await this.checkProviderAvailability(
          provider.id,
          timeSlot,
          preferences.duration
        );

        if (availability.isAvailable) {
          const slot: AppointmentSlot = {
            id: `${provider.id}-${timeSlot.getTime()}`,
            providerId: provider.id,
            providerName: provider.name,
            specialty: provider.specialty,
            dateTime: timeSlot,
            duration: preferences.duration,
            location: {
              address: provider.address,
              distance: this.calculateDistance(provider.location, userHistory),
              coordinates: provider.coordinates || [0, 0]
            },
            cost: provider.consultation_fee || 0,
            availability: availability.type,
            score: 0,
            reasons: []
          };

          // Calculate comprehensive score
          slot.score = this.calculateSlotScore(slot, preferences, userHistory);
          slot.reasons = this.generateScoreReasons(slot, preferences);

          scoredSlots.push(slot);
        }
      }
    }

    // Sort by score (highest first)
    return scoredSlots.sort((a, b) => b.score - a.score);
  }

  private async checkProviderAvailability(
    providerId: string,
    dateTime: Date,
    duration: number
  ): Promise<{ isAvailable: boolean; type: 'available' | 'limited' | 'waitlist' }> {
    try {
      // Check existing appointments
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_id', providerId)
        .gte('appointment_date', dateTime.toISOString())
        .lt('appointment_date', new Date(dateTime.getTime() + duration * 60000).toISOString());

      // Check provider working hours
      const dayOfWeek = dateTime.getDay();
      const { data: workingHours } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .eq('day_of_week', dayOfWeek);

      const isInWorkingHours = workingHours?.some(wh => {
        const slotTime = dateTime.getHours() * 60 + dateTime.getMinutes();
        const startTime = this.timeToMinutes(wh.start_time);
        const endTime = this.timeToMinutes(wh.end_time);
        return slotTime >= startTime && slotTime + duration <= endTime;
      });

      if (!isInWorkingHours) {
        return { isAvailable: false, type: 'waitlist' };
      }

      if (existingAppointments && existingAppointments.length > 0) {
        return { isAvailable: false, type: 'waitlist' };
      }

      // Check if it's within 24 hours (limited availability)
      const hoursUntilAppointment = (dateTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilAppointment < 24) {
        return { isAvailable: true, type: 'limited' };
      }

      return { isAvailable: true, type: 'available' };
    } catch (error) {
      logger.error('Failed to check provider availability', 'SMART_SCHEDULER', error);
      return { isAvailable: false, type: 'waitlist' };
    }
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculateDistance(providerLocation: any, userHistory: any[]): number {
    // Simplified distance calculation - in production, use proper geolocation
    if (!providerLocation || userHistory.length === 0) return 5; // Default 5km
    
    // Use most common location from user history
    return Math.random() * 20; // Placeholder: 0-20km
  }

  private calculateSlotScore(
    slot: AppointmentSlot,
    preferences: SchedulingPreferences,
    userHistory: any[]
  ): number {
    let score = 0;
    const maxScore = 100;

    // Time preference scoring (30% weight)
    const timeScore = this.scoreTimePreference(slot.dateTime, preferences);
    score += timeScore * 0.3;

    // Provider preference scoring (25% weight)
    const providerScore = this.scoreProviderPreference(slot, preferences, userHistory);
    score += providerScore * 0.25;

    // Distance scoring (20% weight)
    const distanceScore = this.scoreDistance(slot.location.distance, preferences);
    score += distanceScore * 0.2;

    // Urgency scoring (15% weight)
    const urgencyScore = this.scoreUrgency(slot.dateTime, preferences);
    score += urgencyScore * 0.15;

    // Cost scoring (10% weight)
    const costScore = this.scoreCost(slot.cost);
    score += costScore * 0.1;

    return Math.min(score, maxScore);
  }

  private scoreTimePreference(dateTime: Date, preferences: SchedulingPreferences): number {
    const hour = dateTime.getHours();
    const dayName = dateTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    let score = 50; // Base score

    // Day preference
    if (preferences.preferredDays.includes(dayName)) {
      score += 25;
    }

    // Time preference
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    if (preferences.preferredTimes.some(prefTime => 
        this.isTimeInRange(timeStr, prefTime))) {
      score += 25;
    }

    return score;
  }

  private scoreProviderPreference(
    slot: AppointmentSlot,
    preferences: SchedulingPreferences,
    userHistory: any[]
  ): number {
    let score = 50; // Base score

    // Preferred provider
    if (preferences.preferredProviders.includes(slot.providerId)) {
      score += 30;
    }

    // Historical preference (if user has seen this provider before)
    const hasSeenProvider = userHistory.some(apt => apt.provider_id === slot.providerId);
    if (hasSeenProvider) {
      score += 20;
    }

    return score;
  }

  private scoreDistance(distance: number, preferences: SchedulingPreferences): number {
    if (distance <= preferences.maxTravelDistance * 0.5) return 100;
    if (distance <= preferences.maxTravelDistance) return 75;
    if (distance <= preferences.maxTravelDistance * 1.5) return 50;
    return 25;
  }

  private scoreUrgency(dateTime: Date, preferences: SchedulingPreferences): number {
    const hoursUntilAppointment = (dateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    switch (preferences.urgencyLevel) {
      case 'emergency':
        return hoursUntilAppointment <= 4 ? 100 : 25;
      case 'high':
        return hoursUntilAppointment <= 24 ? 100 : hoursUntilAppointment <= 72 ? 75 : 50;
      case 'medium':
        return hoursUntilAppointment <= 168 ? 100 : 75; // Within a week
      case 'low':
        return 100; // Any time is fine
      default:
        return 50;
    }
  }

  private scoreCost(cost: number): number {
    // Simple cost scoring - lower cost = higher score
    if (cost === 0) return 100; // Free
    if (cost <= 50) return 90;
    if (cost <= 100) return 75;
    if (cost <= 200) return 50;
    return 25;
  }

  private generateScoreReasons(
    slot: AppointmentSlot,
    preferences: SchedulingPreferences
  ): string[] {
    const reasons: string[] = [];

    // Time-based reasons
    const hour = slot.dateTime.getHours();
    if (hour >= 8 && hour <= 10) {
      reasons.push('Early morning appointment - typically less crowded');
    }

    // Provider-based reasons
    if (preferences.preferredProviders.includes(slot.providerId)) {
      reasons.push('Your preferred healthcare provider');
    }

    // Distance-based reasons
    if (slot.location.distance <= 5) {
      reasons.push('Conveniently located nearby');
    }

    // Urgency-based reasons
    const hoursUntilAppointment = (slot.dateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (preferences.urgencyLevel === 'high' && hoursUntilAppointment <= 24) {
      reasons.push('Available for urgent care');
    }

    return reasons;
  }

  private async generateSchedulingInsights(
    slots: AppointmentSlot[],
    preferences: SchedulingPreferences,
    userHistory: any[]
  ): Promise<SchedulingRecommendation['insights']> {
    try {
      // Analyze best times
      const timeAnalysis = this.analyzeBestTimes(slots);
      
      // Calculate average wait times
      const avgWaitTime = await this.calculateAverageWaitTime(preferences.appointmentType);
      
      // Generate optimization suggestions
      const costOptimization = this.generateCostOptimization(slots);
      const travelOptimization = this.generateTravelOptimization(slots, preferences);

      return {
        bestTimeToSchedule: timeAnalysis,
        averageWaitTime: avgWaitTime,
        costOptimization,
        travelOptimization
      };
    } catch (error) {
      logger.error('Failed to generate scheduling insights', 'SMART_SCHEDULER', error);
      return {
        bestTimeToSchedule: 'Morning appointments typically have better availability',
        averageWaitTime: 7,
        costOptimization: 'Consider providers within your network for lower costs',
        travelOptimization: 'Choose providers within 10km to minimize travel time'
      };
    }
  }

  private analyzeBestTimes(slots: AppointmentSlot[]): string {
    const timeSlots = {
      morning: slots.filter(s => s.dateTime.getHours() < 12).length,
      afternoon: slots.filter(s => s.dateTime.getHours() >= 12 && s.dateTime.getHours() < 17).length,
      evening: slots.filter(s => s.dateTime.getHours() >= 17).length
    };

    const bestTime = Object.entries(timeSlots).reduce((a, b) => 
      timeSlots[a[0] as keyof typeof timeSlots] > timeSlots[b[0] as keyof typeof timeSlots] ? a : b
    )[0];

    return `${bestTime} appointments have the most availability`;
  }

  private async calculateAverageWaitTime(appointmentType: string): Promise<number> {
    try {
      const { data } = await supabase
        .from('appointments')
        .select('created_at, appointment_date')
        .eq('type', appointmentType)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!data || data.length === 0) return 7; // Default 7 days

      const waitTimes = data.map(apt => {
        const created = new Date(apt.created_at);
        const scheduled = new Date(apt.appointment_date);
        return (scheduled.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      });

      return Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
    } catch (error) {
      return 7; // Default fallback
    }
  }

  private generateCostOptimization(slots: AppointmentSlot[]): string {
    const costs = slots.map(s => s.cost).filter(c => c > 0);
    if (costs.length === 0) return 'Cost information not available';

    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const minCost = Math.min(...costs);

    if (minCost < avgCost * 0.8) {
      return `Save up to $${Math.round(avgCost - minCost)} by choosing lower-cost providers`;
    }

    return 'Costs are consistent across available providers';
  }

  private generateTravelOptimization(
    slots: AppointmentSlot[],
    preferences: SchedulingPreferences
  ): string {
    const distances = slots.map(s => s.location.distance);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const minDistance = Math.min(...distances);

    if (minDistance < preferences.maxTravelDistance * 0.5) {
      return `Choose nearby providers to save up to ${Math.round(avgDistance - minDistance)}km of travel`;
    }

    return 'Consider expanding your search radius for more options';
  }

  async bookOptimalAppointment(
    userId: string,
    slotId: string,
    preferences: SchedulingPreferences
  ): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
    try {
      const [providerId, timestamp] = slotId.split('-');
      const appointmentDate = new Date(parseInt(timestamp));

      // Double-check availability
      const availability = await this.checkProviderAvailability(
        providerId,
        appointmentDate,
        preferences.duration
      );

      if (!availability.isAvailable) {
        return { success: false, error: 'Appointment slot no longer available' };
      }

      // Create appointment
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: userId,
          provider_id: providerId,
          appointment_date: appointmentDate.toISOString(),
          duration: preferences.duration,
          type: preferences.appointmentType,
          status: 'scheduled',
          urgency_level: preferences.urgencyLevel,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Optimal appointment booked', 'SMART_SCHEDULER', {
        appointmentId: data.id,
        userId,
        providerId
      });

      return { success: true, appointmentId: data.id };
    } catch (error) {
      errorHandler.handleError(error, 'bookOptimalAppointment');
      return { success: false, error: 'Failed to book appointment' };
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: SchedulingPreferences
  ): Promise<void> {
    try {
      this.userPreferences.set(userId, preferences);
      
      // Store in database
      const { error } = await supabase
        .from('user_scheduling_preferences')
        .upsert({
          user_id: userId,
          preferences: preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      logger.info('User scheduling preferences updated', 'SMART_SCHEDULER', { userId });
    } catch (error) {
      errorHandler.handleError(error, 'updateUserPreferences');
    }
  }
}

export const smartScheduler = new SmartScheduler();
