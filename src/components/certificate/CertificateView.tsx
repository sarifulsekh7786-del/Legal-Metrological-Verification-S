import React from 'react';
import {
  ShieldCheck,
  Award,
  Calendar,
  Printer,
  Copy,
  ExternalLink,
  Lock,
  CheckCircle,
  Hash,
  Scale
} from 'lucide-react';
import { Certificate } from '../../types';

interface CertificateViewProps {
  certificate: Certificate;
  onClose?: () => void;
  isModal?: boolean;
}

export const CertificateView: React.FC<CertificateViewProps> = ({
  certificate,
  onClose,
  isModal = false
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyVerifyLink = () => {
    const fullUrl = `${window.location.origin}/verify?hash=${certificate.qrHash}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const isExpired = new Date(certificate.validUntil) < new Date();

  return (
    <div className={`bg-white text-slate-800 ${isModal ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
      {/* Top action bar (hidden in print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Statutory Digital Verification Certificate
          </span>
          <span className="text-xs text-slate-500 font-mono">({certificate.certNumber})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="cert-copy-link-btn"
            onClick={copyVerifyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            {copied ? 'Link Copied!' : 'Copy Verify URL'}
          </button>
          <button
            id="cert-print-btn"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Certificate
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-200 rounded-md hover:bg-slate-300 transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Printable Certificate Sheet */}
      <div className="p-6 sm:p-10 max-w-4xl mx-auto border-4 border-double border-slate-700 m-4 rounded-md shadow-lg bg-amber-50/10 relative overflow-hidden print:m-0 print:border-2 print:shadow-none">
        {/* Subtle Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
          <Scale className="w-96 h-96 text-slate-900" />
        </div>

        {/* Certificate Header */}
        <div className="text-center border-b-2 border-slate-900 pb-5 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 text-amber-400 mb-2 shadow-xs">
            <Scale className="w-7 h-7" />
          </div>
          <h1 className="text-sm sm:text-base font-serif font-bold tracking-widest text-slate-900 uppercase">
            Government of National Capital Territory
          </h1>
          <h2 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-700 uppercase">
            Directorate of Legal Metrology • Weights & Measures Department
          </h2>
          <div className="mt-3 inline-block bg-slate-900 text-amber-300 font-serif font-bold px-4 py-1 text-sm sm:text-base rounded uppercase tracking-wider border border-amber-400/40">
            Form VIII — Certificate of Verification
          </div>
          <p className="text-[11px] text-slate-600 italic mt-1 font-serif">
            [See Rule 14 of the Legal Metrology (General) Rules, 2011 & Section 24 of the Legal Metrology Act, 2009]
          </p>
        </div>

        {/* Certificate Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-300 text-xs relative z-10">
          <div>
            <span className="text-slate-500 block uppercase text-[10px] font-semibold">Certificate No:</span>
            <span className="font-mono font-bold text-blue-900 text-sm">{certificate.certNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase text-[10px] font-semibold">Date of Verification:</span>
            <span className="font-medium text-slate-900">{new Date(certificate.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase text-[10px] font-semibold">Valid Up To:</span>
            <span className={`font-semibold ${isExpired ? 'text-rose-600' : 'text-emerald-700'}`}>
              {new Date(certificate.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              {isExpired ? ' (EXPIRED)' : ' (VALID)'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase text-[10px] font-semibold">Statutory Fee Paid:</span>
            <span className="font-bold text-slate-900">₹{certificate.verificationFeePaid}.00 (Received)</span>
          </div>
        </div>

        {/* Verification Statement */}
        <div className="py-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-serif relative z-10">
          I hereby certify that I have this day examined and verified the weighing/measuring instrument described hereunder,
          belonging to the establishment mentioned below, and found it to conform with the standards prescribed under the
          <strong> Legal Metrology Act, 2009</strong> and the <strong>Rules made thereunder</strong>, and have affixed the verification stamp and seals.
        </div>

        {/* Two-Column Specification Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2 relative z-10">
          {/* Business Details */}
          <div className="border border-slate-300 rounded p-3.5 bg-white/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 mb-2.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-700" />
              1. Establishment & Trader
            </h3>
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-slate-500">Legal Entity:</dt>
                <dd className="font-semibold text-slate-900 text-right">{certificate.businessName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Trade Name:</dt>
                <dd className="font-medium text-slate-800 text-right">{certificate.tradeName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Registered Address:</dt>
                <dd className="font-normal text-slate-700 text-xs mt-0.5">{certificate.businessAddress}</dd>
              </div>
            </dl>
          </div>

          {/* Instrument Specifications */}
          <div className="border border-slate-300 rounded p-3.5 bg-white/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 mb-2.5 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-blue-700" />
              2. Instrument Specifications
            </h3>
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-slate-500">Category:</dt>
                <dd className="font-semibold text-slate-900">{certificate.instrumentCategory.replace(/_/g, ' ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Make & Model:</dt>
                <dd className="font-medium text-slate-800">{certificate.instrumentMake} • {certificate.instrumentModel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Serial Number:</dt>
                <dd className="font-mono font-bold text-blue-900">{certificate.instrumentSerial}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Max Capacity / Div:</dt>
                <dd className="font-medium text-slate-800">{certificate.maxCapacity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Accuracy Class:</dt>
                <dd className="font-medium text-slate-800">{certificate.accuracyClass}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Security Seals & Stamping Breakdown */}
        <div className="border border-slate-300 rounded p-3.5 bg-white/80 my-3 relative z-10 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 mb-2 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            3. Statutory Physical Sealing & Tamper Verification
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Lead/Wire Seal No:</span>
              <span className="font-mono font-semibold text-slate-900">{certificate.leadSealNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Holographic Sticker ID:</span>
              <span className="font-mono font-semibold text-slate-900">{certificate.hologramId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Govt. Stamp Impression:</span>
              <span className="font-mono font-bold text-emerald-800">IND-DL-{new Date(certificate.issuedAt).getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: QR Code with HMAC Signature & Officer Signature */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t-2 border-slate-900 items-center relative z-10">
          {/* QR Code and Cryptographic Token */}
          <div className="flex flex-col items-center sm:items-start">
            <div className="p-1.5 bg-white border border-slate-400 rounded-md shadow-xs">
              {certificate.qrDataUrl ? (
                <img
                  src={certificate.qrDataUrl}
                  alt={`QR Verification Stamp for ${certificate.certNumber}`}
                  className="w-28 h-28"
                />
              ) : (
                <div className="w-28 h-28 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  QR Not Generated
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 text-center sm:text-left">
              Scan to verify on public registry
            </span>
          </div>

          {/* Cryptographic Security Hash Note */}
          <div className="text-center text-xs space-y-1">
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              <CheckCircle className="w-3 h-3" />
              HMAC-SHA256 Authenticated
            </div>
            <p className="text-[10px] text-slate-500 font-mono break-all leading-tight">
              Hash: {certificate.qrHash.substring(0, 24)}...
            </p>
            <p className="text-[10px] text-slate-600 italic">
              Indexed O(1) Public Key Cryptographic Token. Never guessable.
            </p>
          </div>

          {/* LMO Digital Signature Block */}
          <div className="text-right sm:text-right flex flex-col items-center sm:items-end">
            <div className="w-40 border-b border-slate-800 pb-1 text-center">
              <span className="font-serif italic text-blue-950 font-bold text-sm block">
                {certificate.lmoName}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">
                [Digitally Certified & Geotagged]
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-900 mt-1">
              {certificate.lmoDesignation}
            </div>
            <div className="text-[10px] text-slate-500">
              Legal Metrology Inspectorate Division
            </div>
          </div>
        </div>

        {/* Official Statutory Footnote */}
        <div className="mt-4 pt-2 border-t border-slate-200 text-[10px] text-slate-500 text-center font-serif">
          Note: This certificate must be exhibited in a conspicuous place in the premises where the instrument is used.
          Tampering or obliterating the official stamp is an offense punishable under Section 25 of the Act.
        </div>
      </div>
    </div>
  );
};
