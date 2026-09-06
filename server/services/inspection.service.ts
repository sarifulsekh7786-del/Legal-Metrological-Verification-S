import { db } from '../lib/db';
import { validateGeoFence } from '../lib/geo';
import {
  Inspection,
  InspectionMetrics
} from '../types';
import { InvalidStateTransitionError } from './application.service';

export interface SubmitInspectionDTO {
  applicationId: string;
  lmoId: string;
  inspectorLatitude: number;
  inspectorLongitude: number;
  metrics: InspectionMetrics;
  tamperSealNumber: string;
  hologramStickerId: string;
  verificationStampImpression: string;
  inspectorRemarks: string;
  sitePhotoUrl?: string;
  forceBypassGeoFence?: boolean; // In case of manual override authorized by senior officer
}

export class InspectionService {
  async submitInspection(dto: SubmitInspectionDTO): Promise<Inspection> {
    const app = db.applications.get(dto.applicationId);
    if (!app) {
      const err = new Error(`Application ${dto.applicationId} not found`);
      (err as any).statusCode = 404;
      throw err;
    }

    // State machine check: Must be ASSIGNED to inspect
    if (app.status !== 'ASSIGNED') {
      throw new InvalidStateTransitionError(app.status, 'INSPECTED');
    }

    // Officer check
    if (app.lmoId && app.lmoId !== dto.lmoId) {
      const err = new Error(`Unauthorized: This application is assigned to officer ${app.lmoId}`);
      (err as any).statusCode = 403;
      throw err;
    }

    const business = db.businesses.get(app.businessId);
    if (!business) {
      const err = new Error(`Associated business ${app.businessId} not found`);
      (err as any).statusCode = 404;
      throw err;
    }

    // 100m Geo-fence Haversine check
    const geoValidation = validateGeoFence(
      { latitude: business.latitude, longitude: business.longitude },
      { latitude: dto.inspectorLatitude, longitude: dto.inspectorLongitude },
      100 // 100 meters standard legal requirement
    );

    // If outside 100m and not explicitly bypassed with reason
    if (!geoValidation.withinFence && !dto.forceBypassGeoFence) {
      const err = new Error(
        `Geo-fence validation failed: Inspector is ${geoValidation.distanceMeters}m away from the shop location. Maximum permissible distance is 100m.`
      );
      (err as any).statusCode = 422;
      (err as any).geoDetails = geoValidation;
      throw err;
    }

    return await db.$transaction(async (tx) => {
      const inspectionId = `insp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      const inspection: Inspection = {
        id: inspectionId,
        applicationId: dto.applicationId,
        lmoId: dto.lmoId,
        inspectedAt: new Date().toISOString(),
        inspectorLatitude: dto.inspectorLatitude,
        inspectorLongitude: dto.inspectorLongitude,
        distanceFromShopMeters: geoValidation.distanceMeters,
        withinGeoFence: geoValidation.withinFence,
        metrics: dto.metrics,
        tamperSealNumber: dto.tamperSealNumber.trim(),
        hologramStickerId: dto.hologramStickerId.trim(),
        verificationStampImpression: dto.verificationStampImpression.trim(),
        sitePhotoUrl: dto.sitePhotoUrl,
        inspectorRemarks: dto.inspectorRemarks.trim()
      };

      // 1:1 on applicationId
      tx.inspections.set(dto.applicationId, inspection);

      // Transition application to INSPECTED
      app.status = 'INSPECTED';
      app.inspectedAt = inspection.inspectedAt;
      tx.applications.set(app.id, app);

      return inspection;
    });
  }

  getInspectionByAppId(applicationId: string): Inspection | null {
    return db.inspections.get(applicationId) || null;
  }
}

export const inspectionService = new InspectionService();
