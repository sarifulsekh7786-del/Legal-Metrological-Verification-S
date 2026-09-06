import { db } from '../lib/db';
import {
  Application,
  ApplicationStatus,
  Instrument,
  InstrumentCategory
} from '../types';

export class InvalidStateTransitionError extends Error {
  statusCode = 400;
  constructor(currentStatus: ApplicationStatus, targetStatus: ApplicationStatus) {
    super(`Illegal state transition: cannot transition application from '${currentStatus}' to '${targetStatus}'.`);
    this.name = 'InvalidStateTransitionError';
  }
}

export interface CreateApplicationDTO {
  traderId: string;
  businessId: string;
  instrument: {
    category: InstrumentCategory;
    make: string;
    modelNumber: string;
    serialNumber: string;
    maxCapacity: string;
    verificationDivision: string;
    accuracyClass: string;
    manufacturingYear: number;
    prevCertNumber?: string;
  };
  verificationFee?: number;
}

export class ApplicationService {
  /**
   * Creates a new instrument and application atomically inside a $transaction.
   * Client CANNOT supply status, lmoId, or assignment details here;
   * status is always initialized strictly to 'SUBMITTED'.
   */
  async submitApplication(dto: CreateApplicationDTO): Promise<Application> {
    const business = db.businesses.get(dto.businessId);
    if (!business) {
      const err = new Error(`Business with ID ${dto.businessId} not found`);
      (err as any).statusCode = 404;
      throw err;
    }

    if (business.traderId !== dto.traderId) {
      const err = new Error('Unauthorized: business does not belong to requesting trader');
      (err as any).statusCode = 403;
      throw err;
    }

    return await db.$transaction(async (tx) => {
      // 1. Create instrument
      const instrumentId = `inst-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const newInstrument: Instrument = {
        id: instrumentId,
        businessId: dto.businessId,
        category: dto.instrument.category,
        make: dto.instrument.make.trim(),
        modelNumber: dto.instrument.modelNumber.trim(),
        serialNumber: dto.instrument.serialNumber.trim(),
        maxCapacity: dto.instrument.maxCapacity.trim(),
        verificationDivision: dto.instrument.verificationDivision.trim(),
        accuracyClass: dto.instrument.accuracyClass.trim(),
        manufacturingYear: dto.instrument.manufacturingYear || new Date().getFullYear(),
        prevCertNumber: dto.instrument.prevCertNumber?.trim()
      };
      tx.instruments.set(newInstrument.id, newInstrument);

      // 2. Compute statutory verification fee based on category
      let fee = dto.verificationFee;
      if (!fee || fee <= 0) {
        switch (dto.instrument.category) {
          case 'WEIGHING_SCALE_CLASS_III':
            fee = 450;
            break;
          case 'FUEL_DISPENSER':
            fee = 1500;
            break;
          case 'FLOW_METER':
            fee = 1200;
            break;
          case 'CHECKWEIGHER':
            fee = 850;
            break;
          case 'WEIGHTS_CLASS_F2':
            fee = 600;
            break;
          default:
            fee = 500;
        }
      }

      // 3. Create application strictly in 'SUBMITTED' status
      const appId = `app-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const count = tx.applications.size + 1;
      const appNumber = `APP-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

      const application: Application = {
        id: appId,
        applicationNumber: appNumber,
        traderId: dto.traderId,
        businessId: dto.businessId,
        instrumentId: newInstrument.id,
        status: 'SUBMITTED', // Forced by state machine
        submittedAt: new Date().toISOString(),
        verificationFee: fee,
        feePaid: true
      };

      tx.applications.set(application.id, application);

      return this.enrichApplication(application);
    });
  }

  /**
   * Admin assigns an application to an LMO officer.
   * State machine check: can only transition from 'SUBMITTED' -> 'ASSIGNED'
   */
  async assignOfficer(applicationId: string, lmoId: string, _adminId: string): Promise<Application> {
    const app = db.applications.get(applicationId);
    if (!app) {
      const err = new Error(`Application ${applicationId} not found`);
      (err as any).statusCode = 404;
      throw err;
    }

    if (app.status !== 'SUBMITTED') {
      throw new InvalidStateTransitionError(app.status, 'ASSIGNED');
    }

    const lmo = db.users.get(lmoId);
    if (!lmo || lmo.role !== 'LMO') {
      const err = new Error(`Valid Legal Metrology Officer with ID ${lmoId} not found`);
      (err as any).statusCode = 400;
      throw err;
    }

    app.status = 'ASSIGNED';
    app.lmoId = lmoId;
    app.assignedAt = new Date().toISOString();
    db.applications.set(app.id, app);

    return this.enrichApplication(app);
  }

  /**
   * Get application with joined relations
   */
  async getApplicationById(id: string): Promise<Application | null> {
    const app = db.applications.get(id);
    if (!app) return null;
    return this.enrichApplication(app);
  }

  /**
   * Fetch applications list filtered by role or query
   */
  async listApplications(filters?: {
    traderId?: string;
    lmoId?: string;
    status?: ApplicationStatus;
    search?: string;
  }): Promise<Application[]> {
    let list = Array.from(db.applications.values());

    if (filters?.traderId) {
      list = list.filter(a => a.traderId === filters.traderId);
    }

    if (filters?.lmoId) {
      list = list.filter(a => a.lmoId === filters.lmoId);
    }

    if (filters?.status) {
      list = list.filter(a => a.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(a => {
        const enriched = this.enrichApplication(a);
        return (
          a.applicationNumber.toLowerCase().includes(q) ||
          enriched.business?.tradeName.toLowerCase().includes(q) ||
          enriched.instrument?.serialNumber.toLowerCase().includes(q)
        );
      });
    }

    // Sort descending by submission date
    list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return list.map(a => this.enrichApplication(a));
  }

  /**
   * Pendency stats for Admin dashboard
   */
  getPendencyStats() {
    const all = Array.from(db.applications.values());
    const now = Date.now();

    const stats = {
      total: all.length,
      submitted: all.filter(a => a.status === 'SUBMITTED').length,
      assigned: all.filter(a => a.status === 'ASSIGNED').length,
      inspected: all.filter(a => a.status === 'INSPECTED').length,
      approved: all.filter(a => a.status === 'APPROVED').length,
      rejected: all.filter(a => a.status === 'REJECTED').length,
      totalCertificatesIssued: db.certificates.size,
      aging: {
        lessThan3Days: 0,
        between3And7Days: 0,
        over7Days: 0
      },
      zoneDistribution: {} as Record<string, { total: number; pending: number; certified: number }>
    };

    all.forEach(app => {
      const ageDays = (now - new Date(app.submittedAt).getTime()) / (24 * 3600 * 1000);
      if (app.status === 'SUBMITTED' || app.status === 'ASSIGNED' || app.status === 'INSPECTED') {
        if (ageDays < 3) stats.aging.lessThan3Days++;
        else if (ageDays <= 7) stats.aging.between3And7Days++;
        else stats.aging.over7Days++;
      }

      const biz = db.businesses.get(app.businessId);
      const zone = biz?.zone || 'Unassigned Zone';
      if (!stats.zoneDistribution[zone]) {
        stats.zoneDistribution[zone] = { total: 0, pending: 0, certified: 0 };
      }
      stats.zoneDistribution[zone].total++;
      if (app.status === 'APPROVED') {
        stats.zoneDistribution[zone].certified++;
      } else if (app.status !== 'REJECTED') {
        stats.zoneDistribution[zone].pending++;
      }
    });

    return stats;
  }

  private enrichApplication(app: Application): Application {
    const business = db.businesses.get(app.businessId);
    const instrument = db.instruments.get(app.instrumentId);
    const lmo = app.lmoId ? db.users.get(app.lmoId) : undefined;
    const inspection = db.inspections.get(app.id) || Array.from(db.inspections.values()).find(i => i.applicationId === app.id);
    const certificate = db.certificates.get(app.id) || Array.from(db.certificates.values()).find(c => c.applicationId === app.id);

    return {
      ...app,
      business,
      instrument,
      lmo,
      inspection,
      certificate
    };
  }
}

export const applicationService = new ApplicationService();
