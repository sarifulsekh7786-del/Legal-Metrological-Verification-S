import {
  User,
  Business,
  Instrument,
  Application,
  Inspection,
  Certificate
} from '../types';
import { generateSignedQrHash, generateQrDataUrl } from './qr';

// In-memory relational database tables
export class MetrologyDatabase {
  users: Map<string, User> = new Map();
  businesses: Map<string, Business> = new Map();
  instruments: Map<string, Instrument> = new Map();
  applications: Map<string, Application> = new Map();
  inspections: Map<string, Inspection> = new Map(); // 1:1 on applicationId
  certificates: Map<string, Certificate> = new Map(); // 1:1 on applicationId

  // O(1) indexes required by design
  qrHashIndex: Map<string, string> = new Map(); // qrHash -> certificateId
  certNumberIndex: Map<string, string> = new Map(); // certNumber -> certificateId

  constructor() {
    this.seed();
  }

  private async seed() {
    // 1. Users
    const admin: User = {
      id: 'usr-admin-1',
      name: 'Dr. P. K. Menon',
      email: 'admin.metrology@gov.in',
      phone: '+91 98100 12345',
      role: 'ADMIN',
      designation: 'Chief Controller of Legal Metrology',
      jurisdictionZone: 'Headquarters & State Oversight'
    };

    const lmo1: User = {
      id: 'usr-lmo-1',
      name: 'Inspector Vikram Sharma',
      email: 'v.sharma@metrology.gov.in',
      phone: '+91 98230 45678',
      role: 'LMO',
      designation: 'Senior Legal Metrology Officer',
      jurisdictionZone: 'Central Zone - District 4'
    };

    const lmo2: User = {
      id: 'usr-lmo-2',
      name: 'Inspector Ananya Roy',
      email: 'a.roy@metrology.gov.in',
      phone: '+91 98450 78901',
      role: 'LMO',
      designation: 'Legal Metrology Officer',
      jurisdictionZone: 'North Zone - District 2'
    };

    const lmo3: User = {
      id: 'usr-lmo-3',
      name: 'Inspector Rajesh Gupta',
      email: 'r.gupta@metrology.gov.in',
      phone: '+91 98710 33445',
      role: 'LMO',
      designation: 'Legal Metrology Officer',
      jurisdictionZone: 'West Zone - District 1'
    };

    const trader1: User = {
      id: 'usr-trader-1',
      name: 'Rajesh Agrawal',
      email: 'rajesh@agrawaltraders.in',
      phone: '+91 98111 22334',
      role: 'TRADER',
      designation: 'Managing Partner'
    };

    const trader2: User = {
      id: 'usr-trader-2',
      name: 'Sunil Mehta',
      email: 'sunil@apexpetro.com',
      phone: '+91 98222 33445',
      role: 'TRADER',
      designation: 'Director of Operations'
    };

    [admin, lmo1, lmo2, lmo3, trader1, trader2].forEach(u => this.users.set(u.id, u));

    // 2. Businesses
    const biz1: Business = {
      id: 'biz-1',
      traderId: trader1.id,
      legalName: 'Agrawal Trading Enterprises LLP',
      tradeName: 'Agrawal SuperMart & Wholesale Grains',
      registrationNumber: 'GSTIN07AAACA1234F1Z5',
      address: 'Shop 14-16, Mandi Commercial Complex, Ring Road, Central District',
      district: 'Central District',
      zone: 'Central Zone - District 4',
      latitude: 28.6328,
      longitude: 77.2197,
      contactPhone: '+91 98111 22334'
    };

    const biz2: Business = {
      id: 'biz-2',
      traderId: trader2.id,
      legalName: 'Apex Petroleum & Fuel Logistics Ltd',
      tradeName: 'Apex Express Auto Fuels Station #12',
      registrationNumber: 'GSTIN07AAACB9876G2Z8',
      address: 'Plot 4B, Sector 18 Highway Junction, North District',
      district: 'North District',
      zone: 'North Zone - District 2',
      latitude: 28.7041,
      longitude: 77.1025,
      contactPhone: '+91 98222 33445'
    };

    [biz1, biz2].forEach(b => this.businesses.set(b.id, b));

    // 3. Instruments
    const inst1: Instrument = {
      id: 'inst-1',
      businessId: biz1.id,
      category: 'WEIGHING_SCALE_CLASS_III',
      make: 'Avery Weigh-Tronix',
      modelNumber: 'E-1010 Heavy Platform',
      serialNumber: 'AW-2024-88421',
      maxCapacity: '150 kg (e = 20g, d = 5g)',
      verificationDivision: 'e = 20g',
      accuracyClass: 'Class III (Medium Accuracy)',
      manufacturingYear: 2024,
      prevCertNumber: 'LM-2025-DL-44120'
    };

    const inst2: Instrument = {
      id: 'inst-2',
      businessId: biz1.id,
      category: 'WEIGHING_SCALE_CLASS_III',
      make: 'Essae-Teraoka',
      modelNumber: 'DS-215 Countertop Digital Scale',
      serialNumber: 'ES-2025-11094',
      maxCapacity: '30 kg (e = 5g)',
      verificationDivision: 'e = 5g',
      accuracyClass: 'Class III (Medium Accuracy)',
      manufacturingYear: 2025
    };

    const inst3: Instrument = {
      id: 'inst-3',
      businessId: biz2.id,
      category: 'FUEL_DISPENSER',
      make: 'Wayne Fueling Systems',
      modelNumber: 'Helix 5000 Dual Nozzle',
      serialNumber: 'WF-5000-99231',
      maxCapacity: '50 L/min (Dispensing Nozzle 1 & 2)',
      verificationDivision: '0.01 Liter',
      accuracyClass: 'Class 0.5 (Measuring Systems for Liquids)',
      manufacturingYear: 2023
    };

    const inst4: Instrument = {
      id: 'inst-4',
      businessId: biz1.id,
      category: 'WEIGHTS_CLASS_F2',
      make: 'Standard Metrology Works',
      modelNumber: 'Precision Cast Brass Weights Set 500g-20kg',
      serialNumber: 'SMW-F2-7721',
      maxCapacity: 'Total 20 kg Set',
      verificationDivision: 'Class F2 verification tolerance',
      accuracyClass: 'Class F2',
      manufacturingYear: 2024
    };

    [inst1, inst2, inst3, inst4].forEach(i => this.instruments.set(i.id, i));

    // 4. Pre-seeded Certificate for inst1 (APPROVED application)
    const appId1 = 'app-1001';
    const certNumber1 = 'LM-2026-DL-88219';
    const qrHash1 = generateSignedQrHash(certNumber1, appId1);
    const verifyUrl1 = `/verify?hash=${qrHash1}`;
    const qrDataUrl1 = await generateQrDataUrl(verifyUrl1);

    const cert1: Certificate = {
      id: 'cert-1',
      applicationId: appId1,
      certNumber: certNumber1,
      qrHash: qrHash1,
      qrDataUrl: qrDataUrl1,
      issuedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      validUntil: new Date(Date.now() + 351 * 24 * 3600 * 1000).toISOString(),
      status: 'VALID',
      lmoId: lmo1.id,
      lmoName: lmo1.name,
      lmoDesignation: lmo1.designation || 'Senior Legal Metrology Officer',
      leadSealNumber: 'SEAL-DL-88902-LEAD',
      hologramId: 'HOLO-GOV-99318',
      verificationFeePaid: 850,
      businessName: biz1.legalName,
      tradeName: biz1.tradeName,
      businessAddress: biz1.address,
      instrumentCategory: inst1.category,
      instrumentMake: inst1.make,
      instrumentModel: inst1.modelNumber,
      instrumentSerial: inst1.serialNumber,
      maxCapacity: inst1.maxCapacity,
      accuracyClass: inst1.accuracyClass
    };

    this.certificates.set(cert1.id, cert1);
    this.qrHashIndex.set(cert1.qrHash, cert1.id);
    this.certNumberIndex.set(cert1.certNumber, cert1.id);

    // Inspection for app-1001
    const insp1: Inspection = {
      id: 'insp-1',
      applicationId: appId1,
      lmoId: lmo1.id,
      inspectedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      inspectorLatitude: 28.6331,
      inspectorLongitude: 77.2195,
      distanceFromShopMeters: 38.4,
      withinGeoFence: true,
      metrics: {
        zeroReturnTest: 'PASS',
        eccentricityTest: 'PASS',
        repeatabilityTest: 'PASS',
        maxPermissibleErrorTest: 'PASS',
        appliedStandardMassKg: 100.0,
        indicatedReadingKg: 100.01,
        errorMarginValue: 0.01,
        mpeAllowedTolerance: 0.04
      },
      tamperSealNumber: 'SEAL-DL-88902-LEAD',
      hologramStickerId: 'HOLO-GOV-99318',
      verificationStampImpression: 'IND-DL-04-2026',
      inspectorRemarks: 'Instrument passes all statutory tests under Legal Metrology (General) Rules 2011. Verified & stamped on site within geofence.'
    };
    this.inspections.set(insp1.id, insp1);

    // Application 1 (APPROVED)
    const app1: Application = {
      id: appId1,
      applicationNumber: 'APP-2026-0814',
      traderId: trader1.id,
      businessId: biz1.id,
      instrumentId: inst1.id,
      status: 'APPROVED',
      lmoId: lmo1.id,
      submittedAt: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
      assignedAt: new Date(Date.now() - 16 * 24 * 3600 * 1000).toISOString(),
      inspectedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      decidedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      verificationFee: 850,
      feePaid: true
    };
    this.applications.set(app1.id, app1);

    // Application 2 (ASSIGNED to LMO 1 - ready for Inspection on mobile)
    const app2: Application = {
      id: 'app-1002',
      applicationNumber: 'APP-2026-0922',
      traderId: trader1.id,
      businessId: biz1.id,
      instrumentId: inst2.id,
      status: 'ASSIGNED',
      lmoId: lmo1.id,
      submittedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      assignedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      verificationFee: 450,
      feePaid: true
    };
    this.applications.set(app2.id, app2);

    // Application 3 (SUBMITTED - pending Admin assignment)
    const app3: Application = {
      id: 'app-1003',
      applicationNumber: 'APP-2026-0941',
      traderId: trader2.id,
      businessId: biz2.id,
      instrumentId: inst3.id,
      status: 'SUBMITTED',
      submittedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      verificationFee: 1500,
      feePaid: true
    };
    this.applications.set(app3.id, app3);

    // Application 4 (INSPECTED - pending decision by LMO 2)
    const app4Id = 'app-1004';
    const insp4: Inspection = {
      id: 'insp-4',
      applicationId: app4Id,
      lmoId: lmo2.id,
      inspectedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      inspectorLatitude: 28.6327,
      inspectorLongitude: 77.2198,
      distanceFromShopMeters: 14.2,
      withinGeoFence: true,
      metrics: {
        zeroReturnTest: 'PASS',
        eccentricityTest: 'PASS',
        repeatabilityTest: 'PASS',
        maxPermissibleErrorTest: 'PASS',
        appliedStandardMassKg: 20.0,
        indicatedReadingKg: 20.002,
        errorMarginValue: 0.002,
        mpeAllowedTolerance: 0.01
      },
      tamperSealNumber: 'SEAL-DL-91044-LEAD',
      hologramStickerId: 'HOLO-GOV-10294',
      verificationStampImpression: 'IND-DL-02-2026',
      inspectorRemarks: 'Precision weights set verified against Working Standard weights. Calibration errors within tolerance.'
    };
    this.inspections.set(insp4.id, insp4);

    const app4: Application = {
      id: app4Id,
      applicationNumber: 'APP-2026-0899',
      traderId: trader1.id,
      businessId: biz1.id,
      instrumentId: inst4.id,
      status: 'INSPECTED',
      lmoId: lmo2.id,
      submittedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      assignedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      inspectedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      verificationFee: 600,
      feePaid: true
    };
    this.applications.set(app4.id, app4);
  }

  /**
   * Helper to simulate atomic $transaction execution
   */
  async $transaction<T>(operation: (tx: MetrologyDatabase) => Promise<T>): Promise<T> {
    // In this memory database, synchronous execution within node event loop is atomic.
    return await operation(this);
  }
}

// Singleton database instance
export const db = new MetrologyDatabase();
