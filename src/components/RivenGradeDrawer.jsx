import { Award } from 'lucide-react';
import { useUi } from '../contexts/UiContext';

const STATUS_STYLE = {
  'good': 'text-green-400',
  'off-target': 'text-kronos-dim',
  'safe-negative': 'text-green-400',
  'risky-negative': 'text-red-400',
  'missing-required': 'text-red-400'
};

const STATUS_LABEL_KEY = {
  'good': 'riven_grade_drawer.status_good',
  'off-target': 'riven_grade_drawer.status_off_target',
  'safe-negative': 'riven_grade_drawer.status_safe_negative',
  'risky-negative': 'riven_grade_drawer.status_risky_negative',
  'missing-required': 'riven_grade_drawer.status_missing_required'
};

/** Bottom drawer showing the stat-combo breakdown behind a riven's grade
 * badge - same shell/interaction as AcquisitionDrawer, ported content from
 * wfinfo-ng's riven_grader_overlay.py per-stat assessment card. */
export default function RivenGradeDrawer({ riven, statGrade, onClose }) {
  const { t } = useUi();
  if (!riven || !statGrade) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-kronos-bg border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-kronos-accent" />
            <h3 className="text-sm font-black uppercase tracking-widest text-kronos-text">{riven.name}</h3>
            {statGrade.grade &&
              <span className="text-xs font-black text-kronos-accent">{statGrade.grade} · {statGrade.label}</span>
            }
          </div>
          <button onClick={onClose} className="text-kronos-dim hover:text-kronos-text text-xs font-bold uppercase">
            {t('foundry.close')}
          </button>
        </div>

        {!statGrade.grade ?
          <p className="text-xs text-kronos-dim italic">{t('riven_grade_drawer.no_curated_profile')}</p>
        :
        <>
          {statGrade.assessment.length > 0 &&
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {statGrade.assessment.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded bg-black/30 border border-white/5">
                  <span className="text-xs text-kronos-text truncate">{a.text}</span>
                  <span className={`text-[10px] font-bold flex-shrink-0 ml-2 ${STATUS_STYLE[a.status] || 'text-kronos-dim'}`}>
                    {STATUS_LABEL_KEY[a.status] ? t(STATUS_LABEL_KEY[a.status]) : a.status}
                  </span>
                </div>
              ))}
            </div>
          }
          <p className="mt-3 text-[11px] text-kronos-dim">
            {t('riven_grade_drawer.target_combo')}{statGrade.mandatory.length > 0 ? statGrade.mandatory.join(' + ') : t('riven_grade_drawer.none_required')}
            {statGrade.optional.length > 0 && ` + ${statGrade.pickN} of [${statGrade.optional.join(', ')}]`}
            {statGrade.safeNegatives.length > 0 && ` · ${t('riven_grade_drawer.safe_negatives')}${statGrade.safeNegatives.join(', ')}`}
          </p>
        </>
        }
      </div>
    </div>
  );
}
