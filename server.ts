import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/lib/db';
import { validateGeoFence } from './server/lib/geo';
import { applicationService, InvalidStateTransitionError } from './server/services/application.service';
import { inspectionService } from './server/services/inspection.service';
import { certificateService } from './server/services/certificate.service';
import { Role } from './server/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ==========================================
  // AUTH & SESSION DEMO ENDPOINTS
  // ==========================================
  // Password on User is optional: LMOs/Traders prefer OTP-over-phone, Admins use email/password
  app.get('/api/auth/users', (_req: Request, res: Response) => {
    const userList = Array.from(db.users.values());
    res.json({ users: userList });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { userId, role, phone, email } = req.body;

    let user;
    if (userId) {
      user = db.users.get(userId);
    } else if (phone) {
      user = Array.from(db.users.values()).find(u => u.phone === phone);
    } else if (email) {
      user = Array.from(db.users.values()).find(u => u.email?.toLowerCase() === email.toLowerCase());
    } else if (role) {
      user = Array.from(db.users.values()).find(u => u.role === role);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found for given credentials' });
    }

    res.json({
      success: true,
      user,
      token: `demo-token-${user.id}-${Date.now()}`
    });
  });

  // ==========================================
  // PUBLIC VERIFICATION (O(1) Indexed Lookup)
  // ==========================================
  // GET /api/verify?hash=<hmac_token> or ?cert=<certNumber>
  app.get('/api/verify', async (req: Request, res: Response) => {
    try {
      const hash = req.query.hash as string;
      const certNumber = (req.query.certNumber || req.query.cert) as string;

      const result = await certificateService.verifyByHashOrNumber({
        hash,
        certNumber
      });

      if (!result.verified) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal verification error' });
    }
  });

  // ==========================================
  // GEO-CHECK ENDPOINT (Haversine 100m Validation)
  // ==========================================
  // POST /api/geo-check
  app.post('/api/geo-check', (req: Request, res: Response) => {
    const { shopLat, shopLon, inspectorLat, inspectorLon, thresholdMeters = 100 } = req.body;

    if (
      shopLat === undefined ||
      shopLon === undefined ||
      inspectorLat === undefined ||
      inspectorLon === undefined
    ) {
      return res.status(400).json({
        error: 'Missing required coordinates: shopLat, shopLon, inspectorLat, inspectorLon'
      });
    }

    const result = validateGeoFence(
      { latitude: Number(shopLat), longitude: Number(shopLon) },
      { latitude: Number(inspectorLat), longitude: Number(inspectorLon) },
      Number(thresholdMeters)
    );

    res.json(result);
  });

  // ==========================================
  // APPLICATIONS API
  // ==========================================
  // GET /api/applications - list applications with optional filters
  app.get('/api/applications', async (req: Request, res: Response) => {
    try {
      const { traderId, lmoId, status, search } = req.query;
      const list = await applicationService.listApplications({
        traderId: traderId as string,
        lmoId: lmoId as string,
        status: status as any,
        search: search as string
      });
      res.json({ applications: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/applications/:id
  app.get('/api/applications/:id', async (req: Request, res: Response) => {
    try {
      const appRecord = await applicationService.getApplicationById(req.params.id);
      if (!appRecord) {
        return res.status(404).json({ error: 'Application not found' });
      }
      res.json({ application: appRecord });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/applications/submit - Trader creates application & instrument
  // The submit route deliberately never lets the client set status, lmoId, or link an existing in-progress application
  app.post('/api/applications/submit', async (req: Request, res: Response) => {
    try {
      const { traderId, businessId, instrument, verificationFee } = req.body;

      if (!traderId || !businessId || !instrument) {
        return res.status(400).json({
          error: 'Missing required payload: traderId, businessId, and instrument details are required.'
        });
      }

      if (!instrument.category || !instrument.make || !instrument.serialNumber) {
        return res.status(400).json({
          error: 'Missing instrument properties: category, make, and serialNumber are mandatory.'
        });
      }

      const createdApp = await applicationService.submitApplication({
        traderId,
        businessId,
        instrument,
        verificationFee
      });

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully. Status is SUBMITTED and queued for LMO assignment.',
        application: createdApp
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  });

  // POST /api/applications/:id/assign - Admin assigns LMO
  app.post('/api/applications/:id/assign', async (req: Request, res: Response) => {
    try {
      const { lmoId, adminId } = req.body;
      if (!lmoId) {
        return res.status(400).json({ error: 'lmoId is required' });
      }

      const updated = await applicationService.assignOfficer(req.params.id, lmoId, adminId || 'admin-1');
      res.json({
        success: true,
        message: `Application assigned to Legal Metrology Officer.`,
        application: updated
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  });

  // POST /api/applications/:id/inspect - LMO submits inspection (mobile / field)
  app.post('/api/applications/:id/inspect', async (req: Request, res: Response) => {
    try {
      const {
        lmoId,
        inspectorLatitude,
        inspectorLongitude,
        metrics,
        tamperSealNumber,
        hologramStickerId,
        verificationStampImpression,
        inspectorRemarks,
        sitePhotoUrl,
        forceBypassGeoFence
      } = req.body;

      if (!lmoId) {
        return res.status(400).json({ error: 'lmoId is required' });
      }

      if (inspectorLatitude === undefined || inspectorLongitude === undefined) {
        return res.status(400).json({ error: 'inspectorLatitude and inspectorLongitude are mandatory for statutory inspection' });
      }

      const inspection = await inspectionService.submitInspection({
        applicationId: req.params.id,
        lmoId,
        inspectorLatitude: Number(inspectorLatitude),
        inspectorLongitude: Number(inspectorLongitude),
        metrics: metrics || {
          zeroReturnTest: 'PASS',
          eccentricityTest: 'PASS',
          repeatabilityTest: 'PASS',
          maxPermissibleErrorTest: 'PASS',
          appliedStandardMassKg: 50,
          indicatedReadingKg: 50,
          errorMarginValue: 0,
          mpeAllowedTolerance: 0.05
        },
        tamperSealNumber: tamperSealNumber || `SEAL-${Date.now().toString(36).toUpperCase()}`,
        hologramStickerId: hologramStickerId || `HOLO-${Date.now().toString(36).toUpperCase()}`,
        verificationStampImpression: verificationStampImpression || `IND-DL-${new Date().getFullYear()}`,
        inspectorRemarks: inspectorRemarks || 'All statutory tolerances verified on site.',
        sitePhotoUrl,
        forceBypassGeoFence: Boolean(forceBypassGeoFence)
      });

      res.json({
        success: true,
        message: 'Field inspection recorded successfully. Application is now in INSPECTED status.',
        inspection
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({
        error: error.message,
        geoDetails: error.geoDetails
      });
    }
  });

  // POST /api/applications/:id/decision - LMO approves or rejects
  app.post('/api/applications/:id/decision', async (req: Request, res: Response) => {
    try {
      const { lmoId, decision, rejectionReason, leadSealNumber, hologramId } = req.body;

      if (!lmoId || !decision) {
        return res.status(400).json({ error: 'lmoId and decision ("APPROVED" or "REJECTED") are required' });
      }

      if (decision !== 'APPROVED' && decision !== 'REJECTED') {
        return res.status(400).json({ error: 'Decision must be APPROVED or REJECTED' });
      }

      const result = await certificateService.processDecision({
        applicationId: req.params.id,
        lmoId,
        decision,
        rejectionReason,
        leadSealNumber,
        hologramId
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  });

  // ==========================================
  // CERTIFICATES API
  // ==========================================
  // GET /api/certificates/:id - get certificate details
  app.get('/api/certificates/:id', (req: Request, res: Response) => {
    const cert = Array.from(db.certificates.values()).find(
      c => c.id === req.params.id || c.applicationId === req.params.id
    );
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    res.json({ certificate: cert });
  });

  // GET /api/certificates/:id/pdf - formatted printable certificate payload
  app.get('/api/certificates/:id/pdf', (req: Request, res: Response) => {
    const cert = Array.from(db.certificates.values()).find(
      c => c.id === req.params.id || c.applicationId === req.params.id
    );
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const appRecord = db.applications.get(cert.applicationId);
    const inspection = db.inspections.get(cert.applicationId);

    res.json({
      title: 'FORM VIII - CERTIFICATE OF VERIFICATION',
      act: 'Legal Metrology Act, 2009 & Legal Metrology (General) Rules, 2011',
      certificate: cert,
      inspectionDetails: inspection,
      verificationStamp: inspection?.verificationStampImpression || 'IND-DL-2026',
      generatedAt: new Date().toISOString()
    });
  });

  // ==========================================
  // ADMIN & METADATA ENDPOINTS
  // ==========================================
  // GET /api/admin/stats
  app.get('/api/admin/stats', (_req: Request, res: Response) => {
    const stats = applicationService.getPendencyStats();
    res.json(stats);
  });

  // GET /api/lmos - list officers with active assignment count
  app.get('/api/lmos', (_req: Request, res: Response) => {
    const lmos = Array.from(db.users.values()).filter(u => u.role === 'LMO');
    const apps = Array.from(db.applications.values());

    const result = lmos.map(lmo => {
      const activeAssignments = apps.filter(
        a => a.lmoId === lmo.id && (a.status === 'ASSIGNED' || a.status === 'INSPECTED')
      ).length;
      const completed = apps.filter(a => a.lmoId === lmo.id && a.status === 'APPROVED').length;

      return {
        ...lmo,
        activeAssignments,
        completed
      };
    });

    res.json({ lmos: result });
  });

  // GET /api/businesses
  app.get('/api/businesses', (req: Request, res: Response) => {
    const traderId = req.query.traderId as string;
    let list = Array.from(db.businesses.values());
    if (traderId) {
      list = list.filter(b => b.traderId === traderId);
    }
    res.json({ businesses: list });
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      applicationsCount: db.applications.size,
      certificatesCount: db.certificates.size
    });
  });

  // ==========================================
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Legal Metrology Verification Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
