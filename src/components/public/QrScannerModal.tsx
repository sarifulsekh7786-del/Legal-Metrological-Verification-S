import React, { useEffect, useState, useRef } from 'react';
import {
  QrCode,
  Camera,
  X,
  ShieldCheck,
  CheckCircle2,
  Upload,
  AlertCircle
} from 'lucide-react';
import { api } from '../../lib/api';
import { Certificate } from '../../types';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrHash: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [issuedCerts, setIssuedCerts] = useState<Certificate[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadIssuedCertificates();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const loadIssuedCertificates = async () => {
    try {
      const apps = await api.getApplications({ status: 'APPROVED' });
      const certs = apps.filter(a => a.certificate).map(a => a.certificate!);
      setIssuedCerts(certs);
    } catch (e) {
      console.error(e);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError('Camera access denied or unavailable in this environment: ' + err.message);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Scan Statutory QR Verification Stamp</h2>
              <p className="text-xs text-slate-500">Instant O(1) HMAC-SHA256 Token Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Camera Scanner Viewfinder */}
        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center text-white border-2 border-slate-700">
          {cameraActive ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" />
              {/* Target Reticle Overlay */}
              <div className="absolute w-44 h-44 border-2 border-emerald-400 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                <span className="w-full h-0.5 bg-emerald-400/70 absolute"></span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center space-y-3">
              <Camera className="w-12 h-12 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-300 max-w-xs">
                Scan QR stamp printed on the instrument or physical Form VIII certificate.
              </div>
              {cameraError && (
                <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-800">
                  {cameraError}
                </div>
              )}
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                Launch Device Camera
              </button>
            </div>
          )}
        </div>

        {/* Quick Test / Live Issued Certificates Selector */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Or Click a Registered Certificate Stamp to Test:</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Active in Central DB
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {issuedCerts.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4">
                No certificates issued yet. Submit and approve an application first.
              </div>
            ) : (
              issuedCerts.map(cert => (
                <button
                  key={cert.id}
                  id={`scan-test-cert-${cert.certNumber}`}
                  onClick={() => {
                    stopCamera();
                    onScanSuccess(cert.qrHash);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-blue-900">
                      <span>{cert.certNumber}</span>
                      <span className="text-[10px] text-slate-500 font-sans font-normal">
                        • {cert.instrumentMake} ({cert.instrumentSerial})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {cert.tradeName} — Seal: {cert.leadSealNumber}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      Hash: {cert.qrHash.substring(0, 28)}...
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Select</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
