export type Role = 'TRADER' | 'LMO' | 'ADMIN';

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'INSPECTED'
  | 'APPROVED'
  | 'REJECTED';

export type CertificateStatus = 'VALID' | 'EXPIRED' | 'REVOKED';

export type InstrumentCategory =
  | 'WEIGHING_SCALE_CLASS_III'
  | 'FUEL_DISPENSER'
  | 'FLOW_METER'
  | 'CHECKWEIGHER'
  | 'WEIGHTS_CLASS_F2';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: Role;
  jurisdictionZone?: string;
  designation?: string;
  avatarUrl?: string;
}

export interface Business {
  id: string;
  traderId: string;
  legalName: string;
  tradeName: string;
  registrationNumber: string; // GSTIN / Trade License
  address: string;
  district: string;
  zone: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
}

export interface Instrument {
  id: string;
  businessId: string;
  category: InstrumentCategory;
  make: string;
  modelNumber: string;
  serialNumber: string;
  maxCapacity: string;
  verificationDivision: string; // e.g. "e = 1g", "0.01L"
  accuracyClass: string; // Class I, Class II, Class III, Class IV
  manufacturingYear: number;
  prevCertNumber?: string;
}

export interface Application {
  id: string;
  applicationNumber: string; // e.g. APP-2026-9042
  traderId: string;
  businessId: string;
  instrumentId: string;
  status: ApplicationStatus;
  lmoId?: string;
  submittedAt: string;
  assignedAt?: string;
  inspectedAt?: string;
  decidedAt?: string;
  rejectionReason?: string;
  verificationFee: number;
  feePaid: boolean;
  business?: Business;
  instrument?: Instrument;
  lmo?: User;
  inspection?: Inspection;
  certificate?: Certificate;
}

export interface InspectionMetrics {
  zeroReturnTest: 'PASS' | 'FAIL';
  eccentricityTest: 'PASS' | 'FAIL';
  repeatabilityTest: 'PASS' | 'FAIL';
  maxPermissibleErrorTest: 'PASS' | 'FAIL';
  appliedStandardMassKg: number;
  indicatedReadingKg: number;
  errorMarginValue: number;
  mpeAllowedTolerance: number;
}

export interface Inspection {
  id: string;
  applicationId: string;
  lmoId: string;
  inspectedAt: string;
  inspectorLatitude: number;
  inspectorLongitude: number;
  distanceFromShopMeters: number;
  withinGeoFence: boolean;
  metrics: InspectionMetrics;
  tamperSealNumber: string;
  hologramStickerId: string;
  verificationStampImpression: string; // stamp code
  sitePhotoUrl?: string;
  inspectorRemarks: string;
}

export interface Certificate {
  id: string;
  applicationId: string;
  certNumber: string; // @unique
  qrHash: string; // @unique HMAC-signed token
  qrDataUrl?: string;
  issuedAt: string;
  validUntil: string;
  status: CertificateStatus;
  lmoId: string;
  lmoName: string;
  lmoDesignation: string;
  leadSealNumber: string;
  hologramId: string;
  verificationFeePaid: number;
  // Denormalized for rapid O(1) verify responses
  businessName: string;
  tradeName: string;
  businessAddress: string;
  instrumentCategory: InstrumentCategory;
  instrumentMake: string;
  instrumentModel: string;
  instrumentSerial: string;
  maxCapacity: string;
  accuracyClass: string;
}
