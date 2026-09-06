import React, { useEffect, useState } from 'react';
import {
  Plus,
  Scale,
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Building,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Download,
  Eye,
  Info
} from 'lucide-react';
import { api } from '../../lib/api';
import { Application, Business, Certificate, InstrumentCategory, User } from '../../types';
import { CertificateView } from '../certificate/CertificateView';

interface TraderPortalProps {
  currentUser: User;
  onOpenCertificateModal: (cert: Certificate) => void;
}

export const TraderPortal: React.FC<TraderPortalProps> = ({
  currentUser,
  onOpenCertificateModal
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Application Form State
  const [selectedBizId, setSelectedBizId] = useState('');
  const [category, setCategory] = useState<InstrumentCategory>('WEIGHING_SCALE_CLASS_III');
  const [make, setMake] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('30 kg (e = 5g)');
  const [verificationDivision, setVerificationDivision] = useState('e = 5g');
  const [accuracyClass, setAccuracyClass] = useState('Class III (Medium Accuracy)');
  const [manufacturingYear, setManufacturingYear] = useState(new Date().getFullYear());
  const [prevCertNumber, setPrevCertNumber] = useState('');

  // Selected application for detail drawer
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsData, bizData] = await Promise.all([
        api.getApplications({ traderId: currentUser.id }),
        api.getBusinesses(currentUser.id)
      ]);
      setApplications(appsData);
      setBusinesses(bizData);
      if (bizData.length > 0 && !selectedBizId) {
        setSelectedBizId(bizData[0].id);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to load trader data');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: InstrumentCategory) => {
    setCategory(cat);
    switch (cat) {
      case 'WEIGHING_SCALE_CLASS_III':
        setMaxCapacity('30 kg (e = 5g)');
        setVerificationDivision('e = 5g');
        setAccuracyClass('Class III (Medium Accuracy)');
        break;
      case 'FUEL_DISPENSER':
        setMaxCapacity('50 L/min Dual Nozzle');
        setVerificationDivision('0.01 Liter');
        setAccuracyClass('Class 0.5 (Liquid Fuel Dispenser)');
        break;
      case 'FLOW_METER':
        setMaxCapacity('100 m³/hr Industrial');
        setVerificationDivision('0.1% accuracy');
        setAccuracyClass('Class 0.3');
        break;
      case 'CHECKWEIGHER':
        setMaxCapacity('500g High-speed checkweigher');
        setVerificationDivision('e = 0.1g');
        setAccuracyClass('Class XIII(1)');
        break;
      case 'WEIGHTS_CLASS_F2':
        setMaxCapacity('1 mg to 10 kg Brass/Stainless Weights');
        setVerificationDivision('Class F2 Maximum Permissible Error');
        setAccuracyClass('Class F2 Standard Weights');
        break;
    }
  };

  const handleSubmitNewApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizId || !make || !serialNumber) {
      alert('Please fill all mandatory fields (Business, Make, and Serial Number).');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await api.submitApplication({
        traderId: currentUser.id,
        businessId: selectedBizId,
        instrument: {
          category,
          make,
          modelNumber: modelNumber || 'Standard Industrial Model',
          serialNumber,
          maxCapacity,
          verificationDivision,
          accuracyClass,
          manufacturingYear: Number(manufacturingYear),
          prevCertNumber: prevCertNumber || undefined
        }
      });

      setShowNewModal(false);
      // Reset form
      setMake('');
      setModelNumber('');
      setSerialNumber('');
      setPrevCertNumber('');

      // Reload list and highlight created
      await loadData();
      setSelectedApp(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: Application['status']) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">1. Pending Assignment</span>;
      case 'ASSIGNED':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">2. LMO Assigned (Field Visit)</span>;
      case 'INSPECTED':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">3. Inspected (Pending Decision)</span>;
      case 'APPROVED':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">4. Approved & Certified</span>;
      case 'REJECTED':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">Rejected (Tolerances Failed)</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Welcome Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Trader Self-Service Portal
            </span>
            <span className="text-xs text-slate-500 font-mono">User ID: {currentUser.id}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            {currentUser.name} • Registered Establishments & Instruments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit commercial instruments for statutory verification under the Legal Metrology Act, 2009.
          </p>
        </div>

        <button
          id="trader-new-application-btn"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Verification Application</span>
        </button>
      </div>

      {/* Registered Businesses Summary */}
      {businesses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses.map(b => (
            <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{b.tradeName}</h3>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{b.registrationNumber}</span>
                </div>
                <div className="text-xs text-slate-500 truncate">{b.legalName}</div>
                <div className="text-xs text-slate-600 mt-1">{b.address}</div>
                <div className="text-[11px] text-blue-700 mt-1 flex items-center gap-2 font-mono">
                  <span>GPS: {b.latitude}, {b.longitude}</span>
                  <span>• Zone: {b.zone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Applications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-700" />
              <span>Verification Applications & Certificates</span>
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {applications.length} total
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Track statutory inspection workflow and download digital certificates.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading your applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Scale className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600 font-medium">No verification applications yet.</p>
            <p className="text-xs text-slate-400">Click &quot;New Verification Application&quot; above to submit an instrument.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Application No.</th>
                  <th className="py-3 px-4">Instrument Details</th>
                  <th className="py-3 px-4">Establishment</th>
                  <th className="py-3 px-4">Status & Progression</th>
                  <th className="py-3 px-4">Officer Assigned</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      <div>{app.applicationNumber}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {new Date(app.submittedAt).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {app.instrument?.make} • {app.instrument?.modelNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        S/N: {app.instrument?.serialNumber}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {app.instrument?.category.replace(/_/g, ' ')} • {app.instrument?.maxCapacity}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{app.business?.tradeName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{app.business?.address}</div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="py-3 px-4">
                      {app.lmo ? (
                        <div>
                          <div className="font-medium text-slate-800">{app.lmo.name}</div>
                          <div className="text-[10px] text-slate-500">{app.lmo.jurisdictionZone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Awaiting Admin Allocation</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {app.certificate ? (
                          <button
                            id={`view-cert-btn-${app.id}`}
                            onClick={() => onOpenCertificateModal(app.certificate!)}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-semibold transition shadow-2xs"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>View Certificate</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded text-xs font-medium hover:bg-blue-100 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit Info</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Application Audit Drawer / Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Application Audit Detail:</span>
                <span className="font-mono text-blue-800 font-bold">{selectedApp.applicationNumber}</span>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Status Stepper */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Statutory Verification Progression</div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className={`p-2 rounded border ${selectedApp.status ? 'bg-blue-100 border-blue-300 font-semibold' : 'bg-white border-slate-200 text-slate-400'}`}>
                  1. Submitted
                </div>
                <div className={`p-2 rounded border ${['ASSIGNED', 'INSPECTED', 'APPROVED'].includes(selectedApp.status) ? 'bg-blue-100 border-blue-300 font-semibold' : 'bg-white border-slate-200 text-slate-400'}`}>
                  2. Assigned
                </div>
                <div className={`p-2 rounded border ${['INSPECTED', 'APPROVED'].includes(selectedApp.status) ? 'bg-blue-100 border-blue-300 font-semibold' : 'bg-white border-slate-200 text-slate-400'}`}>
                  3. Field Test
                </div>
                <div className={`p-2 rounded border ${selectedApp.status === 'APPROVED' ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold' : selectedApp.status === 'REJECTED' ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold' : 'bg-white border-slate-200 text-slate-400'}`}>
                  4. {selectedApp.status === 'APPROVED' ? 'Certified' : selectedApp.status === 'REJECTED' ? 'Rejected' : 'Decision'}
                </div>
              </div>
            </div>

            {/* Inspection report if inspected */}
            {selectedApp.inspection && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-xs space-y-2">
                <div className="font-bold text-emerald-900 flex items-center justify-between">
                  <span>Field Officer Inspection Report</span>
                  <span className="text-emerald-700">Distance from Shop: {selectedApp.inspection.distanceFromShopMeters}m</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div>Zero Return Test: <strong>{selectedApp.inspection.metrics.zeroReturnTest}</strong></div>
                  <div>Repeatability: <strong>{selectedApp.inspection.metrics.repeatabilityTest}</strong></div>
                  <div>Applied Mass: <strong>{selectedApp.inspection.metrics.appliedStandardMassKg} kg</strong></div>
                  <div>Error Margin: <strong>{selectedApp.inspection.metrics.errorMarginValue} kg</strong></div>
                  <div>Lead Seal: <strong>{selectedApp.inspection.tamperSealNumber}</strong></div>
                  <div>Hologram ID: <strong>{selectedApp.inspection.hologramStickerId}</strong></div>
                </div>
                <p className="italic text-slate-600 text-[11px] mt-1 border-t border-emerald-200/60 pt-1">
                  Officer remarks: &quot;{selectedApp.inspection.inspectorRemarks}&quot;
                </p>
              </div>
            )}

            {selectedApp.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-xs">
                <strong>Rejection Reason:</strong> {selectedApp.rejectionReason}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Verification Application Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">New Verification Application</h2>
                  <p className="text-xs text-slate-500">Atomic instrument & application submission ($transaction)</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewApplication} className="space-y-4 text-xs">
              {/* Select Business */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Registered Business Establishment *</label>
                <select
                  value={selectedBizId}
                  onChange={e => setSelectedBizId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.tradeName} ({b.address.substring(0, 35)}...)
                    </option>
                  ))}
                </select>
              </div>

              {/* Instrument Category */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Instrument Category *</label>
                <select
                  value={category}
                  onChange={e => handleCategoryChange(e.target.value as InstrumentCategory)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="WEIGHING_SCALE_CLASS_III">Non-Automatic Weighing Instrument (Class III - Platform / Counter Scale)</option>
                  <option value="FUEL_DISPENSER">Commercial Fuel Dispensing Unit (Petrol/Diesel)</option>
                  <option value="FLOW_METER">Flow Meter (Bulk Liquid / LPG / Industrial)</option>
                  <option value="CHECKWEIGHER">Automatic Checkweigher</option>
                  <option value="WEIGHTS_CLASS_F2">Standard Weights Set (Class F2 Precision)</option>
                </select>
              </div>

              {/* Make & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Make / Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Avery Weigh-Tronix, Essae"
                    value={make}
                    onChange={e => setMake(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Model Number</label>
                  <input
                    type="text"
                    placeholder="e.g. E-1010, DS-852"
                    value={modelNumber}
                    onChange={e => setModelNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Serial Number & Manufacturing Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Equipment Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AW-2026-99120"
                    value={serialNumber}
                    onChange={e => setSerialNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Year of Manufacture</label>
                  <input
                    type="number"
                    value={manufacturingYear}
                    onChange={e => setManufacturingYear(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Max Capacity & Accuracy Class */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Max Capacity / Verification Division</label>
                  <input
                    type="text"
                    value={maxCapacity}
                    onChange={e => setMaxCapacity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Accuracy Class</label>
                  <input
                    type="text"
                    value={accuracyClass}
                    onChange={e => setAccuracyClass(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Previous Certificate (if renewal) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Previous Certificate Number (if re-verification)</label>
                <input
                  type="text"
                  placeholder="e.g. LM-2025-DL-33120 (Optional)"
                  value={prevCertNumber}
                  onChange={e => setPrevCertNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              {/* State Machine Guard Note */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-slate-700 flex items-start gap-2 text-[11px]">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Security Guard:</strong> Submission enforces the state machine. The application will be created strictly in
                  <strong> SUBMITTED</strong> status and cannot bypass to an officer or decision until assigned by the administrator.
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  id="trader-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Submitting Application...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
