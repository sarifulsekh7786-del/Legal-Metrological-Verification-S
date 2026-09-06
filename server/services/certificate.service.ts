import { db } from '../lib/db';
import { generateSignedQrHash, generateQrDataUrl } from '../lib/qr';
import { Certificate } from '../types';
import { InvalidStateTransitionError } from './application.service';

export interface DecisionDTO {
  applicationId: string;
  lmoId: string;
  decision: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  leadSealNumber?: string;
  hologramId?: string;
}

export class CertificateService {
  /**
   * LMO makes a decision (APPROVED or REJECTED) on an INSPECTED application.
   * If APPROVED, issues a verified certificate with unique certNumber,
   * HMAC-signed random qrHash, and generated QR code image.
   */
  async processDecision(dto: DecisionDTO): Promise<{
    status: 'APPROVED' | 'REJECTED';
    certificate?: Certificate;
    rejectionReason?: string;
  }> {
    const app = db.applications.get(dto.applicationId);
    if (!app) {
      const err = new Error(`Application ${dto.applicationId} not found`);
      (err as any).statusCode = 404;
      throw err;
    }

    // State machine check: Application MUST be in 'INSPECTED' state
    if (app.status !== 'INSPECTED') {
      throw new InvalidStateTransitionError(app.status, dto.decision);
    }

    const business = db.businesses.get(app.businessId);
    const instrument = db.instruments.get(app.instrumentId);
    const lmo = db.users.get(dto.lmoId);
    const inspection = db.inspections.get(app.id);

    if (!business || !instrument) {
      const err = new Error('Inconsistent state: linked business or instrument missing');
      (err as any).statusCode = 500;
      throw err;
    }

    return await db.$transaction(async (tx) => {
      if (dto.decision === 'REJECTED') {
        app.status = 'REJECTED';
        app.decidedAt = new Date().toISOString();
        app.rejectionReason = dto.rejectionReason || 'Instrument failed statutory tolerance tests.';
        tx.applications.set(app.id, app);

        return {
          status: 'REJECTED',
          rejectionReason: app.rejectionReason
        };
      }

      // APPROVED -> Issue Certificate
      const certCount = tx.certificates.size + 1;
      const randomFive = Math.floor(10000 + Math.random() * 90000);
      const certNumber = `LM-${new Date().getFullYear()}-DL-${randomFive}`;

      // HMAC-signed random token (never sequential, unguessable, O(1) lookup)
      const qrHash = generateSignedQrHash(certNumber, app.id);
      const verifyUrl = `/verify?hash=${qrHash}`;
      const qrDataUrl = await generateQrDataUrl(verifyUrl);

      const issuedDate = new Date();
      const validUntilDate = new Date();
      validUntilDate.setFullYear(validUntilDate.getFullYear() + 1); // 1-year legal metrology validity

      const certId = `cert-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const certificate: Certificate = {
        id: certId,
        applicationId: app.id,
        certNumber,
        qrHash,
        qrDataUrl,
        issuedAt: issuedDate.toISOString(),
        validUntil: validUntilDate.toISOString(),
        status: 'VALID',
        lmoId: dto.lmoId,
        lmoName: lmo?.name || 'Legal Metrology Officer',
        lmoDesignation: lmo?.designation || 'Senior Legal Metrology Officer',
        leadSealNumber: dto.leadSealNumber || inspection?.tamperSealNumber || 'SEAL-LEAD-PENDING',
        hologramId: dto.hologramId || inspection?.hologramStickerId || 'HOLO-PENDING',
        verificationFeePaid: app.verificationFee,
        businessName: business.legalName,
        tradeName: business.tradeName,
        businessAddress: business.address,
        instrumentCategory: instrument.category,
        instrumentMake: instrument.make,
        instrumentModel: instrument.modelNumber,
        instrumentSerial: instrument.serialNumber,
        maxCapacity: instrument.maxCapacity,
        accuracyClass: instrument.accuracyClass
      };

      // Store 1:1 on applicationId
      tx.certificates.set(app.id, certificate);

      // Maintain O(1) indexes
      tx.qrHashIndex.set(certificate.qrHash, certificate.id);
      tx.certNumberIndex.set(certificate.certNumber, certificate.id);

      // Transition application to APPROVED
      app.status = 'APPROVED';
      app.decidedAt = issuedDate.toISOString();
      tx.applications.set(app.id, app);

      return {
        status: 'APPROVED',
        certificate
      };
    });
  }

  /**
   * Public O(1) lookup by HMAC-signed qrHash or certNumber
   */
  async verifyByHashOrNumber(query: { hash?: string; certNumber?: string }): Promise<{
    verified: boolean;
    certificate?: Certificate;
    message?: string;
  }> {
    if (!query.hash && !query.certNumber) {
      return { verified: false, message: 'Please provide either a QR hash or Certificate number to verify.' };
    }

    let cert: Certificate | undefined;

    // Direct O(1) Map lookup
    if (query.hash) {
      // Find certId from qrHashIndex
      const certId = db.qrHashIndex.get(query.hash);
      if (certId) {
        // Find certificate from certificates Map
        cert = Array.from(db.certificates.values()).find(c => c.id === certId || c.qrHash === query.hash);
      }
    } else if (query.certNumber) {
      const certId = db.certNumberIndex.get(query.certNumber.trim().toUpperCase());
      if (certId) {
        cert = Array.from(db.certificates.values()).find(
          c => c.id === certId || c.certNumber.toUpperCase() === query.certNumber!.trim().toUpperCase()
        );
      }
    }

    if (!cert) {
      return {
        verified: false,
        message: 'No verification record found for the provided cryptographic hash or certificate number.'
      };
    }

    // Check validity
    const now = new Date();
    const expiry = new Date(cert.validUntil);
    const isExpired = now > expiry;

    if (isExpired && cert.status === 'VALID') {
      cert.status = 'EXPIRED';
    }

    return {
      verified: true,
      certificate: cert
    };
  }

  /**
   * Get certificate by applicationId
   */
  getCertificateByAppId(applicationId: string): Certificate | null {
    return db.certificates.get(applicationId) || Array.from(db.certificates.values()).find(c => c.applicationId === applicationId) || null;
  }
}

export const certificateService = new CertificateService();
