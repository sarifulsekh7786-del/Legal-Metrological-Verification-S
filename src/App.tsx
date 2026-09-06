import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { PublicVerify } from './components/public/PublicVerify';
import { TraderPortal } from './components/trader/TraderPortal';
import { LmoPortal } from './components/lmo/LmoPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { CertificateView } from './components/certificate/CertificateView';
import { QrScannerModal } from './components/public/QrScannerModal';
import { Certificate, User } from './types';
import { api } from './lib/api';
import { Scale, ShieldCheck, FileText, Lock, Globe } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'verify' | 'trader' | 'lmo' | 'admin'>('verify');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedCertModal, setSelectedCertModal] = useState<Certificate | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [activeVerifyHash, setActiveVerifyHash] = useState<string>('');

  useEffect(() => {
    // Initial fetch of seeded users
    const init = async () => {
      try {
        const users = await api.getUsers();
        setAllUsers(users);

        // Check URL parameters for direct verification links
        const params = new URLSearchParams(window.location.search);
        const hash = params.get('hash');
        const cert = params.get('cert') || params.get('certNumber');

        if (hash || cert) {
          setActiveTab('verify');
          if (hash) setActiveVerifyHash(hash);
        }

        // Set default current user to Trader Rajesh Agrawal
        const defaultUser = users.find(u => u.role === 'TRADER') || users[0];
        setCurrentUser(defaultUser);
      } catch (err) {
        console.error('Failed to initialize app state:', err);
      }
    };
    init();
  }, []);

  const handleScanSuccess = (qrHash: string) => {
    setIsQrScannerOpen(false);
    setActiveVerifyHash(qrHash);
    setActiveTab('verify');
    // Also push state or update search param cleanly
    const newUrl = `${window.location.pathname}?hash=${encodeURIComponent(qrHash)}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
            <Scale className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Initializing Legal Metrology Verification System...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        allUsers={allUsers}
        onSelectUser={u => setCurrentUser(u)}
        onOpenQrScanner={() => setIsQrScannerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'verify' && (
          <PublicVerify
            initialHash={activeVerifyHash}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onNavigateToTrader={() => {
              const trader = allUsers.find(u => u.role === 'TRADER');
              if (trader) setCurrentUser(trader);
              setActiveTab('trader');
            }}
          />
        )}

        {activeTab === 'trader' && (
          <TraderPortal
            currentUser={currentUser}
            onOpenCertificateModal={cert => setSelectedCertModal(cert)}
          />
        )}

        {activeTab === 'lmo' && (
          <LmoPortal
            currentUser={currentUser}
            onOpenCertificateModal={cert => setSelectedCertModal(cert)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPortal currentUser={currentUser} />
        )}
      </main>

      {/* Certificate Modal Dialog */}
      {selectedCertModal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[96vh] overflow-y-auto">
            <CertificateView
              certificate={selectedCertModal}
              onClose={() => setSelectedCertModal(null)}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Official Government Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-800 text-amber-400 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <div className="text-slate-200 font-bold text-sm">
                  Directorate of Legal Metrology • Standard Weights & Measures
                </div>
                <div className="text-[11px] text-slate-500">
                  Enforcing the Legal Metrology Act, 2009 and Legal Metrology (General) Rules, 2011
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                HMAC-Signed O(1) Verification
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-400" />
                Haversine 100m Geofenced
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Statutory State Machine Protected
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div>
              © 2026 Directorate of Legal Metrology. Form VIII e-Verification & Field Inspection System.
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveTab('verify')} className="hover:text-slate-300">
                Public Verification
              </button>
              <button
                onClick={() => {
                  const t = allUsers.find(u => u.role === 'TRADER');
                  if (t) setCurrentUser(t);
                  setActiveTab('trader');
                }}
                className="hover:text-slate-300"
              >
                Trader Portal
              </button>
              <button
                onClick={() => {
                  const l = allUsers.find(u => u.role === 'LMO');
                  if (l) setCurrentUser(l);
                  setActiveTab('lmo');
                }}
                className="hover:text-slate-300"
              >
                LMO Officer Portal
              </button>
              <button
                onClick={() => {
                  const a = allUsers.find(u => u.role === 'ADMIN');
                  if (a) setCurrentUser(a);
                  setActiveTab('admin');
                }}
                className="hover:text-slate-300"
              >
                Admin Console
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
