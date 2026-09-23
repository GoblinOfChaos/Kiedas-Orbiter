/**
 * About.jsx
 *
 * App information, credits, and legal disclaimer.
 *
 * ROLE
 * ─────────────────────────────────────────
 * Purely informational component. Displays versions, links to data sources
 * (warframe-items, browse.wf, etc.), and a critical warning about the
 * ban risk associated with memory-based extraction.
 */
import { useState, useEffect } from 'react';
import { useUi } from '../contexts/UiContext'
import { AlertTriangle, Github } from 'lucide-react';
import { PageLayout, Card } from '../components/UI';
import { invoke, convertFileSrc } from '../lib/logging/tauri';
import { version } from '../../package.json';

const CREDITS = [
{ name: 'RHPestilence', descKey: 'about.credit_icon', links: [{ label: 'Ko-fi', href: 'https://ko-fi.com/rhpestilence' }, { label: 'Etsy shop', href: 'https://rottingtrove.etsy.com' }, { label: 'X/Twitter', href: 'https://x.com/RHPestilence' }] },
{ name: 'glowseeker/cephalon-kronos', descKey: 'about.credit_fork', href: 'https://github.com/glowseeker/cephalon-kronos' },
{ name: 'calamity-inc', descKey: 'about.credit_browsewf', href: 'https://github.com/calamity-inc' },
{ name: 'relics.run', descKey: 'about.credit_relics_run', href: 'https://relics.run' },
{ name: 'Sainan/warframe-api-helper', descKey: 'about.credit_api_helper', href: 'https://github.com/Sainan/warframe-api-helper' },
{ name: 'WFCD/warframe-items', descKey: 'about.credit_wfcd', href: 'https://github.com/WFCD/warframe-items' },
{ name: 'warframetools.com', descKey: 'about.credit_checklist', href: 'https://warframetools.com/Task-Checklist/' },
{ name: 'Warframe Wiki', descKey: 'about.credit_wiki', href: 'https://wiki.warframe.com' },
{ name: 'cjtho/WarframeRivenPricer', descKey: 'about.credit_riven_pricer', href: 'https://github.com/cjtho/WarframeRivenPricer' }];


export default function About() {
  const { t } = useUi()
  const [uiPath, setUiPath] = useState('');
  useEffect(() => {invoke('get_ui_path').then(setUiPath).catch(() => {});}, []);

  const handleOpenLink = async (url) => {
    try {
      await invoke('open_url', { url });
    } catch (err) {
      console.error('Failed to open link with custom open_url command:', err);
    }
  };

  return (
    <PageLayout titleKey="screen.about">
      <div className="space-y-6">

        {/* App Info */}
        <Card glow>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {uiPath &&
              <img
                src={convertFileSrc(`${uiPath}/IconKieda.png`)}
                alt="Kieda's Orbiter"
                className="w-full h-full object-contain" />
              }
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t('about.title')}</h2>
              <p className="text-kronos-dim text-sm">v{version} - {t('about.tagline')}</p>
            </div>
          </div>
          <p className="text-kronos-text/90 mb-4 leading-relaxed text-sm">{t('about.subtitle')}

          </p>
          <p className="text-kronos-text/70 mb-4 text-xs leading-relaxed">
            {t('about.fork_notice_pre')} <button onClick={() => handleOpenLink('https://github.com/glowseeker/cephalon-kronos')} className="text-kronos-accent hover:underline cursor-pointer font-medium">Cephalon Kronos</button> {t('about.fork_notice_post')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleOpenLink('https://github.com/GoblinOfChaos/Kiedas-Orbiter')}
              className="inline-flex items-center gap-2 text-kronos-accent hover:text-kronos-accent-secondary transition-colors text-sm font-medium cursor-pointer">

              <Github size={18} />{t('about.github')}

            </button>
          </div>
        </Card>

        {/* Credits */}
        <Card glow>
          <h3 className="text-sm font-bold uppercase tracking-widest text-kronos-dim mb-3">{t('ui.dashboard.credits')}</h3>
          <ul className="space-y-2">
            {CREDITS.map(({ name, descKey, href, links }) =>
            <li key={href ?? name} className="flex items-start gap-2 text-sm">
                <span className="text-kronos-accent font-bold flex-shrink-0">•</span>
                <span>
                  {links ?
                  <span className="font-bold text-kronos-text">{name}</span> :

                  <button
                    onClick={() => handleOpenLink(href)}
                    className="font-bold text-kronos-accent hover:underline cursor-pointer">

                    {name}
                  </button>
                  }
                  <span className="text-kronos-dim ml-1.5">- {t(descKey)}</span>
                  {links &&
                  <span className="text-kronos-dim">
                      {' ('}
                    {links.map(({ label, href: linkHref }, i) =>
                    <span key={linkHref}>
                          {i > 0 && ', '}
                          <button
                          onClick={() => handleOpenLink(linkHref)}
                          className="font-bold text-kronos-accent hover:underline cursor-pointer">

                            {label}
                          </button>
                        </span>
                    )}
                      {')'}
                    </span>
                  }
                </span>
              </li>
            )}
          </ul>
        </Card>

        {/* Disclaimer */}
        <Card glow className="bg-red-500/10 border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" size={22} />
            <div>
              <h3 className="text-base font-semibold text-red-400 mb-2">{t('about.disclaimer')}</h3>
              <p className="text-kronos-text/90 text-sm leading-relaxed mb-2">{t('about.disclaimer_text')}

              </p>
              <ul className="text-kronos-text/80 text-xs space-y-0.5 mb-2 list-disc list-inside">
                <li>{t('about.de_disclaimer')}</li>
                <li>{t('about.read_only')}</li>
              </ul>
              <p className="text-red-400 font-medium text-xs">{t('about.use_at_own_risk')}</p>
            </div>
          </div>
        </Card>

      </div>
    </PageLayout>);

}
