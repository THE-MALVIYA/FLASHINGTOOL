import React, { useState, useEffect } from 'react';
import { Server, Activity, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { formatTime24, getTimeZoneAbbr, formatDateLong, telemetryAudio } from '../utils/formatters';
import { SimulationStatus } from '../types';

interface HeaderProps {
  status: SimulationStatus;
  sessionId: string | null;
  onAudioToggle?: () => void;
  activeStageName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  sessionId,
  activeStageName
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    telemetryAudio.enabled = next;
    if (next) {
      telemetryAudio.playTick();
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'running':
        return {
          label: 'PROCESSING LOAD CYCLE',
          subtext: activeStageName || '10-Minute Load Cycle Active',
          color: 'text-cyan-400',
          dotBg: 'bg-cyan-400',
          border: 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
        };
      case 'paused':
        return {
          label: 'LOAD CYCLE PAUSED',
          subtext: 'Cycle Suspended',
          color: 'text-amber-400',
          dotBg: 'bg-amber-400',
          border: 'border-amber-500/30'
        };
      case 'completed':
        return {
          label: 'LOAD CYCLE COMPLETED',
          subtext: '100% Load Audit Ready',
          color: 'text-emerald-400',
          dotBg: 'bg-emerald-400',
          border: 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
        };
      case 'idle':
      default:
        return {
          label: 'SYSTEM READY',
          subtext: 'Standby / Awaiting Parameters',
          color: 'text-blue-400',
          dotBg: 'bg-blue-400',
          border: 'border-blue-500/20'
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#050814]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-slate-900 p-2 ring-1 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <Server className="h-5 w-5 text-cyan-400" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className={`inline-flex h-full w-full rounded-full ${statusInfo.dotBg} opacity-75`}></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-wider text-white sm:text-lg">
                FLASHING STUDIO
              </span>
              <span className="hidden rounded bg-cyan-950/70 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-cyan-300 ring-1 ring-cyan-500/30 sm:inline-block">
                PRO V4.2
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Banking Server Load Suite</span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <ShieldCheck className="h-3 w-3 text-cyan-400/80" />
                Isolated Synthetic Sandbox
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right Info telemetry */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          
          {/* System Status indicator */}
          <div className={`flex items-center gap-2.5 rounded-lg border bg-slate-900/60 px-3 py-1.5 backdrop-blur-sm ${statusInfo.border}`}>
            <span className="relative flex h-2.5 w-2.5">
              {status === 'running' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusInfo.dotBg}`} />
            </span>
            <div className="text-left">
              <div className={`text-[11px] font-bold tracking-wider uppercase ${statusInfo.color}`}>
                {statusInfo.label}
              </div>
              <div className="text-[10px] text-slate-400">
                {statusInfo.subtext}
              </div>
            </div>
          </div>

          {/* Live 24-Hour Digital Clock & Current Date */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-1.5 shadow-inner">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 font-mono text-sm font-bold tracking-wider text-white tabular-nums sm:text-base">
                <span className="text-cyan-400">{formatTime24(now)}</span>
                <span className="text-[10px] font-normal text-slate-400">
                  {getTimeZoneAbbr(now)}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {formatDateLong(now)}
              </div>
            </div>
          </div>

          {/* Active Session ID badge */}
          <div className="hidden rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-left md:block">
            <div className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
              Active Session ID
            </div>
            <div className="font-mono text-xs font-semibold text-cyan-300">
              {sessionId || 'STANDBY / NONE'}
            </div>
          </div>

          {/* Sound telemetry toggle */}
          <button
            onClick={handleToggleAudio}
            type="button"
            title={audioEnabled ? "Disable Telemetry Audio" : "Enable Telemetry Audio"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 transition hover:border-slate-700 hover:text-cyan-400"
          >
            {audioEnabled ? (
              <Volume2 className="h-4 w-4 text-cyan-400" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
