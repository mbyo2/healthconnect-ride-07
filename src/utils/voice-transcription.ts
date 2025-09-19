import { logger } from './logger';
import { errorHandler } from './error-handler';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface TranscriptionSession {
  id: string;
  userId: string;
  appointmentId?: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed' | 'failed';
  language: string;
  confidence: number;
  rawTranscript: string;
  processedNotes: MedicalNote[];
}

export interface MedicalNote {
  id: string;
  type: 'symptom' | 'diagnosis' | 'treatment' | 'medication' | 'observation' | 'plan';
  content: string;
  confidence: number;
  timestamp: Date;
  keywords: string[];
  icd10Codes?: string[];
  medications?: string[];
}

export interface VoiceCommand {
  command: string;
  action: 'start_recording' | 'stop_recording' | 'pause_recording' | 'save_notes' | 'new_section';
  parameters?: any;
}

export interface TranscriptionConfig {
  language: string;
  medicalTerminology: boolean;
  realTimeProcessing: boolean;
  confidenceThreshold: number;
  autoSave: boolean;
  voiceCommands: boolean;
}

class VoiceTranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private currentSession: TranscriptionSession | null = null;
  private isRecording: boolean = false;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private config: TranscriptionConfig = {
    language: 'en-US',
    medicalTerminology: true,
    realTimeProcessing: true,
    confidenceThreshold: 0.7,
    autoSave: true,
    voiceCommands: true
  };

  // Medical terminology dictionary for better recognition
  private medicalTerms = new Set([
    'hypertension', 'diabetes', 'pneumonia', 'bronchitis', 'asthma',
    'myocardial infarction', 'angina', 'arrhythmia', 'tachycardia',
    'bradycardia', 'hypotension', 'hypoglycemia', 'hyperglycemia',
    'dyspnea', 'orthopnea', 'syncope', 'vertigo', 'migraine',
    'acetaminophen', 'ibuprofen', 'metformin', 'lisinopril', 'atorvastatin'
  ]);

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        logger.warn('Speech recognition not supported', 'VOICE_TRANSCRIPTION');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.setupRecognitionConfig();
      this.setupRecognitionEventListeners();

      logger.info('Speech recognition initialized', 'VOICE_TRANSCRIPTION');
    } catch (error) {
      errorHandler.handleError(error, 'initializeSpeechRecognition');
    }
  }

  private setupRecognitionConfig(): void {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 3;
  }

  private setupRecognitionEventListeners(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      logger.info('Speech recognition started', 'VOICE_TRANSCRIPTION');
      this.isRecording = true;
    };

    this.recognition.onend = () => {
      logger.info('Speech recognition ended', 'VOICE_TRANSCRIPTION');
      this.isRecording = false;
    };

    this.recognition.onerror = (event) => {
      logger.error('Speech recognition error', 'VOICE_TRANSCRIPTION', event.error);
      this.handleRecognitionError(event.error);
    };

    this.recognition.onresult = (event) => {
      this.handleRecognitionResult(event);
    };
  }

  async startTranscription(
    userId: string,
    appointmentId?: string,
    config?: Partial<TranscriptionConfig>
  ): Promise<TranscriptionSession> {
    try {
      if (this.currentSession?.status === 'active') {
        throw new Error('Transcription session already active');
      }

      // Update config if provided
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Create new session
      const session: TranscriptionSession = {
        id: `session-${Date.now()}`,
        userId,
        appointmentId,
        startTime: new Date(),
        status: 'active',
        language: this.config.language,
        confidence: 0,
        rawTranscript: '',
        processedNotes: []
      };

      this.currentSession = session;

      // Initialize audio recording for backup
      await this.initializeAudioRecording();

      // Start speech recognition
      if (this.recognition) {
        this.recognition.lang = this.config.language;
        this.recognition.start();
      }

      // Store session in database
      await this.storeSession(session);

      logger.info('Transcription session started', 'VOICE_TRANSCRIPTION', {
        sessionId: session.id,
        userId,
        appointmentId
      });

      return session;
    } catch (error) {
      errorHandler.handleError(error, 'startTranscription');
      throw error;
    }
  }

  private async initializeAudioRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext();
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
    } catch (error) {
      logger.error('Failed to initialize audio recording', 'VOICE_TRANSCRIPTION', error);
    }
  }

  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    try {
      if (!this.currentSession) return;

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript + ' ';
          
          // Process medical content
          if (this.config.realTimeProcessing) {
            this.processMedicalContent(transcript, result[0].confidence);
          }

          // Check for voice commands
          if (this.config.voiceCommands) {
            this.processVoiceCommands(transcript);
          }
        } else {
          interimTranscript += transcript;
        }
      }

      // Update session transcript
      if (finalTranscript) {
        this.currentSession.rawTranscript += finalTranscript;
        this.updateSessionConfidence(event.results);
        
        // Auto-save if enabled
        if (this.config.autoSave) {
          this.saveTranscriptionProgress();
        }
      }

      // Notify listeners
      this.onTranscriptUpdate?.(finalTranscript, interimTranscript);
    } catch (error) {
      logger.error('Error handling recognition result', 'VOICE_TRANSCRIPTION', error);
    }
  }

  private processMedicalContent(transcript: string, confidence: number): void {
    if (!this.currentSession || confidence < this.config.confidenceThreshold) return;

    try {
      const medicalNotes = this.extractMedicalNotes(transcript, confidence);
      this.currentSession.processedNotes.push(...medicalNotes);

      logger.info(`Processed ${medicalNotes.length} medical notes`, 'VOICE_TRANSCRIPTION');
    } catch (error) {
      logger.error('Error processing medical content', 'VOICE_TRANSCRIPTION', error);
    }
  }

  private extractMedicalNotes(transcript: string, confidence: number): MedicalNote[] {
    const notes: MedicalNote[] = [];
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);

    sentences.forEach(sentence => {
      const note = this.analyzeMedicalSentence(sentence.trim(), confidence);
      if (note) {
        notes.push(note);
      }
    });

    return notes;
  }

  private analyzeMedicalSentence(sentence: string, confidence: number): MedicalNote | null {
    const lowerSentence = sentence.toLowerCase();
    
    // Symptom patterns
    const symptomPatterns = [
      /patient (complains of|reports|has) (.+)/,
      /symptoms include (.+)/,
      /experiencing (.+)/,
      /feels (.+)/
    ];

    // Diagnosis patterns
    const diagnosisPatterns = [
      /diagnosed with (.+)/,
      /diagnosis (.+)/,
      /condition (.+)/,
      /appears to have (.+)/
    ];

    // Treatment patterns
    const treatmentPatterns = [
      /prescribed (.+)/,
      /treatment plan (.+)/,
      /recommend (.+)/,
      /advised (.+)/
    ];

    // Medication patterns
    const medicationPatterns = [
      /taking (.+mg|.+ml) of (.+)/,
      /medication (.+)/,
      /drug (.+)/,
      /pill (.+)/
    ];

    let type: MedicalNote['type'] = 'observation';
    let content = sentence;
    let keywords: string[] = [];
    let medications: string[] = [];

    // Check patterns
    for (const pattern of symptomPatterns) {
      const match = lowerSentence.match(pattern);
      if (match) {
        type = 'symptom';
        content = match[2] || sentence;
        break;
      }
    }

    for (const pattern of diagnosisPatterns) {
      const match = lowerSentence.match(pattern);
      if (match) {
        type = 'diagnosis';
        content = match[1] || sentence;
        break;
      }
    }

    for (const pattern of treatmentPatterns) {
      const match = lowerSentence.match(pattern);
      if (match) {
        type = 'treatment';
        content = match[1] || sentence;
        break;
      }
    }

    for (const pattern of medicationPatterns) {
      const match = lowerSentence.match(pattern);
      if (match) {
        type = 'medication';
        content = sentence;
        medications.push(match[2] || match[1]);
        break;
      }
    }

    // Extract keywords
    keywords = this.extractKeywords(sentence);

    // Only create note if it contains medical terms or matches patterns
    if (keywords.length > 0 || type !== 'observation') {
      return {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        confidence,
        timestamp: new Date(),
        keywords,
        medications: medications.length > 0 ? medications : undefined
      };
    }

    return null;
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/);
    return words.filter(word => 
      this.medicalTerms.has(word) || 
      word.length > 6 // Longer words might be medical terms
    );
  }

  private processVoiceCommands(transcript: string): void {
    const lowerTranscript = transcript.toLowerCase();
    
    const commands: VoiceCommand[] = [
      {
        command: 'stop recording',
        action: 'stop_recording'
      },
      {
        command: 'pause recording',
        action: 'pause_recording'
      },
      {
        command: 'save notes',
        action: 'save_notes'
      },
      {
        command: 'new section',
        action: 'new_section'
      }
    ];

    for (const cmd of commands) {
      if (lowerTranscript.includes(cmd.command)) {
        this.executeVoiceCommand(cmd);
        break;
      }
    }
  }

  private executeVoiceCommand(command: VoiceCommand): void {
    logger.info('Executing voice command', 'VOICE_TRANSCRIPTION', { command: command.action });

    switch (command.action) {
      case 'stop_recording':
        this.stopTranscription();
        break;
      case 'pause_recording':
        this.pauseTranscription();
        break;
      case 'save_notes':
        this.saveTranscriptionProgress();
        break;
      case 'new_section':
        this.addSectionBreak();
        break;
    }
  }

  pauseTranscription(): void {
    try {
      if (this.recognition && this.isRecording) {
        this.recognition.stop();
      }

      if (this.currentSession) {
        this.currentSession.status = 'paused';
      }

      logger.info('Transcription paused', 'VOICE_TRANSCRIPTION');
    } catch (error) {
      errorHandler.handleError(error, 'pauseTranscription');
    }
  }

  resumeTranscription(): void {
    try {
      if (this.recognition && this.currentSession?.status === 'paused') {
        this.recognition.start();
        this.currentSession.status = 'active';
      }

      logger.info('Transcription resumed', 'VOICE_TRANSCRIPTION');
    } catch (error) {
      errorHandler.handleError(error, 'resumeTranscription');
    }
  }

  async stopTranscription(): Promise<TranscriptionSession | null> {
    try {
      if (!this.currentSession) return null;

      // Stop recognition
      if (this.recognition && this.isRecording) {
        this.recognition.stop();
      }

      // Stop audio recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      // Update session
      this.currentSession.status = 'completed';
      this.currentSession.endTime = new Date();

      // Final save
      await this.saveTranscriptionProgress();

      const completedSession = this.currentSession;
      this.currentSession = null;

      logger.info('Transcription session completed', 'VOICE_TRANSCRIPTION', {
        sessionId: completedSession.id,
        duration: completedSession.endTime.getTime() - completedSession.startTime.getTime(),
        notesCount: completedSession.processedNotes.length
      });

      return completedSession;
    } catch (error) {
      errorHandler.handleError(error, 'stopTranscription');
      return null;
    }
  }

  private addSectionBreak(): void {
    if (this.currentSession) {
      this.currentSession.rawTranscript += '\n\n--- Section Break ---\n\n';
      
      const sectionNote: MedicalNote = {
        id: `section-${Date.now()}`,
        type: 'observation',
        content: '--- New Section ---',
        confidence: 1.0,
        timestamp: new Date(),
        keywords: ['section', 'break']
      };

      this.currentSession.processedNotes.push(sectionNote);
    }
  }

  private updateSessionConfidence(results: SpeechRecognitionResultList): void {
    if (!this.currentSession) return;

    let totalConfidence = 0;
    let count = 0;

    for (let i = 0; i < results.length; i++) {
      if (results[i].isFinal) {
        totalConfidence += results[i][0].confidence;
        count++;
      }
    }

    if (count > 0) {
      this.currentSession.confidence = totalConfidence / count;
    }
  }

  private async saveTranscriptionProgress(): Promise<void> {
    try {
      if (!this.currentSession) return;

      await this.storeSession(this.currentSession);
      logger.info('Transcription progress saved', 'VOICE_TRANSCRIPTION');
    } catch (error) {
      logger.error('Failed to save transcription progress', 'VOICE_TRANSCRIPTION', error);
    }
  }

  private async storeSession(session: TranscriptionSession): Promise<void> {
    try {
      const { error } = await supabase
        .from('transcription_sessions')
        .upsert({
          id: session.id,
          user_id: session.userId,
          appointment_id: session.appointmentId,
          start_time: session.startTime.toISOString(),
          end_time: session.endTime?.toISOString(),
          status: session.status,
          language: session.language,
          confidence: session.confidence,
          raw_transcript: session.rawTranscript,
          processed_notes: session.processedNotes,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to store transcription session', 'VOICE_TRANSCRIPTION', error);
    }
  }

  private handleRecognitionError(error: string): void {
    logger.error('Speech recognition error', 'VOICE_TRANSCRIPTION', error);

    if (this.currentSession) {
      this.currentSession.status = 'failed';
    }

    // Attempt to restart if it's a network error
    if (error === 'network' && this.currentSession?.status === 'active') {
      setTimeout(() => {
        if (this.recognition) {
          this.recognition.start();
        }
      }, 1000);
    }
  }

  getCurrentSession(): TranscriptionSession | null {
    return this.currentSession;
  }

  updateConfig(config: Partial<TranscriptionConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.recognition) {
      this.recognition.lang = this.config.language;
    }
  }

  async exportTranscription(sessionId: string, format: 'txt' | 'json' | 'pdf' = 'txt'): Promise<Blob> {
    try {
      const { data: session } = await supabase
        .from('transcription_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      let content: string;
      let mimeType: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(session, null, 2);
          mimeType = 'application/json';
          break;
        case 'txt':
        default:
          content = this.formatTranscriptionAsText(session);
          mimeType = 'text/plain';
          break;
      }

      return new Blob([content], { type: mimeType });
    } catch (error) {
      errorHandler.handleError(error, 'exportTranscription');
      throw error;
    }
  }

  private formatTranscriptionAsText(session: any): string {
    let text = `Medical Transcription\n`;
    text += `Session ID: ${session.id}\n`;
    text += `Date: ${new Date(session.start_time).toLocaleString()}\n`;
    text += `Duration: ${session.end_time ? Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000) : 'N/A'} minutes\n`;
    text += `Confidence: ${Math.round(session.confidence * 100)}%\n\n`;
    
    text += `Raw Transcript:\n${session.raw_transcript}\n\n`;
    
    if (session.processed_notes?.length > 0) {
      text += `Processed Medical Notes:\n`;
      session.processed_notes.forEach((note: MedicalNote, index: number) => {
        text += `${index + 1}. [${note.type.toUpperCase()}] ${note.content}\n`;
        if (note.keywords?.length > 0) {
          text += `   Keywords: ${note.keywords.join(', ')}\n`;
        }
        if (note.medications?.length > 0) {
          text += `   Medications: ${note.medications.join(', ')}\n`;
        }
        text += `   Confidence: ${Math.round(note.confidence * 100)}%\n\n`;
      });
    }

    return text;
  }

  // Event handlers (to be set by components)
  onTranscriptUpdate?: (finalTranscript: string, interimTranscript: string) => void;
  onSessionStatusChange?: (status: TranscriptionSession['status']) => void;
  onError?: (error: string) => void;
}

export const voiceTranscriptionService = new VoiceTranscriptionService();
