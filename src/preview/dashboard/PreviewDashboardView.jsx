import { Anvil, ArrowRight, BellRing, RefreshCw, Sparkles, Target } from 'lucide-react';
import { isValidElement, useRef, useState } from 'react';
import PreviewButton from '../components/PreviewButton';
import PreviewDataState from '../components/PreviewDataState';
import PreviewPanel from '../components/PreviewPanel';
import PreviewPage from '../shell/PreviewPage';
import { DASHBOARD_PROMOTED_CARD_IDS, DASHBOARD_SECTIONS } from '../view-models/dashboardViewModel';

const WIDE_CARD_IDS = ['bounty', 'arch', '1999', 'nightwave'];

function SummaryCard({ icon: Icon, value, label, detail }) {
  return (
    <PreviewPanel className="preview-dashboard__stat">
      <Icon aria-hidden="true" />
      <div><strong>{value}</strong><small>{label}</small></div>
      {detail && <em>{detail}</em>}
    </PreviewPanel>
  );
}

function RecipeImage({ src, name }) {
  const [failed, setFailed] = useState(!src);
  if (failed) return <span className="preview-dashboard__recipe-image" role="img" aria-label={`${name}: image unavailable`}><Anvil aria-hidden="true" /></span>;
  return <img src={src} alt={name} onError={() => setFailed(true)} />;
}

export default function PreviewDashboardView({
  model,
  cards = {},
  actions,
  loading = false,
  targetNotice = false,
  onAddFarmingTarget,
  onNavigate,
  onCustomize,
  onRefresh,
  t,
}) {
  const allActivitiesRef = useRef(null);
  const promoted = DASHBOARD_PROMOTED_CARD_IDS.filter((id) => isValidElement(cards[id]));
  const sections = DASHBOARD_SECTIONS.map((section) => ({
    ...section,
    cardIds: section.cardIds.filter((id) => !DASHBOARD_PROMOTED_CARD_IDS.includes(id) && isValidElement(cards[id])),
  })).filter((section) => section.cardIds.length);

  return (
    <PreviewPage
      eyebrow={t('preview.dashboard.eyebrow')}
      title={t('preview.dashboard.heading')}
      summary={t('preview.dashboard.subtitle')}
      actions={actions}
      className="preview-dashboard"
    >
      {loading ? (
        <div className="preview-dashboard__loading">
          <PreviewDataState
            state="loading"
            title={t('ui.dashboard.loading_worldstate')}
            action={<PreviewButton iconOnly onClick={onRefresh} aria-label={t('ui.dashboard.loading_worldstate')}><RefreshCw aria-hidden="true" /></PreviewButton>}
          />
        </div>
      ) : (
        <>
          <div className="preview-dashboard__layout">
            <div className="preview-dashboard__main">
              <div className="preview-dashboard__summary" aria-label={t('preview.dashboard.summary_aria')}>
                <SummaryCard icon={Target} value={model.targets.count} label={t('preview.dashboard.tracked_targets')} detail={t('preview.dashboard.targets_not_ready')} />
                <SummaryCard icon={Anvil} value={model.foundry.known ? model.foundry.count : '—'} label={t('preview.dashboard.ready_to_claim')} detail={!model.foundry.known ? t('preview.dashboard.inventory_unavailable') : undefined} />
                <SummaryCard icon={Sparkles} value={model.session.count} label={t('preview.dashboard.new_activity')} />
              </div>

              <PreviewPanel className="preview-dashboard__panel">
                <header><h2>{t('preview.dashboard.continue_plans')}</h2></header>
                <div className="preview-dashboard__target-empty">
                  <Target aria-hidden="true" />
                  <strong>{t('preview.dashboard.no_targets')}</strong>
                  <p>{t('preview.dashboard.no_targets_detail')}</p>
                  <PreviewButton variant="primary" onClick={onAddFarmingTarget}>{t('preview.dashboard.add_target')}</PreviewButton>
                  {targetNotice && <p className="preview-dashboard__target-notice" role="status">{t('preview.dashboard.no_targets_detail')}</p>}
                </div>
              </PreviewPanel>

              <PreviewPanel className="preview-dashboard__session">
                <header>
                  <h2>{t('preview.dashboard.session')}</h2>
                  <PreviewButton variant="ghost" onClick={() => onNavigate('history')}>{t('preview.dashboard.view_history')}</PreviewButton>
                </header>
                {model.session.items.length ? (
                  <div className="preview-dashboard__session-list">
                    {model.session.items.map((item) => <div className="preview-dashboard__session-item" key={item.id}><span><strong>{item.title}</strong><small>{item.message}</small></span><BellRing aria-hidden="true" /></div>)}
                  </div>
                ) : <PreviewDataState compact state="empty" title={t('preview.dashboard.no_session_activity')} />}
              </PreviewPanel>
            </div>

            <aside className="preview-dashboard__live" aria-labelledby="preview-dashboard-live-title">
              <h2 id="preview-dashboard-live-title">{t('preview.dashboard.live_activities')}</h2>
              <div className="preview-dashboard__live-cards">
                {promoted.map((id) => <div className="preview-dashboard__live-card" data-dashboard-card={id} key={id}>{cards[id]}</div>)}
              </div>
              <PreviewButton className="preview-dashboard__view-all" variant="ghost" onClick={() => { allActivitiesRef.current?.focus(); allActivitiesRef.current?.scrollIntoView({ block: 'start' }); }}>
                {t('preview.dashboard.view_all_activities')} <ArrowRight aria-hidden="true" />
              </PreviewButton>
            </aside>

            <PreviewPanel className="preview-dashboard__foundry">
              <header><h2>{t('preview.dashboard.foundry_ready')}</h2></header>
              {!model.foundry.known ? <PreviewDataState compact state="unavailable" title={t('preview.dashboard.inventory_unavailable')} /> : model.foundry.items.length ? (
                <div className="preview-dashboard__foundry-grid">
                  {model.foundry.items.map((item) => (
                    <article className="preview-dashboard__recipe" key={item.id}>
                      <RecipeImage src={item.image} name={item.name} />
                      <div><h3>{item.name}</h3></div>
                    </article>
                  ))}
                </div>
              ) : <PreviewDataState compact state="empty" title={`0 ${t('preview.dashboard.ready_to_claim')}`} />}
            </PreviewPanel>

            <section className="preview-dashboard__all" aria-labelledby="preview-dashboard-all-title">
              <header className="preview-dashboard__panel-header">
                <h2 id="preview-dashboard-all-title" ref={allActivitiesRef} tabIndex={-1}>{t('preview.dashboard.all_activities')}</h2>
              </header>
              {sections.length ? sections.map((section) => (
                <section className="preview-dashboard__section" aria-labelledby={`preview-dashboard-${section.id}`} key={section.id}>
                  <header><h2 id={`preview-dashboard-${section.id}`}>{t(section.titleKey)}</h2></header>
                  <div className="preview-dashboard__card-grid">
                    {section.cardIds.map((id) => <div className={`preview-dashboard__card-slot${WIDE_CARD_IDS.includes(id) ? ' preview-dashboard__card-slot--wide' : ''}`} data-dashboard-card={id} key={id}>{cards[id]}</div>)}
                  </div>
                </section>
              )) : (
                <PreviewDataState
                  state="empty"
                  title={t('ui.dashboard.visible_cards')}
                  action={<PreviewButton onClick={onCustomize}>{t('preview.dashboard.customize')}</PreviewButton>}
                />
              )}
            </section>
          </div>
        </>
      )}
    </PreviewPage>
  );
}
