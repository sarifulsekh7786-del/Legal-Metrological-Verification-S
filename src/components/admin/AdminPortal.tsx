import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  UserCheck,
  Building,
  Scale,
  MapPin,
  TrendingUp,
  Activity,
  ArrowRight
} from 'lucide-react';
import { api } from '../../lib/api';
import { Application, LmoWithWorkload, PendencyStats, User } from '../../types';

interface AdminPortalProps {
  currentUser: User;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentUser }) => {
  const [stats, setStats] = useState<PendencyStats | null>(null);
  const [lmos, setLmos] = useState<LmoWithWorkload[]>([]);
  const [unassignedApps, setUnassignedApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningApp, setAssigningApp] = useState<Application | null>(null);
  const [selectedLmoId, setSelectedLmoId] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, lmoData, submittedApps] = await Promise.all([
        api.getAdminStats(),
        api.getLmos(),
        api.getApplications({ status: 'SUBMITTED' })
      ]);
      setStats(statsData);
      setLmos(lmoData);
      setUnassignedApps(submittedApps);
      if (lmoData.length > 0 && !selectedLmoId) {
        setSelectedLmoId(lmoData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLmo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningApp || !selectedLmoId) return;

    setSubmittingAssign(true);
    try {
      await api.assignLmo(assigningApp.id, selectedLmoId, currentUser.id);
      setAssigningApp(null);
      await loadAdminData();
    } catch (err: any) {
      alert('Assignment error: ' + err.message);
    } finally {
      setSubmittingAssign(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              State Metrology Directorate Admin Console
            </span>
            <span className="text-xs text-slate-500 font-mono">Central Controller</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Statewide Pendency Analytics & Officer Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of statutory applications, district pendency, and inspector workloads.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition shrink-0"
        >
          Refresh Live Registry Stats
        </button>
      </div>

      {/* Top Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Pending Assignment</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.submitted}</div>
            <div className="text-[11px] text-amber-700 font-medium mt-1">Requires LMO Allocation</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Under Field Inspection</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.assigned + stats.inspected}</div>
            <div className="text-[11px] text-blue-700 font-medium mt-1">
              {stats.assigned} In Field • {stats.inspected} Inspected
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Certified & Stamped</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-2">{stats.approved}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Active HMAC QR Certificates
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Aging Overdue (&gt;7 Days)</span>
              <Clock className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-2">{stats.aging.over7Days}</div>
            <div className="text-[11px] text-rose-700 font-medium mt-1">Breaching statutory SLA</div>
          </div>
        </div>
      )}

      {/* Grid: Unassigned Applications & Heatmap / Zone Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unassigned Applications Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Applications Pending LMO Assignment</span>
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {unassignedApps.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                New trader submissions waiting for officer dispatch in their jurisdiction.
              </p>
            </div>
          </div>

          {unassignedApps.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              All submitted applications have been assigned to officers.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unassignedApps.map(app => (
                <div key={app.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-900 text-xs">{app.applicationNumber}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {app.business?.zone || 'Unassigned Zone'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {app.instrument?.make} • {app.instrument?.modelNumber} ({app.instrument?.serialNumber})
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">
                      {app.business?.tradeName} — {app.business?.address}
                    </div>
                  </div>

                  <button
                    id={`assign-btn-${app.id}`}
                    onClick={() => {
                      setAssigningApp(app);
                      if (lmos.length > 0) setSelectedLmoId(lmos[0].id);
                    }}
                    className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs shrink-0"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Assign Officer</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zone Pendency Heatmap / Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              <span>Zone Pendency Distribution</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Pendency workload across districts</p>
          </div>

          {stats && (
            <div className="space-y-3 text-xs">
              {Object.entries(stats.zoneDistribution).map(([zone, data]: [string, { total: number; pending: number; certified: number }]) => {
                const pendingPercent = data.total > 0 ? Math.round((data.pending / data.total) * 100) : 0;
                return (
                  <div key={zone} className="space-y-1">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-800 font-semibold">{zone}</span>
                      <span className="text-slate-500 font-mono">
                        {data.pending} pending / {data.total} total
                      </span>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${pendingPercent}%` }}
                      ></div>
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${100 - pendingPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* LMO Officers Workload Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-700" />
            <span>Legal Metrology Officers Workload & Cadre Allocation</span>
          </h2>
          <p className="text-xs text-slate-500">
            Field officer jurisdictions, active inspections in progress, and certified counts.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Officer Name & Cadre</th>
                <th className="py-3 px-4">Jurisdiction Zone</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Active Field Assignments</th>
                <th className="py-3 px-4">Total Certified</th>
                <th className="py-3 px-4">Workload Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lmos.map(lmo => {
                const isHeavy = lmo.activeAssignments >= 3;
                return (
                  <tr key={lmo.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{lmo.name}</div>
                      <div className="text-[11px] text-slate-500">{lmo.designation}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{lmo.jurisdictionZone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {lmo.phone}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-900">
                      {lmo.activeAssignments} active
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {lmo.completed} certified
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isHeavy ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isHeavy ? 'Heavy Workload' : 'Available Capacity'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {assigningApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Assign Legal Metrology Officer</h2>
                <p className="text-xs text-slate-500 font-mono">{assigningApp.applicationNumber}</p>
              </div>
              <button
                onClick={() => setAssigningApp(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignLmo} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="text-slate-500 text-[11px]">Establishment to inspect:</div>
                <div className="font-bold text-slate-900">{assigningApp.business?.tradeName}</div>
                <div className="text-slate-600">{assigningApp.business?.address}</div>
                <div className="text-[11px] text-blue-700 font-medium">Zone: {assigningApp.business?.zone}</div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Officer for On-Site Field Visit *</label>
                <select
                  value={selectedLmoId}
                  onChange={e => setSelectedLmoId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  {lmos.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.jurisdictionZone} ({l.activeAssignments} active)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAssigningApp(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  id="confirm-assignment-btn"
                  type="submit"
                  disabled={submittingAssign}
                  className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {submittingAssign ? 'Assigning Officer...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
