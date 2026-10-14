import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldAlert,
  Server,
  Zap,
  Clock,
  ArrowRight
} from 'lucide-react';
import { SimulationSession, SimulationLog } from '../types';
import { PROCESSING_STAGES } from '../constants/stages';
import {
  formatDurationMMSS,
  formatTime24,
  telemetryAudio
} from '../utils/formatters';
import { StageProgressPanel } from './StageProgressPanel';
import { LiveActivityLogs } from './LiveActivityLogs';

interface ProcessingDashboardProps {
  session: SimulationSession;
  onUpdateSession: (updater: (prev: SimulationSession) => SimulationSession) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export const ProcessingDashboard: React.FC<ProcessingDashboardProps> = ({
  session,
  onUpdateSession,
  onComplete,
  onCancel
}) => {
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const hasCompletedRef = useRef(false);
  const loggedMilestonesRef = useRef<Set<number>>(new Set());

  // Generate initial bootstrap logs upon mount
  useEffect(() => {
    const now = new Date();
    const initialLogs: SimulationLog[] = [
      {
        id: 'log-1',
        timestamp: `[${formatTime24(now)}]`,
        message: 'Load testing session initialized.',
        category: 'system',
        level: 'info',
        stageIndex: 0
      },
      {
        id: 'log-2',
        timestamp: `[${formatTime24(new Date(now.getTime() + 1000))}]`,
        message: `Server configuration loaded: ${session.config.serverName}.`,
        category: 'system',
        level: 'info',
        stageIndex: 0
      },
      {
        id: 'log-3',
        timestamp: `[${formatTime24(new Date(now.getTime() + 2000))}]`,
        message: 'Input validation completed. All parameters verified.',
        category: 'system',
        level: 'success',
        stageIndex: 0
      }
    ];
    setLogs(initialLogs);
  }, []);

  // Main Timer & Telemetry Engine (Runs actual elapsed time)
  useEffect(() => {
    if (session.status !== 'running') return;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      
      // Calculate elapsed using actual time adjusted by speedMultiplier
      onUpdateSession((prev) => {
        if (prev.status !== 'running') return prev;

        // Calculate delta
        const deltaSec = 0.5 * prev.speedMultiplier;
        const newElapsed = Math.min(prev.targetDurationSec, prev.elapsedSeconds + deltaSec);
        const progress = Math.min(100, (newElapsed / prev.targetDurationSec) * 100);

        // Determine stage index based on progress
        let stageIdx = 0;
        if (progress >= 100) stageIdx = 5;
        else if (progress >= 80) stageIdx = 4;
        else if (progress >= 55) stageIdx = 3;
        else if (progress >= 35) stageIdx = 2;
        else if (progress >= 15) stageIdx = 1;
        else stageIdx = 0;

        // Trigger completion if timer hits target
        if (newElapsed >= prev.targetDurationSec && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          telemetryAudio.playSuccess();
          setTimeout(() => {
            onComplete();
          }, 600);

          return {
            ...prev,
            status: 'completed',
            elapsedSeconds: prev.targetDurationSec,
            progressPercent: 100,
            currentStageIndex: 5,
            endTime: Date.now()
          };
        }

        // Periodic audio telemetry tick
        if (Math.floor(newElapsed) % 15 === 0 && Math.floor(newElapsed) !== Math.floor(prev.elapsedSeconds)) {
          telemetryAudio.playTick();
        }

        return {
          ...prev,
          elapsedSeconds: newElapsed,
          progressPercent: progress,
          currentStageIndex: stageIdx
        };
      });
    }, 500);

    return () => clearInterval(interval);
  }, [session.status, session.speedMultiplier, onComplete, onUpdateSession]);

  // Dynamic log generator tied to progress percentage milestones
  useEffect(() => {
    const p = Math.floor(session.progressPercent);
    const milestones = [
      { pct: 5, msg: 'Virtual connection check started with test gateway.', cat: 'network', lvl: 'info' },
      { pct: 15, msg: 'Stage 1 verified. Virtual TCP handshake established.', cat: 'network', lvl: 'success' },
      { pct: 22, msg: 'Measuring synthetic socket response: latency ~1.2ms.', cat: 'network', lvl: 'telemetry' },
      { pct: 35, msg: 'Diagnostic sequence completed. Virtual switch tables mapped.', cat: 'diagnostic', lvl: 'success' },
      { pct: 42, msg: 'Executing CPU multi-core instruction cache benchmark.', cat: 'diagnostic', lvl: 'telemetry' },
      { pct: 50, msg: 'Resource monitoring initialized: thread concurrency normal.', cat: 'system', lvl: 'info' },
      { pct: 58, msg: 'Workload processing active: streaming synthetic buffer queue.', cat: 'workload', lvl: 'info' },
      { pct: 66, msg: `Processing volume throughput: ${session.config.serverVolume}.`, cat: 'workload', lvl: 'telemetry' },
      { pct: 75, msg: 'System diagnostics running: memory buffer isolation verified.', cat: 'diagnostic', lvl: 'info' },
      { pct: 85, msg: 'Final validation in progress: calculating parity telemetry.', cat: 'system', lvl: 'info' },
      { pct: 92, msg: 'Cryptographic benchmark checksum compiled (SHA256).', cat: 'security', lvl: 'telemetry' },
      { pct: 98, msg: 'Preparing load audit report and closing sandbox threads.', cat: 'system', lvl: 'info' },
      { pct: 100, msg: 'Load process completed. 10:00 duration achieved.', cat: 'system', lvl: 'success' }
    ];

    milestones.forEach((m) => {
      if (p >= m.pct && !loggedMilestonesRef.current.has(m.pct)) {
        loggedMilestonesRef.current.add(m.pct);
        const currentTimeStr = `[${formatTime24(new Date())}]`;
        const newLog: SimulationLog = {
          id: `log-auto-${m.pct}-${Date.now()}`,
          timestamp: currentTimeStr,
          message: m.msg,
          category: m.cat as SimulationLog['category'],
          level: m.lvl as SimulationLog['level'],
          stageIndex: session.currentStageIndex
        };
        setLogs((prev) => [...prev, newLog]);
      }
    });
  }, [session.progressPercent, session.currentStageIndex, session.config.serverVolume]);

  const remainingSeconds = Math.max(0, session.targetDurationSec - session.elapsedSeconds);
  const elapsedFormatted = formatDurationMMSS(session.elapsedSeconds);
  const remainingFormatted = formatDurationMMSS(remainingSeconds);

  const currentStage = PROCESSING_STAGES[session.currentStageIndex] || PROCESSING_STAGES[0];

  const handleTogglePause = () => {
    onUpdateSession((prev) => ({
      ...prev,
      status: prev.status === 'running' ? 'paused' : 'running'
    }));
  };

  const handleSetSpeed = (multiplier: number) => {
    onUpdateSession((prev) => ({
      ...prev,
      speedMultiplier: multiplier
    }));
  };

  const handleFastForwardToComplete = () => {
    hasCompletedRef.current = true;
    telemetryAudio.playSuccess();
    const now = new Date();
    setLogs((prev) => [
      ...prev,
      {
        id: `ff-${Date.now()}`,
        timestamp: `[${formatTime24(now)}]`,
        message: 'Fast-forward command executed: concluding 10-minute cycle.',
        category: 'system',
        level: 'warning',
        stageIndex: 5
      },
      {
        id: `ff-end-${Date.now()}`,
        timestamp: `[${formatTime24(new Date(now.getTime() + 500))}]`,
        message: 'Load process completed. Generating audit completion report.',
        category: 'system',
        level: 'success',
        stageIndex: 5
      }
    ]);

    onUpdateSession((prev) => ({
      ...prev,
      elapsedSeconds: prev.targetDurationSec,
      progressPercent: 100,
      currentStageIndex: 5,
      status: 'completed',
      endTime: Date.now()
    }));

    setTimeout(() => {
      onComplete();
    }, 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Load Test Header Telemetry Bar */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl backdrop-blur-xl">
        
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-blue-600/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          
          {/* Active Target Info */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              <span>Active Load Test Session · 10-Minute Stress Test</span>
            </div>
            
            <h2 className="mt-1 font-mono text-xl font-black text-white sm:text-2xl">
              {session.config.serverName}
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span>ID: <strong className="font-mono text-cyan-300">{session.sessionId}</strong></span>
              <span>·</span>
              <span>Volume: <strong className="font-mono text-slate-200">{session.config.serverVolume}</strong></span>
              <span>·</span>
              <span>Holder: <strong className="text-slate-200">{session.config.serverHolderName}</strong></span>
            </div>
          </div>

          {/* Large Countdown Display */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            
            {/* Countdown Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 px-5 py-3 shadow-inner">
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Time Remaining (10:00 Cycle)
              </div>
              <div className="font-mono text-3xl font-black tracking-widest text-cyan-400 tabular-nums sm:text-4xl">
                {remainingFormatted}
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Elapsed: {elapsedFormatted}</span>
                <span className="text-slate-400">Target: 10:00</span>
              </div>
            </div>

            {/* Progress Percentage Circle / Metric */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 px-5 py-3 text-right shadow-inner">
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Load Test Progress
              </div>
              <div className="font-mono text-3xl font-black text-emerald-400 tabular-nums sm:text-4xl">
                {session.progressPercent.toFixed(1)}%
              </div>
              <div className="mt-0.5 text-[10px] font-bold tracking-wide text-cyan-300">
                {currentStage.name}
              </div>
            </div>

          </div>

        </div>

        {/* Continuous Fluid Progress Bar */}
        <div className="relative z-10 mt-6 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>0% Initialization</span>
            <span className="font-bold text-cyan-400">{session.progressPercent.toFixed(1)}% Completed</span>
            <span>100% Final Report</span>
          </div>
          
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-950 ring-1 ring-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, session.progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Simulation Controls Toolbar (Speed / Pause / Fast-Forward) */}
        <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          
          {/* Pause / Resume & Cancel */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePause}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                session.status === 'paused'
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {session.status === 'paused' ? (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Resume Load Test
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </>
              )}
            </button>

            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-red-500/50 hover:text-red-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Abort Session
            </button>
          </div>

          {/* Speed Multiplier & Testing Fast-Forward */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-sans">Run Speed:</span>
            
            {[
              { label: '1x (Real 10m)', val: 1 },
              { label: '10x', val: 10 },
              { label: '60x', val: 60 }
            ].map((spd) => (
              <button
                key={spd.val}
                onClick={() => handleSetSpeed(spd.val)}
                className={`rounded px-2.5 py-1 font-mono text-[11px] font-semibold transition ${
                  session.speedMultiplier === spd.val
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={`Run test at ${spd.label}`}
              >
                {spd.label}
              </button>
            ))}

            <button
              onClick={handleFastForwardToComplete}
              className="flex items-center gap-1 rounded bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1 text-[11px] font-bold text-slate-950 shadow-md transition hover:opacity-95"
              title="Immediately finish 10-minute cycle to view report"
            >
              <FastForward className="h-3.5 w-3.5" />
              Fast-Forward to Finish
            </button>
          </div>

        </div>

      </div>

      {/* Multi-Stage Pipeline Progress Component */}
      <StageProgressPanel
        currentStageIndex={session.currentStageIndex}
        progressPercent={session.progressPercent}
      />

      {/* Live Terminal Activity Logs */}
      <LiveActivityLogs
        logs={logs}
        currentStageName={currentStage.name}
        elapsedFormatted={elapsedFormatted}
        remainingFormatted={remainingFormatted}
        progressPercent={session.progressPercent}
      />

    </div>
  );
};
