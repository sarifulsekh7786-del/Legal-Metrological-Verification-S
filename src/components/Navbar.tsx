import React from 'react';
import {
  ShieldCheck,
  Scale,
  QrCode,
  FileCheck2,
  Users,
  LayoutDashboard,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { User, Role } from '../types';

interface NavbarProps {
  activeTab: 'verify' | 'trader' | 'lmo' | 'admin';
  setActiveTab: (tab: 'verify' | 'trader' | 'lmo' | 'admin') => void;
  currentUser: User;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onOpenQrScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allUsers,
  onSelectUser,
  onOpenQrScanner
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'LMO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TRADER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top statutory bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex flex-wrap justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-medium text-slate-200">Legal Metrology e-Verification & Inspection System</span>
          <span className="hidden sm:inline text-slate-400">• Standard Weights & Measures Regulatory Portal</span>
        </div>
        <div className="flex items-center gap-4 text-slate-300">
          <span className="hidden md:inline">Public Registry O(1) HMAC Index</span>
          <button
            id="nav-quick-scan-btn"
            onClick={onOpenQrScanner}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-0.5 rounded-sm font-medium transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR Stamp</span>
          </button>
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Emblem */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('verify')}>
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-xs border border-blue-800">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-slate-900 tracking-tight text-base leading-tight flex items-center gap-1.5">
                <span>Directorate of Legal Metrology</span>
                <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm font-semibold border border-slate-300">Gov. Seal</span>
              </div>
              <p className="text-xs text-slate-500">Form VIII Verification, Geofenced Inspection & Cryptographic QR Engine</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              id="nav-tab-verify"
              onClick={() => setActiveTab('verify')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'verify'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Public Verification
            </button>

            <button
              id="nav-tab-trader"
              onClick={() => setActiveTab('trader')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'trader'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-amber-600" />
              Trader Portal
            </button>

            <button
              id="nav-tab-lmo"
              onClick={() => setActiveTab('lmo')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'lmo'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Scale className="w-4 h-4 text-blue-600" />
              LMO Field Officer
            </button>

            <button
              id="nav-tab-admin"
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-purple-600" />
              Admin Pendency
            </button>
          </nav>

          {/* User Persona Switcher */}
          <div className="relative">
            <button
              id="user-persona-switcher-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/80 transition"
            >
              <div className="w-8 h-8 rounded-full bg-blue-800 text-white flex items-center justify-center text-xs font-semibold">
                {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <span>{currentUser.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-sm border ${getRoleBadge(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                  {currentUser.designation || currentUser.phone}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Persona Dropdown */}
            {showUserMenu && (
              <div
                id="user-persona-dropdown"
                className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95"
              >
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Quick Role Switcher (Simulated Auth)
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a persona to test role-gated workflows. (Password optional: LMOs/Traders phone/OTP, Admin email/pw)
                  </p>
                </div>

                <div className="max-h-72 overflow-y-auto py-1">
                  {allUsers.map(user => {
                    const isSelected = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        id={`persona-option-${user.id}`}
                        onClick={() => {
                          onSelectUser(user);
                          setShowUserMenu(false);
                          if (user.role === 'TRADER') setActiveTab('trader');
                          if (user.role === 'LMO') setActiveTab('lmo');
                          if (user.role === 'ADMIN') setActiveTab('admin');
                        }}
                        className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition ${
                          isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                          {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-slate-900 truncate">{user.name}</div>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-sm border ${getRoleBadge(user.role)}`}>
                              {user.role}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {user.designation || user.jurisdictionZone || user.email}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {user.phone}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="flex md:hidden overflow-x-auto space-x-2 py-2 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium shrink-0 ${
              activeTab === 'verify' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Verify Stamp
          </button>
          <button
            onClick={() => setActiveTab('trader')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium shrink-0 ${
              activeTab === 'trader' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Trader Portal
          </button>
          <button
            onClick={() => setActiveTab('lmo')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium shrink-0 ${
              activeTab === 'lmo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            LMO Field
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium shrink-0 ${
              activeTab === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Admin Pendency
          </button>
        </div>
      </div>
    </header>
  );
};
