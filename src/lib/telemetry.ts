/**
 * Veloura Quest - Application Health & Telemetry System
 * Real-time performance tracking, crash reporting, and Firestore operational monitoring.
 */

export interface TelemetryEvent {
  id: string;
  type: 'error' | 'auth_success' | 'auth_failure' | 'firestore_read' | 'firestore_write' | 'performance';
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

class TelemetryTracker {
  private events: TelemetryEvent[] = [];
  private readCount: number = 0;
  private writeCount: number = 0;
  private failedLoginAttempts: number = 0;
  private activeSessionStart: number = Date.now();

  constructor() {
    this.logEvent('performance', 'Telemetry initialized');
  }

  public recordFirestoreRead(count: number = 1) {
    this.readCount += count;
  }

  public recordFirestoreWrite(count: number = 1) {
    this.writeCount += count;
  }

  public recordAuthAttempt(success: boolean, email?: string) {
    if (success) {
      this.logEvent('auth_success', `User logged in: ${email || 'anonymous'}`);
    } else {
      this.failedLoginAttempts += 1;
      this.logEvent('auth_failure', `Failed login attempt for: ${email || 'unknown'}`);
    }
  }

  public logError(error: Error | string, componentContext?: string) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    this.logEvent('error', message, { stack, componentContext });
    console.error(`[Veloura Telemetry Error] [${componentContext || 'Global'}]:`, message);
  }

  public logEvent(
    type: TelemetryEvent['type'],
    message: string,
    details?: Record<string, any>
  ) {
    const evt: TelemetryEvent = {
      id: 'telemetry-' + Math.random().toString(36).substr(2, 9),
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    this.events.unshift(evt);
    if (this.events.length > 100) {
      this.events.pop(); // keep last 100 in memory
    }
  }

  public getMetrics() {
    const sessionUptimeSeconds = Math.floor((Date.now() - this.activeSessionStart) / 1000);
    const errorCount = this.events.filter(e => e.type === 'error').length;
    
    return {
      firestoreReads: this.readCount,
      firestoreWrites: this.writeCount,
      failedLoginAttempts: this.failedLoginAttempts,
      sessionUptimeSeconds,
      recentErrors: errorCount,
      healthStatus: errorCount > 5 ? 'Degraded' : 'Healthy'
    };
  }

  public getEvents() {
    return this.events;
  }
}

export const telemetry = new TelemetryTracker();
