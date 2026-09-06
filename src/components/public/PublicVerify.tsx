import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  QrCode,
  Scale,
  Calendar,
  Lock,
  MapPin,
  FileCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { api } from '../../lib/api';
import { Certificate } from '../../types';
import { CertificateView } from '../certificate/CertificateView';

interface PublicVerifyProps {
  initialHash?: string;
  onOpenQrScanner: () => void;
  onNavigateToTrader?: () => void;
}

export const PublicVerify: React.FC<PublicVerifyProps> = ({
  initialHash,
  onOpenQrScanner,
  onNavigateToTrader
}) => {
  const [searchInput, setSearchInput] = useState(initialHash || '');
  const [loading, setLoading] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<{
    verified: boolean;
    certificate?: Certificate;
    message?: string;
  } | null>(null);
  const [sampleCerts, setSampleCerts] = useState<Certificate[]>([]);

  // On mount or when URL has hash
  useEffect(() => {
    // Check URL search parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hashFromUrl = urlParams.get('hash');
    const certFromUrl = urlParams.get('cert') || urlParams.get('certNumber');

    if (hashFromUrl) {
      setSearchInput(hashFromUrl);
      performLookup({ hash: hashFromUrl });
    } else if (certFromUrl) {
      setSearchInput(certFromUrl);
      performLookup({ certNumber: certFromUrl });
    } else if (initialHash) {
      performLookup({ hash: initialHash });
    }

    // Load sample certificates to provide quick test buttons
    loadSampleCertificates();
  }, [initialHash]);

  const loadSampleCertificates = async () => {
    try {
      const apps = await api.getApplications({ status: 'APPROVED' });
      const certs = apps
        .filter(a => a.certificate)
        .map(a => a.certificate!)
        .slice(0, 3);
      setSampleCerts(certs);
    } catch (e) {
      console.error('Failed to load sample certificates:', e);
    }
  };

  const performLookup = async (params: { hash?: string; certNumber?: string }) => {
    setLoading(true);
    setVerifiedResult(null);
    try {
      const res = await api.verify(params);
      setVerifiedResult(res);
    } catch (err: any) {
      setVerifiedResult({
        verified: false,
        message: err.message || 'Verification lookup failed. Invalid cryptographic token or certificate.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    // Check if input is likely a certificate number or hash
    if (query.startsWith('LM-')) {
      performLookup({ certNumber: query });
    } else {
      performLookup({ hash: query });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero verification banner */}
      <div className="bg-linear-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden border border-blue-800/50">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Official Government Public e-Verification Portal (O(1) Indexed)
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Verify Commercial Weighing & Measuring Instruments
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Every legal weighing scale, fuel dispenser, and flow meter in commercial use must carry a valid
            stamp and certificate under the <strong>Legal Metrology Act, 2009</strong>. Scan the QR stamp or enter
            the HMAC cryptographic hash below to verify authenticity in real time.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="public-verify-input"
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Paste HMAC token (e.g. 48_hex_chars_sig) or Certificate No (e.g. LM-2026-DL-88219)"
                className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-400 focus:bg-slate-900/80 backdrop-blur-xs font-mono"
              />
            </div>
            <button
              id="public-verify-submit-btn"
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {loading ? (
                <span>Validating...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Authenticity</span>
                </>
              )}
            </button>
            <button
              id="public-scan-qr-btn"
              type="button"
              onClick={onOpenQrScanner}
              className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white font-medium rounded-xl text-sm transition border border-white/20 flex items-center justify-center gap-2 shrink-0"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>Scan QR</span>
            </button>
          </form>

          {/* Quick Test Chips */}
          {sampleCerts.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400">Quick Test Samples:</span>
              {sampleCerts.map(cert => (
                <button
                  key={cert.id}
                  id={`sample-cert-${cert.certNumber}`}
                  onClick={() => {
                    setSearchInput(cert.qrHash);
                    performLookup({ hash: cert.qrHash });
                  }}
                  className="bg-white/10 hover:bg-white/20 text-slate-200 px-2.5 py-1 rounded-md text-xs font-mono transition border border-white/15 flex items-center gap-1"
                >
                  <span>{cert.certNumber}</span>
                  <span className="text-emerald-400 text-[10px]">({cert.instrumentMake})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Verification Result Section */}
      {verifiedResult && (
        <div id="verification-result-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {verifiedResult.verified && verifiedResult.certificate ? (
            <div>
              {/* Positive Verification Card */}
              <div className="bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-emerald-200">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-emerald-950">
                          GENUINE & STATUTORILY CERTIFIED
                        </h2>
                        <span className="bg-emerald-200 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800">
                        The cryptographic HMAC signature matches the central Legal Metrology Registry.
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs text-emerald-900 bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-300">
                    <div>Cert: <strong>{verifiedResult.certificate.certNumber}</strong></div>
                    <div className="text-[10px] text-emerald-700 truncate max-w-xs">
                      HMAC Token: {verifiedResult.certificate.qrHash.substring(0, 18)}...
                    </div>
                  </div>
                </div>

                {/* Audit Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                  <div className="bg-white/80 p-3 rounded-lg border border-emerald-200">
                    <div className="text-slate-500 font-medium">Establishment / Trader</div>
                    <div className="text-slate-900 font-bold text-sm mt-0.5">{verifiedResult.certificate.tradeName}</div>
                    <div className="text-slate-600 text-[11px] truncate">{verifiedResult.certificate.businessAddress}</div>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg border border-emerald-200">
                    <div className="text-slate-500 font-medium">Instrument Verified</div>
                    <div className="text-slate-900 font-bold text-sm mt-0.5">
                      {verifiedResult.certificate.instrumentMake} ({verifiedResult.certificate.instrumentSerial})
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      {verifiedResult.certificate.instrumentCategory.replace(/_/g, ' ')} • {verifiedResult.certificate.maxCapacity}
                    </div>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg border border-emerald-200">
                    <div className="text-slate-500 font-medium">Legal Metrology Officer</div>
                    <div className="text-slate-900 font-bold text-sm mt-0.5">{verifiedResult.certificate.lmoName}</div>
                    <div className="text-emerald-700 text-[11px] font-semibold">
                      Valid Until: {new Date(verifiedResult.certificate.validUntil).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Certificate View */}
              <div className="mt-6">
                <CertificateView certificate={verifiedResult.certificate} />
              </div>
            </div>
          ) : (
            /* Negative / Unverified Warning */
            <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-6 text-rose-950 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <XCircle className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-rose-900">
                    Verification Failed: Unauthenticated Record
                  </h2>
                  <p className="text-sm text-rose-800">
                    {verifiedResult.message || 'No official verification record exists for the provided token or certificate number.'}
                  </p>
                  <div className="text-xs text-rose-700 bg-white/60 p-3 rounded-lg border border-rose-200 space-y-1">
                    <div className="font-semibold">Possible causes:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>The QR code or token has been tampered with or is invalid.</li>
                      <li>The instrument has not completed statutory inspection by an authorized LMO officer.</li>
                      <li>The certificate number was typed incorrectly.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">HMAC-Signed QR Tokens</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Unlike predictable sequential IDs, every QR stamp contains an HMAC-SHA256 signature generated server-side.
            Lookups are O(1) indexed in memory and impossible to forge.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">100m Geo-Fenced Inspections</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Legal Metrology Officers must be physically present within 100 meters of the trader's premises
            (enforced via Haversine great-circle calculation) before inspection tests can be submitted.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Statutory State Machine</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Strict transactional progression: Trader submits application → Admin assigns officer → LMO conducts field tests → Digital certificate issued upon approval.
          </p>
        </div>
      </div>
    </div>
  );
};
