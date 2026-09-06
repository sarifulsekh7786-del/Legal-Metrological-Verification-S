import React, { useEffect, useState } from 'react';
import {
  Scale,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  FileCheck2,
  Navigation,
  Compass,
  Calculator,
  ShieldCheck,
  Send,
  Eye,
  Camera,
  Smartphone
} from 'lucide-react';
import { api } from '../../lib/api';
import { Application, Certificate, GeoCheckResult, InspectionMetrics, User } from '../../types';

interface LmoPortalProps {
  currentUser: User;
  onOpenCertificateModal: (cert: Certificate) => void;
}

export const LmoPortal: React.FC<LmoPortalProps> = ({
  currentUser,
  onOpenCertificateModal
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectingApp, setInspectingApp] = useState<Application | null>(null);
  const [decidingApp, setDecidingApp] = useState<Application | null>(null);

  // Field Inspection Form State
  const [inspectorLat, setInspectorLat] = useState<number>(28.6331);
  const [inspectorLon, setInspectorLon] = useState<number>(77.2195);
  const [geoResult, setGeoResult] = useState<GeoCheckResult | null>(null);
  const [checkingGeo, setCheckingGeo] = useState(false);
  const [geoBypass, setGeoBypass] = useState(false);

  // Metrics
  const [zeroReturn, setZeroReturn] = useState<'PASS' | 'FAIL'>('PASS');
  const [eccentricity, setEccentricity] = useState<'PASS' | 'FAIL'>('PASS');
  const [repeatability, setRepeatability] = useState<'PASS' | 'FAIL'>('PASS');
  const [appliedMass, setAppliedMass] = useState<number>(50);
  const [indicatedReading, setIndicatedReading] = useState<number>(50.01);
  const [allowedTolerance, setAllowedTolerance] = useState<number>(0.05);

  // Seals
  const [leadSealNo, setLeadSealNo] = useState('');
  const [hologramId, setHologramId] = useState('');
  const [stampCode, setStampCode] = useState(`IND-DL-04-${new Date().getFullYear()}`);
  const [remarks, setRemarks] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Decision Form State
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    loadLmoData();
  }, [currentUser.id]);

  const loadLmoData = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications({ lmoId: currentUser.id });
      setApplications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openInspectionModal = (app: Application) => {
    setInspectingApp(app);
    setErrorMsg(null);
    setGeoResult(null);
    setGeoBypass(false);

    // Seed realistic coordinates close to the business shop
    if (app.business) {
      // 30 meters offset initially for a valid preset
      setInspectorLat(app.business.latitude + 0.0002);
      setInspectorLon(app.business.longitude + 0.0001);
    }

    setLeadSealNo(`SEAL-DL-${Math.floor(10000 + Math.random() * 90000)}-LEAD`);
    setHologramId(`HOLO-GOV-${Math.floor(10000 + Math.random() * 90000)}`);
    setRemarks('All statutory tolerance parameters verified on-site. Visual and sensitivity tests conforming to standard.');

    // Run initial geo check
    if (app.business) {
      verifyGeofenceWithCoords(
        app.business.latitude,
        app.business.longitude,
        app.business.latitude + 0.0002,
        app.business.longitude + 0.0001
      );
    }
  };

  const verifyGeofenceWithCoords = async (shopLat: number, shopLon: number, insLat: number, insLon: number) => {
    setCheckingGeo(true);
    try {
      const res = await api.geoCheck({
        shopLat,
        shopLon,
        inspectorLat: insLat,
        inspectorLon: insLon,
        thresholdMeters: 100
      });
      setGeoResult(res);
    } catch (e: any) {
      console.error('Geo check error:', e);
    } finally {
      setCheckingGeo(false);
    }
  };

  const handleUseRealGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setCheckingGeo(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setInspectorLat(pos.coords.latitude);
        setInspectorLon(pos.coords.longitude);
        if (inspectingApp?.business) {
          verifyGeofenceWithCoords(
            inspectingApp.business.latitude,
            inspectingApp.business.longitude,
            pos.coords.latitude,
            pos.coords.longitude
          );
        }
      },
      err => {
        setCheckingGeo(false);
        alert('Could not acquire GPS coordinates: ' + err.message);
      }
    );
  };

  const handleSimulateLocationPreset = (type: 'inside' | 'breach') => {
    if (!inspectingApp?.business) return;
    if (type === 'inside') {
      // ~35 meters
      const newLat = inspectingApp.business.latitude + 0.00025;
      const newLon = inspectingApp.business.longitude + 0.00015;
      setInspectorLat(newLat);
      setInspectorLon(newLon);
      verifyGeofenceWithCoords(inspectingApp.business.latitude, inspectingApp.business.longitude, newLat, newLon);
    } else {
      // ~380 meters away (geo breach test)
      const newLat = inspectingApp.business.latitude + 0.0032;
      const newLon = inspectingApp.business.longitude + 0.0028;
      setInspectorLat(newLat);
      setInspectorLon(newLon);
      verifyGeofenceWithCoords(inspectingApp.business.latitude, inspectingApp.business.longitude, newLat, newLon);
    }
  };

  // MPE calculation
  const errorMargin = Math.round((indicatedReading - appliedMass) * 1000) / 1000;
  const isMpePass = Math.abs(errorMargin) <= allowedTolerance;

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingApp) return;

    if (geoResult && !geoResult.withinFence && !geoBypass) {
      setErrorMsg(
        `Haversine Geo-fence check failed: You are ${geoResult.distanceMeters}m away from the shop (threshold is 100m). Either move closer or check the override authorization.`
      );
      return;
    }

    setSubmittingInspection(true);
    setErrorMsg(null);

    const metrics: InspectionMetrics = {
      zeroReturnTest: zeroReturn,
      eccentricityTest: eccentricity,
      repeatabilityTest: repeatability,
      maxPermissibleErrorTest: isMpePass ? 'PASS' : 'FAIL',
      appliedStandardMassKg: appliedMass,
      indicatedReadingKg: indicatedReading,
      errorMarginValue: errorMargin,
      mpeAllowedTolerance: allowedTolerance
    };

    try {
      await api.submitInspection(inspectingApp.id, {
        lmoId: currentUser.id,
        inspectorLatitude: inspectorLat,
        inspectorLongitude: inspectorLon,
        metrics,
        tamperSealNumber: leadSealNo,
        hologramStickerId: hologramId,
        verificationStampImpression: stampCode,
        inspectorRemarks: remarks,
        forceBypassGeoFence: geoBypass
      });

      setInspectingApp(null);
      await loadLmoData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit inspection report');
    } finally {
      setSubmittingInspection(false);
    }
  };

  const handleProcessDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidingApp) return;

    setSubmittingDecision(true);
    try {
      const res = await api.submitDecision(decidingApp.id, {
        lmoId: currentUser.id,
        decision,
        rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined,
        leadSealNumber: decidingApp.inspection?.tamperSealNumber,
        hologramId: decidingApp.inspection?.hologramStickerId
      });

      setDecidingApp(null);
      await loadLmoData();

      if (res.certificate) {
        onOpenCertificateModal(res.certificate);
      }
    } catch (err: any) {
      alert('Decision error: ' + err.message);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const pendingFieldVisits = applications.filter(a => a.status === 'ASSIGNED');
  const readyForDecision = applications.filter(a => a.status === 'INSPECTED');
  const completed = applications.filter(a => a.status === 'APPROVED' || a.status === 'REJECTED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Officer Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Legal Metrology Field Officer Dashboard
            </span>
            <span className="text-xs text-slate-500 font-mono">LMO ID: {currentUser.id}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <span>{currentUser.name}</span>
            <span className="text-xs text-slate-500 font-normal">({currentUser.designation})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>Assigned Jurisdiction: <strong>{currentUser.jurisdictionZone}</strong></span>
          </p>
        </div>

        {/* Workload Pill Indicators */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
            <div className="font-bold text-amber-900 text-lg leading-tight">{pendingFieldVisits.length}</div>
            <div className="text-[10px] text-amber-700 font-medium uppercase">Pending Visit</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
            <div className="font-bold text-blue-900 text-lg leading-tight">{readyForDecision.length}</div>
            <div className="text-[10px] text-blue-700 font-medium uppercase">Pending Stamp</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
            <div className="font-bold text-emerald-900 text-lg leading-tight">{completed.length}</div>
            <div className="text-[10px] text-emerald-700 font-medium uppercase">Certified</div>
          </div>
        </div>
      </div>

      {/* Field Inspection Queue */}
      <div className="space-y-6">
        {/* 1. Pending Field Inspection Section (ASSIGNED) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Assigned Inspections Awaiting Field Visit (Haversine 100m Gate)
              </h2>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {pendingFieldVisits.length} Assigned
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading assignments...</div>
          ) : pendingFieldVisits.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No pending field visits assigned to you currently.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingFieldVisits.map(app => (
                <div key={app.id} className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-900 text-sm">{app.applicationNumber}</span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Action Required: On-Site Inspection
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900">
                      {app.instrument?.make} • {app.instrument?.modelNumber} ({app.instrument?.serialNumber})
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{app.business?.tradeName} — {app.business?.address}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Coordinates: {app.business?.latitude}, {app.business?.longitude} • Class: {app.instrument?.accuracyClass}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id={`start-inspection-btn-${app.id}`}
                      onClick={() => openInspectionModal(app)}
                      className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Conduct Field Inspection</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Inspected Applications Awaiting Statutory Decision (INSPECTED) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Inspected Instruments Pending Statutory Decision & Cryptographic QR Issuance
              </h2>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {readyForDecision.length} Pending
            </span>
          </div>

          {readyForDecision.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No inspected applications awaiting final sign-off.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {readyForDecision.map(app => (
                <div key={app.id} className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-900 text-sm">{app.applicationNumber}</span>
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Field Inspection Passed
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900">
                      {app.instrument?.make} ({app.instrument?.serialNumber}) — {app.business?.tradeName}
                    </div>
                    {app.inspection && (
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                        <span>Geofence Distance: <strong>{app.inspection.distanceFromShopMeters}m</strong></span>
                        <span>MPE Test: <strong className="text-emerald-700">{app.inspection.metrics.maxPermissibleErrorTest}</strong></span>
                        <span>Seal: <strong className="font-mono">{app.inspection.tamperSealNumber}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id={`decide-btn-${app.id}`}
                      onClick={() => {
                        setDecidingApp(app);
                        setDecision('APPROVED');
                        setRejectionReason('');
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Issue Certificate & Stamp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Field Inspection Form Modal */}
      {inspectingApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Statutory Field Checklist
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {inspectingApp.applicationNumber}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  On-Site Inspection & Tolerances Verification
                </h2>
              </div>
              <button
                onClick={() => setInspectingApp(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitInspection} className="space-y-4 text-xs">
              {/* SECTION 1: 100M GEOFENCE VALIDATION */}
              <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span>1. Haversine 100m Geo-Fence Validation</span>
                  </div>
                  {geoResult && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      geoResult.withinFence
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {geoResult.withinFence ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {geoResult.withinFence ? `Within Fence (${geoResult.distanceMeters}m)` : `Breached (${geoResult.distanceMeters}m > 100m)`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px] bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Registered Shop GPS:</span>
                    <span className="font-mono font-medium text-slate-800">
                      {inspectingApp.business?.latitude}, {inspectingApp.business?.longitude}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Inspector Current GPS:</span>
                    <span className="font-mono font-medium text-blue-900">
                      {inspectorLat.toFixed(5)}, {inspectorLon.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Simulated Presets & Real GPS buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUseRealGps}
                    className="px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded text-[11px] transition flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    {checkingGeo ? 'Acquiring GPS...' : 'Acquire Live Device GPS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateLocationPreset('inside')}
                    className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded text-[11px] transition"
                  >
                    Preset: At Shop (~35m)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateLocationPreset('breach')}
                    className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold rounded text-[11px] transition"
                  >
                    Preset: Far Offsite (~380m)
                  </button>
                </div>

                {geoResult && !geoResult.withinFence && (
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="geo-bypass-check"
                      checked={geoBypass}
                      onChange={e => setGeoBypass(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <label htmlFor="geo-bypass-check" className="text-rose-800 text-[11px] font-medium cursor-pointer">
                      Special authorization override: Officer permitted off-site calibration testing
                    </label>
                  </div>
                )}
              </div>

              {/* SECTION 2: PHYSICAL & ACCURACY TOLERANCE TESTS */}
              <div className="border border-slate-300 rounded-xl p-4 bg-white space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>2. Statutory Metrological Verification Tests</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Zero Return Test</label>
                    <select
                      value={zeroReturn}
                      onChange={e => setZeroReturn(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-bold text-slate-800"
                    >
                      <option value="PASS">PASS (Zero within ±0.25e)</option>
                      <option value="FAIL">FAIL (Zero Drift)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Eccentric Loading</label>
                    <select
                      value={eccentricity}
                      onChange={e => setEccentricity(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-bold text-slate-800"
                    >
                      <option value="PASS">PASS (All 4 Quadrants)</option>
                      <option value="FAIL">FAIL (Corner Error)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Repeatability Test</label>
                    <select
                      value={repeatability}
                      onChange={e => setRepeatability(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-bold text-slate-800"
                    >
                      <option value="PASS">PASS (3 Cycles Valid)</option>
                      <option value="FAIL">FAIL (Inconsistent)</option>
                    </select>
                  </div>
                </div>

                {/* Maximum Permissible Error (MPE) Tolerance Test */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-[11px]">
                      Maximum Permissible Error (MPE) Calculator
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      isMpePass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      MPE Status: {isMpePass ? 'PASS (Within Tolerance)' : 'FAIL (Exceeds Tolerance)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <label className="block text-slate-500 mb-0.5">Applied Standard Mass (kg)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={appliedMass}
                        onChange={e => setAppliedMass(Number(e.target.value))}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-0.5">Indicated Reading (kg)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={indicatedReading}
                        onChange={e => setIndicatedReading(Number(e.target.value))}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-0.5">Error Margin (Deviation)</label>
                      <div className="p-1.5 bg-white border border-slate-200 rounded font-mono font-bold text-blue-900">
                        {errorMargin >= 0 ? `+${errorMargin}` : errorMargin} kg (Tol: ±{allowedTolerance}kg)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PHYSICAL SEALS & STAMPING */}
              <div className="border border-slate-300 rounded-xl p-4 bg-white space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>3. Tamper-Evident Physical Sealing & Stamp</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Lead/Wire Seal Serial *</label>
                    <input
                      type="text"
                      required
                      value={leadSealNo}
                      onChange={e => setLeadSealNo(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Hologram Sticker ID *</label>
                    <input
                      type="text"
                      required
                      value={hologramId}
                      onChange={e => setHologramId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Stamp Code *</label>
                    <input
                      type="text"
                      required
                      value={stampCode}
                      onChange={e => setStampCode(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Inspector Field Remarks</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setInspectingApp(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  id="submit-inspection-report-btn"
                  type="submit"
                  disabled={submittingInspection}
                  className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingInspection ? 'Submitting...' : 'Complete & Record Inspection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Modal (Approve & Stamp or Reject) */}
      {decidingApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Statutory Decision & Certificate Issuance
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Application: {decidingApp.applicationNumber}
                </p>
              </div>
              <button
                onClick={() => setDecidingApp(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessDecision} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block text-slate-700 font-bold">Select Statutory Decision *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision('APPROVED')}
                    className={`p-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-2 ${
                      decision === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>APPROVE & ISSUE CERTIFICATE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('REJECTED')}
                    className={`p-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-2 ${
                      decision === 'REJECTED'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>REJECT (Tolerances Failed)</span>
                  </button>
                </div>
              </div>

              {decision === 'APPROVED' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1.5 text-[11px]">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Automatic HMAC Cryptographic Token Generation</span>
                  </div>
                  <p>
                    Approving this inspection will automatically invoke <strong>certificate.service.ts</strong> to issue an
                    HMAC-SHA256 signed QR hash, a unique certificate number (e.g. LM-2026-DL-XXXXX), and add it to the
                    O(1) public verification index.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reason for Rejection *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Specify rule non-compliance or error threshold exceeded under Legal Metrology Act..."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDecidingApp(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  id="submit-decision-btn"
                  type="submit"
                  disabled={submittingDecision}
                  className={`px-5 py-2.5 rounded-lg text-white font-bold transition shadow-xs disabled:opacity-50 ${
                    decision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingDecision ? 'Processing Decision...' : decision === 'APPROVED' ? 'Sign & Issue Certificate' : 'Record Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
