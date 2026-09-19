import { useEffect, useRef, useState } from 'react';
import { Map, X, ChevronDown, ExternalLink, Flag } from 'lucide-react';
import {
  useAcquisitionDrawerData,
  formatChance,
  getSourceLabel,
  splitUnconfirmed,
  formatCredits,
  formatDuration,
} from '../../components/AcquisitionDrawer';
import { resolveBlueprintOrigin } from '../../lib/acquisitionData';
import { getDropSourcesWithFallback } from '../../lib/dropsParser';
import ItemImage from '../../components/ItemImage';
import BugReporterModal from '../../components/BugReporterModal';
import { useUi } from '../../contexts/UiContext';
import { useMonitoring } from '../../contexts/MonitoringContext';
import './preview-acquisition.css';

/**
 * Option 01 right-side acquisition drawer (GitHub #110). Presentation only -
 * all source/recipe/wiki data comes from useAcquisitionDrawerData, the same
 * resolver AcquisitionDrawer.jsx's Stable/legacy-Preview variants use, so
 * this never re-derives acquisition facts of its own.
 */
export default function PreviewAcquisitionDrawer({ item, onClose }) {
  const { t } = useUi();
  const { dropIndex } = useMonitoring();
  const { displayName, uniqueName, info, wikiLink, openWikiLink, recipe, sources, codexLoading } = useAcquisitionDrawerData(item);
  const [showReportModal, setShowReportModal] = useState(false);
  const [altsExpanded, setAltsExpanded] = useState(false);
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const headingId = 'preview-acq-drawer-title';

  // Reset the disclosure/scroll state whenever the drawer starts showing a
  // different item (the drawer stays mounted, only `item` changes) so a
  // collapsed section from the previous item doesn't leak into the new one.
  useEffect(() => {
    setAltsExpanded(false);
    if (drawerRef.current) {
      const body = drawerRef.current.querySelector('[data-preview-acq-body]');
      if (body) body.scrollTop = 0;
    }
  }, [uniqueName]);

  // Focus trap + Escape + focus restoration. Suspended entirely while the
  // nested report modal is open - that modal owns its own close semantics,
  // and closing it must not also close this drawer.
  useEffect(() => {
    if (!item) return undefined;
    previousFocusRef.current = document.activeElement;
    const drawer = drawerRef.current;
    const focusable = () => drawer?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') || [];
    focusable()[0]?.focus();

    const onKeyDown = (event) => {
      if (showReportModal) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, showReportModal]);

  if (!item) return null;

  const featured = sources[0] || null;
  const alternatives = sources.slice(1);
  const featuredSplit = featured ? splitUnconfirmed(getSourceLabel(featured, t)) : null;
  const blueprintOrigin = recipe ? resolveBlueprintOrigin(displayName, recipe) : null;

  return (
    <>
      <div
        className="preview-acq-backdrop"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="preview-acq-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="preview-acq-topstrip">
          <span className="preview-acq-topstrip-label">
            <Map size={14} aria-hidden="true" />
            {t('acquisition_drawer.how_to_obtain')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="preview-acq-close"
            aria-label={t('acquisition_drawer.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="preview-acq-body" data-preview-acq-body>
          <div className="preview-acq-hero">
            {item.category && <span className="preview-acq-eyebrow">{item.category}</span>}
            <div className="preview-acq-hero-row">
              <h2 id={headingId} className="preview-acq-title">{displayName}</h2>
              <div className="preview-acq-hero-image">
                <ItemImage src={item.image} alt="" placeholderClassName="preview-acq-hero-image" />
              </div>
            </div>
            {recipe && <span className="preview-acq-badge">{t('acquisition_drawer.recipe_badge')}</span>}
          </div>

          {/* A pure recipe-only item (no sources at all) leads with the
              recipe instead of an empty "Where to start / 0 sources"
              heading - per the handoff spec's required-states table. */}
          {(sources.length > 0 || !recipe) &&
            <>
              <div className="preview-acq-section-head">
                <h3>{t('acquisition_drawer.where_to_start')}</h3>
                <span className="preview-acq-muted">{t(sources.length === 1 ? 'acquisition_drawer.sources_count_one' : 'acquisition_drawer.sources_count', { count: sources.length })}</span>
              </div>

              {featured ?
                <div className="preview-acq-featured">
                  <div className="preview-acq-featured-top">
                    <span className="preview-acq-muted-label">{t('acquisition_drawer.available_source')}</span>
                    {typeof featured.chance === 'number' &&
                      <span className="preview-acq-chance">{formatChance(featured.chance)}</span>
                    }
                  </div>
                  {featuredSplit.unconfirmed &&
                    <span className="preview-acq-unconfirmed-badge">{t('acquisition_drawer.unconfirmed_badge')}</span>
                  }
                  <p className="preview-acq-featured-text">{featuredSplit.text}</p>
                </div>
              : info?.vaulted === true ?
                <p className="preview-acq-vaulted-note">{t('acquisition_drawer.vaulted_no_source')}</p>
              : codexLoading ?
                <p className="preview-acq-muted italic">{t('acquisition_drawer.checking_item_data')}</p>
              :
                <div className="preview-acq-no-source">
                  <p className="preview-acq-muted italic">{t('acquisition_drawer.no_verified_route')}</p>
                  <button type="button" onClick={() => setShowReportModal(true)} className="preview-acq-report-inline">
                    <Flag size={11} />
                    {t('acquisition_drawer.know_where_found')}
                  </button>
                </div>
              }
            </>
          }

          {alternatives.length > 0 &&
            <div className="preview-acq-alternatives">
              <button
                type="button"
                className="preview-acq-disclosure-toggle"
                aria-expanded={altsExpanded}
                onClick={() => setAltsExpanded((v) => !v)}
              >
                <ChevronDown size={14} className={`preview-acq-chevron ${altsExpanded ? 'is-open' : ''}`} />
                {t('acquisition_drawer.other_sources')}
                <span className="preview-acq-count-badge">{alternatives.length}</span>
              </button>
              {altsExpanded &&
                <div className="preview-acq-alt-rows">
                  {alternatives.map((s, i) => {
                    const { text, unconfirmed } = splitUnconfirmed(getSourceLabel(s, t));
                    return (
                      <div key={i} className="preview-acq-alt-row">
                        <div className="preview-acq-alt-row-text">
                          {unconfirmed &&
                            <span className="preview-acq-unconfirmed-badge">{t('acquisition_drawer.unconfirmed_badge')}</span>
                          }
                          <span>{text}</span>
                        </div>
                        {typeof s.chance === 'number' &&
                          <span className="preview-acq-chance-sm">{formatChance(s.chance)}</span>
                        }
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          }

          {sources.some((s) => splitUnconfirmed(getSourceLabel(s, t)).unconfirmed) &&
            <p className="preview-acq-unconfirmed-note">{t('acquisition_drawer.unconfirmed_price_note')}</p>
          }

          {recipe &&
            <div className="preview-acq-recipe">
              <h3>{t('acquisition_drawer.crafting_requirements')}</h3>
              <div className="preview-acq-recipe-costs">
                {formatCredits(recipe.blueprintCost) && <span>{t('acquisition_drawer.blueprint_label')} <strong>{formatCredits(recipe.blueprintCost)}</strong></span>}
                {formatCredits(recipe.buildCost) && <span>{t('acquisition_drawer.build_label')} <strong>{formatCredits(recipe.buildCost)}</strong></span>}
                {formatDuration(recipe.buildTime) && <span>{t('acquisition_drawer.time_label')} <strong>{formatDuration(recipe.buildTime)}</strong></span>}
                {recipe.rushCost > 0 && <span>{t('acquisition_drawer.rush_label')} <strong>{recipe.rushCost} {t('ui.dashboard.platinum')}</strong></span>}
              </div>
              {recipe.ingredients?.length > 0 &&
                <div className="preview-acq-ingredients">
                  {blueprintOrigin &&
                    <div className="preview-acq-ingredient">
                      <div className="preview-acq-ingredient-row">
                        <span>1x {t('acquisition_drawer.blueprint_label')}</span>
                      </div>
                      <div className="preview-acq-ingredient-sources">
                        <div className="preview-acq-ingredient-source-row">
                          <span>{blueprintOrigin}</span>
                        </div>
                      </div>
                    </div>
                  }
                  {recipe.ingredients.map((ingredient, i) => {
                    const drops = getDropSourcesWithFallback(ingredient.itemType, dropIndex, ingredient.name);
                    return (
                      <div key={`${ingredient.itemType || ingredient.name}-${i}`} className="preview-acq-ingredient">
                        <div className="preview-acq-ingredient-row">
                          <span>{ingredient.count}x {ingredient.name}</span>
                        </div>
                        {drops?.length > 0 &&
                          <div className="preview-acq-ingredient-sources">
                            {drops.map((drop, dropIndex) => (
                              <div key={`${drop.location || 'source'}-${dropIndex}`} className="preview-acq-ingredient-source-row">
                                <span>{getSourceLabel(drop, t)}</span>
                                {typeof drop.chance === 'number' && <span className="preview-acq-chance-sm">{formatChance(drop.chance)}</span>}
                              </div>
                            ))}
                          </div>
                        }
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          }
        </div>

        <div className="preview-acq-footer">
          <button type="button" onClick={openWikiLink} className="preview-acq-wiki-button">
            <ExternalLink size={14} />
            {wikiLink?.isDirect ? t('acquisition_drawer.view_wiki') : t('acquisition_drawer.search_wiki')}
          </button>
          <button type="button" onClick={() => setShowReportModal(true)} className="preview-acq-report-button">
            <Flag size={13} />
            {t('acquisition_drawer.report_source_info')}
          </button>
        </div>
      </div>
      <BugReporterModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        initialDescription={t('acquisition_drawer.bug_report_template', { displayName, uniqueName })}
      />
    </>
  );
}
