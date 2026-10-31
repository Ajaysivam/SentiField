import React, { useState, useEffect } from 'react';

/**
 * Priority-Based Farm Development Timeline
 * ------------------------------------------
 * Converts the AI action-plan into a sequential, numbered vertical timeline
 * that a farmer can work through one-by-one, ticking off each step as they go.
 *
 * Phases:
 *  🔴 IMMEDIATE  — next 24–48 hours   (critical priority, pulsing red ring)
 *  🟡 SHORT TERM — days 3–7           (medium priority, amber)
 *  🟢 ROUTINE    — days 8–14          (maintenance, green)
 */

const PHASE_CONFIG = [
  {
    key: 'immediate_24_48h',
    label: 'IMMEDIATE PRIORITY',
    sublabel: '⚡ Next 24 – 48 Hours',
    badge: 'CRITICAL',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.45)',
    textColor: '#fca5a5',
    numberBg: '#dc2626',
    icon: '🚨',
    pulseRing: true,
  },
  {
    key: 'short_term_3_7d',
    label: 'SHORT-TERM ACTIONS',
    sublabel: '🌱 Days 3 – 7',
    badge: 'PLANNED',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.3)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.4)',
    textColor: '#fde68a',
    numberBg: '#d97706',
    icon: '📋',
    pulseRing: false,
  },
  {
    key: 'maintenance_8_14d',
    label: 'ROUTINE MAINTENANCE',
    sublabel: '🌾 Days 8 – 14',
    badge: 'ROUTINE',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.3)',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.4)',
    textColor: '#6ee7b7',
    numberBg: '#059669',
    icon: '✅',
    pulseRing: false,
  },
];

function buildSteps(actionPlan) {
  const steps = [];
  let globalIdx = 0;

  PHASE_CONFIG.forEach((phase) => {
    const items = actionPlan[phase.key] || [];
    items.forEach((item, localIdx) => {
      globalIdx++;
      steps.push({
        id: `${phase.key}-${localIdx}`,
        stepNumber: globalIdx,
        phase,
        action: item.action || '',
        reason: item.reason || '',
      });
    });
  });

  return steps;
}

export default function PriorityTimeline({ actionPlan }) {
  const steps = buildSteps(actionPlan);
  const [completed, setCompleted] = useState({});
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 1100);
    return () => clearInterval(t);
  }, []);

  if (steps.length === 0) return null;

  const firstIncomplete = steps.find((s) => !completed[s.id]);
  const totalDone = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((totalDone / steps.length) * 100);

  const toggleDone = (id) =>
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{
      marginTop: '2rem',
      background: 'rgba(15,23,42,0.97)',
      border: '1px solid rgba(99,102,241,0.35)',
      borderRadius: '18px',
      padding: '1.75rem 1.5rem',
      boxShadow: '0 0 40px rgba(99,102,241,0.08), 0 8px 32px rgba(0,0,0,0.4)',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🗓️</span>
            <h3 style={{ fontSize: '1.3rem', color: '#ffffff', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
              Farm Development Priority Timeline
            </h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '0.3rem 0 0 0', maxWidth: '520px' }}>
            Complete each step in order — from most critical to routine. Tap a step when done to track your progress.
          </p>
        </div>

        {/* Progress bubble */}
        <div style={{ textAlign: 'center', minWidth: '90px' }}>
          <div style={{
            width: '72px', height: '72px',
            borderRadius: '50%',
            background: `conic-gradient(#10b981 ${progress * 3.6}deg, rgba(255,255,255,0.07) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 18px rgba(16,185,129,${progress > 0 ? 0.4 : 0.1})`,
            transition: 'all 0.6s ease',
            margin: '0 auto',
          }}>
            <div style={{
              width: '54px', height: '54px',
              borderRadius: '50%',
              background: '#0f172a',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', lineHeight: 1 }}>{progress}%</span>
              <span style={{ fontSize: '0.58rem', color: '#64748b', lineHeight: 1, marginTop: '2px' }}>DONE</span>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            {totalDone} / {steps.length} steps
          </div>
        </div>
      </div>

      {/* ── Phase Legend ── */}
      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        {PHASE_CONFIG.map((ph) => (
          <div key={ph.key} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: ph.bg,
            border: `1px solid ${ph.border}`,
            borderRadius: '20px',
            padding: '0.25rem 0.75rem',
            fontSize: '0.78rem',
            color: ph.color,
            fontWeight: '700',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: ph.color,
              boxShadow: `0 0 6px ${ph.glow}`,
              flexShrink: 0,
            }} />
            {ph.sublabel}
          </div>
        ))}
      </div>

      {/* ── Vertical Timeline ── */}
      <div style={{ position: 'relative' }}>
        {/* Vertical connector line */}
        <div style={{
          position: 'absolute',
          left: '27px',
          top: '0',
          bottom: '0',
          width: '2px',
          background: 'linear-gradient(180deg, #dc2626 0%, #d97706 50%, #059669 100%)',
          opacity: 0.35,
          borderRadius: '2px',
          zIndex: 0,
        }} />

        {steps.map((step, idx) => {
          const ph = step.phase;
          const isDone = !!completed[step.id];
          const isNext = firstIncomplete?.id === step.id;

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: idx < steps.length - 1 ? '1rem' : '0',
                position: 'relative',
                zIndex: 1,
                opacity: isDone ? 0.5 : 1,
                transition: 'opacity 0.4s ease',
              }}
            >
              {/* Step number circle */}
              <div style={{ flexShrink: 0 }}>
                <div
                  onClick={() => toggleDone(step.id)}
                  title={isDone ? 'Mark as not done' : 'Mark as done'}
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: isDone
                      ? 'rgba(16,185,129,0.2)'
                      : isNext
                      ? ph.numberBg
                      : 'rgba(30,41,59,0.9)',
                    border: isDone
                      ? '2px solid #10b981'
                      : isNext
                      ? `2px solid ${ph.color}`
                      : '2px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isDone ? '1.35rem' : '1.05rem',
                    fontWeight: '900',
                    color: isDone ? '#10b981' : '#ffffff',
                    boxShadow: isNext && !isDone
                      ? `0 0 0 ${pulse ? '6px' : '3px'} ${ph.glow}, 0 4px 14px ${ph.glow}`
                      : 'none',
                    transition: 'box-shadow 0.55s ease, background 0.3s ease',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {isDone ? '✓' : step.stepNumber}
                </div>
              </div>

              {/* Step content card */}
              <div style={{
                flex: 1,
                background: isDone
                  ? 'rgba(16,185,129,0.05)'
                  : isNext
                  ? ph.bg
                  : 'rgba(30,41,59,0.5)',
                border: isDone
                  ? '1px solid rgba(16,185,129,0.25)'
                  : isNext
                  ? `1.5px solid ${ph.color}`
                  : '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px',
                padding: '0.9rem 1.1rem',
                transition: 'all 0.3s ease',
                boxShadow: isNext && !isDone ? `0 4px 20px ${ph.glow}` : 'none',
              }}>

                {/* Phase label row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      color: isDone ? '#10b981' : ph.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      {ph.icon} {ph.label}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      background: isDone ? 'rgba(16,185,129,0.2)' : ph.bg,
                      color: isDone ? '#10b981' : ph.color,
                      border: `1px solid ${isDone ? 'rgba(16,185,129,0.4)' : ph.border}`,
                    }}>
                      {isDone ? 'DONE ✓' : isNext ? '▶ DO THIS NEXT' : ph.badge}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#475569' }}>{ph.sublabel}</span>
                </div>

                {/* Action title */}
                <strong style={{
                  display: 'block',
                  fontSize: '1rem',
                  color: isDone ? '#64748b' : '#ffffff',
                  fontWeight: '700',
                  lineHeight: '1.35',
                  textDecoration: isDone ? 'line-through' : 'none',
                  marginBottom: '0.35rem',
                }}>
                  {step.action}
                </strong>

                {/* Rationale */}
                <p style={{
                  fontSize: '0.84rem',
                  color: isDone ? '#475569' : ph.textColor,
                  margin: 0,
                  lineHeight: '1.5',
                }}>
                  {step.reason}
                </p>

                {/* Mark as done button — only on "do-next" step */}
                {isNext && !isDone && (
                  <button
                    onClick={() => toggleDone(step.id)}
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: ph.numberBg,
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.45rem 1rem',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      color: '#ffffff',
                      cursor: 'pointer',
                      boxShadow: `0 2px 10px ${ph.glow}`,
                    }}
                  >
                    ✅ Mark as Completed
                  </button>
                )}

                {/* Undo button */}
                {isDone && (
                  <button
                    onClick={() => toggleDone(step.id)}
                    style={{
                      marginTop: '0.5rem',
                      background: 'transparent',
                      border: '1px solid rgba(100,116,139,0.4)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.7rem',
                      fontSize: '0.78rem',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    ↩ Undo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── All Done Celebration ── */}
      {totalDone === steps.length && steps.length > 0 && (
        <div style={{
          marginTop: '1.5rem',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.15) 100%)',
          border: '1.5px solid #10b981',
          borderRadius: '14px',
          padding: '1.25rem',
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(16,185,129,0.2)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>🎉</div>
          <strong style={{ fontSize: '1.2rem', color: '#34d399', display: 'block' }}>
            All Farm Development Steps Completed!
          </strong>
          <p style={{ fontSize: '0.9rem', color: '#6ee7b7', margin: '0.3rem 0 0 0' }}>
            Excellent work! Your farm is on track for maximum yield. Re-analyze with the next satellite pass in 5 days to confirm recovery.
          </p>
        </div>
      )}

      {/* ── Reset button ── */}
      {totalDone > 0 && (
        <button
          onClick={() => setCompleted({})}
          style={{
            marginTop: '1rem',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '0.4rem 0.85rem',
            fontSize: '0.78rem',
            color: '#64748b',
            cursor: 'pointer',
            display: 'block',
          }}
        >
          🔄 Reset All Progress
        </button>
      )}
    </div>
  );
}
