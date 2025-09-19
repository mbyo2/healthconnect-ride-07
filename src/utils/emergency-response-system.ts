import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';
import { medicalTranslationService } from './medical-translation';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface EmergencyAlert {
  id: string;
  patientId: string;
  type: 'medical' | 'panic' | 'fall' | 'medication' | 'device_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy: number;
  };
  vitals?: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    oxygenSaturation?: number;
  };
  symptoms: string[];
  description: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'dispatched' | 'resolved';
  responders: EmergencyResponder[];
  estimatedArrival?: string;
  language: string;
}

export interface EmergencyResponder {
  id: string;
  type: 'ambulance' | 'police' | 'fire' | 'medical_team' | 'family' | 'caregiver';
  name: string;
  phone: string;
  location: {
    latitude: number;
    longitude: number;
  };
  estimatedArrival: number; // minutes
  status: 'notified' | 'en_route' | 'arrived' | 'completed';
  dispatchTime: string;
}

export interface EmergencyContact {
  id: string;
  patientId: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number;
  language: string;
  canReceiveAlerts: boolean;
  medicalPowerOfAttorney: boolean;
}

export interface MedicalProfile {
  patientId: string;
  allergies: string[];
  medications: string[];
  medicalConditions: string[];
  bloodType: string;
  emergencyInstructions: string;
  dnrStatus: boolean;
  insuranceInfo: {
    provider: string;
    policyNumber: string;
  };
  primaryPhysician: {
    name: string;
    phone: string;
  };
}

class EmergencyResponseSystem {
  private activeAlerts: Map<string, EmergencyAlert> = new Map();
  private emergencyContacts: Map<string, EmergencyContact[]> = new Map();
  private medicalProfiles: Map<string, MedicalProfile> = new Map();
  private geolocationWatcher: number | null = null;
  private currentLocation: { latitude: number; longitude: number; accuracy: number } | null = null;
  private lastKnownLocation: GeolocationPosition | null = null;

  constructor() {
    this.initializeEmergencySystem();
  }

  private async initializeEmergencySystem(): Promise<void> {
    try {
      await this.loadEmergencyContacts();
      await this.loadMedicalProfiles();
      await this.setupLocationTracking();
      await this.setupEmergencyDetection();

      logger.info('Emergency Response System initialized', 'EMERGENCY');
    } catch (error) {
      errorHandler.handleError(error, 'initializeEmergencySystem');
    }
  }

  private async loadEmergencyContacts(): Promise<void> {
    try {
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('canReceiveAlerts', true);

      if (contacts) {
        const contactsByPatient = contacts.reduce((acc, contact) => {
          if (!acc[contact.patientId]) acc[contact.patientId] = [];
          acc[contact.patientId].push(contact);
          return acc;
        }, {} as Record<string, EmergencyContact[]>);

        Object.entries(contactsByPatient).forEach(([patientId, patientContacts]) => {
          const sortedContacts = (patientContacts as EmergencyContact[]).sort((a, b) => a.priority - b.priority);
          this.emergencyContacts.set(patientId, sortedContacts);
        });
      }

      logger.info(`Loaded emergency contacts for ${this.emergencyContacts.size} patients`, 'EMERGENCY');
    } catch (error) {
      logger.error('Failed to load emergency contacts', 'EMERGENCY', error);
    }
  }

  private async loadMedicalProfiles(): Promise<void> {
    try {
      const { data: profiles } = await supabase
        .from('medical_profiles')
        .select('*');

      if (profiles) {
        profiles.forEach(profile => {
          this.medicalProfiles.set(profile.patientId, profile);
        });
      }

      logger.info(`Loaded ${this.medicalProfiles.size} medical profiles`, 'EMERGENCY');
    } catch (error) {
      logger.error('Failed to load medical profiles', 'EMERGENCY', error);
    }
  }

  private async setupLocationTracking(): Promise<void> {
    if ('geolocation' in navigator) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.lastKnownLocation = position;
          logger.info('Initial location acquired', 'EMERGENCY');
        },
        (error) => {
          logger.warn('Failed to get initial location', 'EMERGENCY', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );

      // Watch position changes
      this.geolocationWatcher = navigator.geolocation.watchPosition(
        (position) => {
          this.lastKnownLocation = position;
        },
        (error) => {
          logger.warn('Location tracking error', 'EMERGENCY', error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }
  }

  private async setupEmergencyDetection(): Promise<void> {
    // Listen for device shake (fall detection)
    if ('DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', (event) => {
        this.detectFall(event);
      });
    }

    // Listen for panic button (could be hardware button or gesture)
    document.addEventListener('keydown', (event) => {
      if (event.key === 'F1' && event.ctrlKey && event.shiftKey) {
        this.triggerPanicAlert();
      }
    });

    // Listen for long press on emergency button
    let emergencyButtonTimer: NodeJS.Timeout | null = null;
    document.addEventListener('touchstart', (event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('emergency-button')) {
        emergencyButtonTimer = setTimeout(() => {
          this.triggerPanicAlert();
        }, 3000); // 3 second long press
      }
    });

    document.addEventListener('touchend', () => {
      if (emergencyButtonTimer) {
        clearTimeout(emergencyButtonTimer);
        emergencyButtonTimer = null;
      }
    });
  }

  private detectFall(event: DeviceMotionEvent): void {
    if (!event.accelerationIncludingGravity) return;

    const { x, y, z } = event.accelerationIncludingGravity;
    const acceleration = Math.sqrt(x! * x! + y! * y! + z! * z!);

    // Simple fall detection algorithm
    if (acceleration > 20) { // Threshold for potential fall
      setTimeout(() => {
        this.checkForFallConfirmation();
      }, 5000); // Wait 5 seconds for user to cancel
    }
  }

  private async checkForFallConfirmation(): Promise<void> {
    const confirmed = await this.showFallDetectionDialog();
    if (confirmed) {
      await this.triggerEmergencyAlert('fall', 'high', 'Potential fall detected by device sensors');
    }
  }

  private showFallDetectionDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: red; color: white; padding: 20px; border-radius: 10px; z-index: 10000;">
          <h3>Fall Detected!</h3>
          <p>Are you okay? Emergency services will be contacted in <span id="countdown">30</span> seconds.</p>
          <button id="cancel-emergency">I'm OK - Cancel</button>
          <button id="confirm-emergency">Send Help Now</button>
        </div>
      `;
      
      document.body.appendChild(dialog);

      let countdown = 30;
      const countdownElement = dialog.querySelector('#countdown');
      const timer = setInterval(() => {
        countdown--;
        if (countdownElement) countdownElement.textContent = countdown.toString();
        if (countdown <= 0) {
          clearInterval(timer);
          document.body.removeChild(dialog);
          resolve(true);
        }
      }, 1000);

      dialog.querySelector('#cancel-emergency')?.addEventListener('click', () => {
        clearInterval(timer);
        document.body.removeChild(dialog);
        resolve(false);
      });

      dialog.querySelector('#confirm-emergency')?.addEventListener('click', () => {
        clearInterval(timer);
        document.body.removeChild(dialog);
        resolve(true);
      });
    });
  }

  async triggerEmergencyAlert(
    type: EmergencyAlert['type'],
    severity: EmergencyAlert['severity'],
    description: string,
    symptoms: string[] = [],
    patientId?: string
  ): Promise<EmergencyAlert> {
    try {
      const location = await this.getCurrentLocation();
      const userId = patientId || this.getCurrentUserId();
      const userLanguage = await this.getUserLanguage(userId);

      const alert: EmergencyAlert = {
        id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId: userId,
        type,
        severity,
        location,
        symptoms,
        description,
        timestamp: new Date().toISOString(),
        status: 'active',
        responders: [],
        language: userLanguage
      };

      // Get current vitals if available
      alert.vitals = await this.getCurrentVitals(userId);

      // Store alert
      await supabase.from('emergency_alerts').insert(alert);
      this.activeAlerts.set(alert.id, alert);

      // Dispatch emergency response
      await this.dispatchEmergencyResponse(alert);

      // Notify emergency contacts
      await this.notifyEmergencyContacts(alert);

      // Send to emergency services
      await this.contactEmergencyServices(alert);

      logger.info('Emergency alert triggered', 'EMERGENCY', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity
      });

      return alert;
    } catch (error) {
      errorHandler.handleError(error, 'triggerEmergencyAlert');
      throw error;
    }
  }

  private async triggerPanicAlert(): Promise<void> {
    await this.triggerEmergencyAlert(
      'panic',
      'high',
      'Panic button activated by user',
      ['anxiety', 'distress']
    );
  }

  private async getCurrentLocation(): Promise<EmergencyAlert['location']> {
    return new Promise((resolve, reject) => {
      if (this.lastKnownLocation) {
        resolve({
          latitude: this.lastKnownLocation.coords.latitude,
          longitude: this.lastKnownLocation.coords.longitude,
          accuracy: this.lastKnownLocation.coords.accuracy
        });
        return;
      }

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const address = await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              address,
              accuracy: position.coords.accuracy
            });
          },
          (error) => {
            logger.error('Failed to get current location', 'EMERGENCY', error);
            // Use last known location or default
            resolve({
              latitude: 0,
              longitude: 0,
              address: 'Location unavailable',
              accuracy: 0
            });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  private async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // Simplified reverse geocoding - in production, use actual geocoding service
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      logger.error('Reverse geocoding failed', 'EMERGENCY', error);
      return 'Address unavailable';
    }
  }

  private getCurrentUserId(): string {
    // In production, get from authentication context
    return 'current_user_id';
  }

  private async getUserLanguage(userId: string): Promise<string> {
    try {
      const profile = await medicalTranslationService.getLanguageProfile(userId);
      return profile?.emergencyLanguage || profile?.primaryLanguage || 'en';
    } catch (error) {
      return 'en';
    }
  }

  private async getCurrentVitals(patientId: string): Promise<EmergencyAlert['vitals']> {
    try {
      const { data: recentVitals } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('patientId', patientId)
        .gte('timestamp', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .order('timestamp', { ascending: false });

      if (!recentVitals || recentVitals.length === 0) return undefined;

      const vitals: EmergencyAlert['vitals'] = {};
      
      recentVitals.forEach(vital => {
        switch (vital.metricType) {
          case 'heart_rate':
            vitals.heartRate = vital.value;
            break;
          case 'blood_pressure':
            vitals.bloodPressure = vital.value;
            break;
          case 'temperature':
            vitals.temperature = vital.value;
            break;
          case 'oxygen_saturation':
            vitals.oxygenSaturation = vital.value;
            break;
        }
      });

      return Object.keys(vitals).length > 0 ? vitals : undefined;
    } catch (error) {
      logger.error('Failed to get current vitals', 'EMERGENCY', error);
      return undefined;
    }
  }

  private async dispatchEmergencyResponse(alert: EmergencyAlert): Promise<void> {
    try {
      // Find nearest emergency services
      const nearestResponders = await this.findNearestResponders(alert.location, alert.type);
      
      for (const responder of nearestResponders) {
        // Dispatch responder
        const dispatchedResponder: EmergencyResponder = {
          ...responder,
          status: 'notified',
          dispatchTime: new Date().toISOString()
        };

        alert.responders.push(dispatchedResponder);

        // Send dispatch notification
        await this.sendDispatchNotification(dispatchedResponder, alert);
      }

      // Update alert with responders
      await supabase
        .from('emergency_alerts')
        .update({ responders: JSON.stringify(alert.responders) })
        .eq('id', alert.id);

      logger.info('Emergency response dispatched', 'EMERGENCY', {
        alertId: alert.id,
        responderCount: alert.responders.length
      });
    } catch (error) {
      logger.error('Failed to dispatch emergency response', 'EMERGENCY', error);
    }
  }

  private async findNearestResponders(
    location: EmergencyAlert['location'],
    alertType: EmergencyAlert['type']
  ): Promise<EmergencyResponder[]> {
    // Simplified responder finding - in production, integrate with actual emergency services
    const responders: EmergencyResponder[] = [
      {
        id: 'ambulance_1',
        type: 'ambulance',
        name: 'City Ambulance Service',
        phone: '911',
        location: {
          latitude: location.latitude + 0.01,
          longitude: location.longitude + 0.01
        },
        estimatedArrival: 8,
        status: 'notified',
        dispatchTime: new Date().toISOString()
      }
    ];

    if (alertType === 'panic' || alertType === 'fall') {
      responders.push({
        id: 'police_1',
        type: 'police',
        name: 'Local Police Department',
        phone: '911',
        location: {
          latitude: location.latitude + 0.005,
          longitude: location.longitude + 0.005
        },
        estimatedArrival: 5,
        status: 'notified',
        dispatchTime: new Date().toISOString()
      });
    }

    return responders;
  }

  private async sendDispatchNotification(responder: EmergencyResponder, alert: EmergencyAlert): Promise<void> {
    try {
      const medicalProfile = this.medicalProfiles.get(alert.patientId);
      
      const dispatchInfo = {
        alertId: alert.id,
        location: alert.location,
        patientInfo: medicalProfile ? {
          allergies: medicalProfile.allergies,
          medications: medicalProfile.medications,
          conditions: medicalProfile.medicalConditions,
          bloodType: medicalProfile.bloodType,
          dnrStatus: medicalProfile.dnrStatus
        } : null,
        vitals: alert.vitals,
        symptoms: alert.symptoms,
        description: alert.description,
        severity: alert.severity
      };

      // In production, send to actual dispatch system
      await supabase.from('dispatch_notifications').insert({
        responder_id: responder.id,
        alert_id: alert.id,
        dispatch_info: JSON.stringify(dispatchInfo),
        sent_at: new Date().toISOString()
      });

      logger.info('Dispatch notification sent', 'EMERGENCY', {
        responderId: responder.id,
        alertId: alert.id
      });
    } catch (error) {
      logger.error('Failed to send dispatch notification', 'EMERGENCY', error);
    }
  }

  private async notifyEmergencyContacts(alert: EmergencyAlert): Promise<void> {
    try {
      const contacts = this.emergencyContacts.get(alert.patientId) || [];
      
      for (const contact of contacts) {
        const message = await this.createEmergencyMessage(alert, contact.language);
        
        // Send SMS/call notification
        await this.sendEmergencyNotification(contact, message, alert);
      }

      logger.info('Emergency contacts notified', 'EMERGENCY', {
        alertId: alert.id,
        contactCount: contacts.length
      });
    } catch (error) {
      logger.error('Failed to notify emergency contacts', 'EMERGENCY', error);
    }
  }

  private async createEmergencyMessage(alert: EmergencyAlert, language: string): Promise<string> {
    const baseMessage = `EMERGENCY ALERT: ${alert.description}. Location: ${alert.location.address || 'GPS coordinates available'}. Time: ${new Date(alert.timestamp).toLocaleString()}. Emergency services have been contacted.`;
    
    if (language !== 'en') {
      const translation = await medicalTranslationService.translateText(
        baseMessage,
        'en',
        language,
        'emergency'
      );
      return translation.translatedText;
    }
    
    return baseMessage;
  }

  private async sendEmergencyNotification(
    contact: EmergencyContact,
    message: string,
    alert: EmergencyAlert
  ): Promise<void> {
    try {
      // Store notification record
      await supabase.from('emergency_notifications').insert({
        contact_id: contact.id,
        alert_id: alert.id,
        message,
        phone: contact.phone,
        email: contact.email,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });

      // In production, integrate with SMS/email service
      logger.info('Emergency notification sent', 'EMERGENCY', {
        contactId: contact.id,
        phone: contact.phone
      });
    } catch (error) {
      logger.error('Failed to send emergency notification', 'EMERGENCY', error);
    }
  }

  private async contactEmergencyServices(alert: EmergencyAlert): Promise<void> {
    try {
      const emergencyData = {
        type: alert.type,
        severity: alert.severity,
        location: alert.location,
        patientInfo: this.medicalProfiles.get(alert.patientId),
        vitals: alert.vitals,
        symptoms: alert.symptoms,
        description: alert.description,
        timestamp: alert.timestamp
      };

      // In production, integrate with 911/emergency services API
      await supabase.from('emergency_service_calls').insert({
        alert_id: alert.id,
        call_data: JSON.stringify(emergencyData),
        called_at: new Date().toISOString(),
        status: 'initiated'
      });

      logger.info('Emergency services contacted', 'EMERGENCY', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to contact emergency services', 'EMERGENCY', error);
    }
  }

  async updateAlertStatus(alertId: string, status: EmergencyAlert['status'], responderId?: string): Promise<boolean> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      alert.status = status;

      if (responderId) {
        const responder = alert.responders.find(r => r.id === responderId);
        if (responder) {
          responder.status = status === 'dispatched' ? 'en_route' : 
                           status === 'acknowledged' ? 'arrived' : 'completed';
        }
      }

      await supabase
        .from('emergency_alerts')
        .update({ 
          status,
          responders: JSON.stringify(alert.responders),
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (status === 'resolved') {
        this.activeAlerts.delete(alertId);
      }

      logger.info('Alert status updated', 'EMERGENCY', { alertId, status });
      return true;
    } catch (error) {
      errorHandler.handleError(error, 'updateAlertStatus');
      return false;
    }
  }

  async addEmergencyContact(patientId: string, contact: { name: string; phone: string; relationship: string }): Promise<EmergencyContact> {
    try {
      const newContact: EmergencyContact = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId,
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone,
        priority: 1,
        language: 'en',
        canReceiveAlerts: true,
        medicalPowerOfAttorney: false
      };

      await supabase.from('emergency_contacts').insert({
        id: newContact.id,
        patient_id: patientId,
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone,
        priority: 1
      });

      const contacts = this.emergencyContacts.get(patientId) || [];
      contacts.push(newContact);
      this.emergencyContacts.set(patientId, contacts);

      logger.info('Emergency contact added', 'EMERGENCY', { contactId: newContact.id });

      return newContact;
    } catch (error) {
      errorHandler.handleError(error, 'addEmergencyContact');
      throw error;
    }
  }

  async getEmergencyContacts(patientId: string): Promise<EmergencyContact[]> {
    try {
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('patient_id', patientId)
        .order('priority', { ascending: true });

      const emergencyContacts = (contacts || []).map(contact => ({
        id: contact.id,
        patientId: contact.patient_id,
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone,
        priority: contact.priority,
        language: contact.language || 'en',
        canReceiveAlerts: contact.can_receive_alerts ?? true,
        medicalPowerOfAttorney: contact.medical_power_of_attorney ?? false
      }));

      this.emergencyContacts.set(patientId, emergencyContacts);
      return emergencyContacts;
    } catch (error) {
      errorHandler.handleError(error, 'getEmergencyContacts');
      return [];
    }
  }

  async removeEmergencyContact(patientId: string, contactId: string): Promise<boolean> {
    try {
      await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId)
        .eq('patient_id', patientId);

      const contacts = this.emergencyContacts.get(patientId) || [];
      const updatedContacts = contacts.filter(contact => contact.id !== contactId);
      this.emergencyContacts.set(patientId, updatedContacts);

      logger.info('Emergency contact removed', 'EMERGENCY', { contactId });
      return true;
    } catch (error) {
      errorHandler.handleError(error, 'removeEmergencyContact');
      return false;
    }
  }

  async startLocationTracking(patientId: string): Promise<void> {
    try {
      if ('geolocation' in navigator) {
        this.geolocationWatcher = navigator.geolocation.watchPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            
            // Store current location for emergency use
            this.currentLocation = location;
            
            logger.info('Location updated', 'EMERGENCY', { patientId, location });
          },
          (error) => {
            logger.error('Location tracking error', 'EMERGENCY', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      }
    } catch (error) {
      errorHandler.handleError(error, 'startLocationTracking');
    }
  }

  async enableFallDetection(patientId: string): Promise<void> {
    try {
      if ('DeviceMotionEvent' in window) {
        // Check if permission is required (iOS 13+)
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('devicemotion', (event) => {
              this.processFallDetection(patientId, event);
            });
            logger.info('Fall detection enabled with permission', 'EMERGENCY', { patientId });
          }
        } else {
          // No permission required (Android, older iOS)
          window.addEventListener('devicemotion', (event) => {
            this.processFallDetection(patientId, event);
          });
          logger.info('Fall detection enabled', 'EMERGENCY', { patientId });
        }
      }
    } catch (error) {
      errorHandler.handleError(error, 'enableFallDetection');
    }
  }

  private processFallDetection(patientId: string, event: DeviceMotionEvent): void {
    if (event.accelerationIncludingGravity) {
      const { x, y, z } = event.accelerationIncludingGravity;
      const acceleration = Math.sqrt(x! * x! + y! * y! + z! * z!);
      
      // Simple fall detection algorithm - threshold-based
      if (acceleration > 25) { // Threshold for potential fall
        this.createEmergencyAlert(patientId, 'fall', this.currentLocation, {
          description: 'Potential fall detected by device sensors',
          symptoms: ['fall_detected'],
          vitals: { acceleration }
        });
      }
    }
  }

  async createEmergencyAlert(
    patientId: string, 
    type: EmergencyAlert['type'], 
    location: any, 
    options: { description?: string; symptoms?: string[]; vitals?: any } = {}
  ): Promise<EmergencyAlert> {
    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const alert: EmergencyAlert = {
        id: alertId,
        patientId,
        type,
        severity: type === 'fall' || type === 'medical' ? 'high' : 'medium',
        location: location || this.currentLocation || { latitude: 0, longitude: 0, accuracy: 0 },
        symptoms: options.symptoms || [],
        description: options.description || `${type} emergency alert`,
        timestamp: new Date().toISOString(),
        status: 'active',
        responders: [],
        language: 'en',
        vitals: options.vitals
      };

      await supabase.from('emergency_alerts').insert({
        id: alert.id,
        patient_id: patientId,
        type: alert.type,
        severity: alert.severity,
        location: alert.location,
        symptoms: alert.symptoms,
        description: alert.description,
        timestamp: alert.timestamp,
        status: alert.status,
        language: alert.language,
        vitals: alert.vitals
      });

      this.activeAlerts.set(alertId, alert);
      
      // Notify emergency contacts
      await this.notifyEmergencyContacts(alert);
      
      logger.info('Emergency alert created', 'EMERGENCY', { alertId, type });
      return alert;
    } catch (error) {
      errorHandler.handleError(error, 'createEmergencyAlert');
      throw error;
    }
  }

  async updateMedicalProfile(patientId: string, profile: Partial<MedicalProfile>): Promise<void> {
    try {
      const existingProfile = this.medicalProfiles.get(patientId) || { patientId } as MedicalProfile;
      const updatedProfile = { ...existingProfile, ...profile };

      await supabase.from('medical_profiles').upsert({
        patient_id: patientId,
        ...updatedProfile,
        updated_at: new Date().toISOString()
      });

      this.medicalProfiles.set(patientId, updatedProfile);

      logger.info('Medical profile updated', 'EMERGENCY', { patientId });
    } catch (error) {
      errorHandler.handleError(error, 'updateMedicalProfile');
    }
  }

  async getActiveAlerts(patientId?: string): Promise<EmergencyAlert[]> {
    try {
      let query = supabase
        .from('emergency_alerts')
        .select('*')
        .in('status', ['active', 'acknowledged', 'dispatched']);

      if (patientId) {
        query = query.eq('patientId', patientId);
      }

      const { data: alerts } = await query.order('timestamp', { ascending: false });
      return alerts || [];
    } catch (error) {
      errorHandler.handleError(error, 'getActiveAlerts');
      return [];
    }
  }

  async getEmergencyHistory(patientId: string, limit: number = 50): Promise<EmergencyAlert[]> {
    try {
      const { data: alerts } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('patientId', patientId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      return alerts || [];
    } catch (error) {
      errorHandler.handleError(error, 'getEmergencyHistory');
      return [];
    }
  }

  cleanup(): void {
    if (this.geolocationWatcher) {
      navigator.geolocation.clearWatch(this.geolocationWatcher);
    }
  }
}

export const emergencyResponseSystem = new EmergencyResponseSystem();
