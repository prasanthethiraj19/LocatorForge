import { useEffect, useMemo, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { LocatorList } from './components/LocatorList';
import { EmptyState } from './components/EmptyState';
import { SettingsSheet } from './components/SettingsSheet';
import { TestLocator } from './components/TestLocator';
import { PomBasketBar } from './components/PomBasketBar';
import { PomGeneratorModal } from './components/PomGeneratorModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { RecorderPanel } from './components/RecorderPanel';
import { TestDataModal } from './components/TestDataModal';
import { ExportModal } from './components/ExportModal';
import { useSelectedElement } from './hooks/useSelectedElement';
import { useStorage } from './hooks/useStorage';
import { useLiveCounts } from './hooks/useLiveCounts';
import { usePicker } from './hooks/usePicker';
import { useTestLocator } from './hooks/useTestLocator';
import { useHighlight } from './hooks/useHighlight';
import { usePomBasket } from './hooks/usePomBasket';
import { useInspectedUrl } from './hooks/useInspectedUrl';
import { useLocatorHistory } from './hooks/useLocatorHistory';
import { useRecorder } from './hooks/useRecorder';
import { useFreeze } from './hooks/useFreeze';
import { generateCandidates, sortCandidates } from './lib/locators/generate';
import { formatExpression } from './lib/locators/format';
import { getFramework, DEFAULT_FRAMEWORK } from './lib/locators/frameworks';
import type { Candidate, FrameworkId } from './lib/locators/types';

export default function App() {
  const { element, error, pushPicked } = useSelectedElement();
  const { picking, start: startPick, cancel: cancelPick } = usePicker({ onPicked: pushPicked });
  const [frameworkId, setFrameworkId] = useStorage<FrameworkId>('framework', DEFAULT_FRAMEWORK);
  const [testIdAttribute, setTestIdAttribute] = useStorage<string>('testIdAttribute', 'data-testid');
  const [showSmart, setShowSmart] = useStorage<boolean>('showSmart', true);
  const [showAxes, setShowAxes] = useStorage<boolean>('showAxes', false);
  const [withHealing, setWithHealing] = useStorage<boolean>('withHealing', false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pomOpen, setPomOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [testDataOpen, setTestDataOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  const test = useTestLocator();
  const { flash } = useHighlight(testIdAttribute);
  const basket = usePomBasket();
  const inspectedUrl = useInspectedUrl();
  const history = useLocatorHistory(element, inspectedUrl);
  const recorder = useRecorder();
  const freeze = useFreeze();

  const framework = getFramework(frameworkId);
  const opts = useMemo(
    () => ({ testIdAttribute, showSmartPatterns: showSmart, showAxes, selfHealing: withHealing }),
    [testIdAttribute, showSmart, showAxes, withHealing],
  );

  const baseCandidates = useMemo(() => {
    if (!element || cleared) return [];
    return generateCandidates(element, opts);
  }, [element, opts, cleared]);

  const signature = element && !cleared
    ? `${element.cssPath}|${element.xpath}|${testIdAttribute}|${showSmart}|${showAxes}`
    : 'empty';
  const decorated = useLiveCounts(baseCandidates, opts, signature);
  const candidates = useMemo(() => sortCandidates(decorated), [decorated]);

  async function copyAll() {
    const all = candidates.map((c) => formatExpression(c, { framework, withHealing })).join('\n');
    try { await navigator.clipboard.writeText(all); } catch {}
  }

  async function copyTop() {
    if (!candidates.length) return;
    const expr = formatExpression(candidates[0], { framework, withHealing });
    try { await navigator.clipboard.writeText(expr); } catch {}
  }

  function clear() {
    setCleared(true);
    window.setTimeout(() => setCleared(false), 50);
  }

  function addToPom(c: Candidate) {
    basket.add(c);
  }

  function toggleRecord() {
    if (recorder.recording) {
      recorder.stop();
      setRecorderOpen(true); // show the captured steps + emit code
    } else {
      recorder.start();
      setRecorderOpen(true);
    }
  }

  function fillCurrent(value: string) {
    if (!element) return;
    const code = `(function(){var el=document.querySelector(${JSON.stringify(element.cssPath)});if(!el)return;var d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')||Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value');if(d&&d.set){d.set.call(el,${JSON.stringify(value)})}else{el.value=${JSON.stringify(value)}}el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))})()`;
    try { chrome.devtools.inspectedWindow.eval(code); } catch {}
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'Enter') {
        e.preventDefault();
        copyTop();
      } else if (meta && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        if (basket.items.length) setPomOpen(true);
      } else if (meta && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
        e.preventDefault();
        setHistoryOpen(true);
      } else if (meta && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setTestDataOpen(true);
      } else if (meta && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        setExportOpen(true);
      } else if (meta && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        toggleRecord();
      } else if (meta && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        freeze.toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [candidates, basket.items.length, recorder.recording]);

  const hasElement = !!element && !cleared && candidates.length > 0;

  return (
    <div className="qlc-app">
      <Toolbar
        framework={frameworkId}
        onFrameworkChange={setFrameworkId}
        onClear={clear}
        onCopyAll={copyAll}
        onOpenSettings={() => setSettingsOpen(true)}
        onPickToggle={() => (picking ? cancelPick() : startPick())}
        onToggleSmart={() => setShowSmart(!showSmart)}
        onToggleAxes={() => setShowAxes(!showAxes)}
        onToggleHealing={() => setWithHealing(!withHealing)}
        onOpenHistory={() => setHistoryOpen(true)}
        onToggleFreeze={freeze.toggle}
        onToggleRecord={toggleRecord}
        onOpenTestData={() => setTestDataOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        picking={picking}
        showSmart={showSmart}
        showAxes={showAxes}
        withHealing={withHealing}
        historyCount={history.entries.length}
        hasElement={hasElement}
        frozen={freeze.frozen}
        recording={recorder.recording}
        recordingCount={recorder.steps.length}
      />

      <TestLocator result={test.result} running={test.running} onRun={test.run} onClear={test.clear} />

      {hasElement ? (
        <>
          <div className="qlc-element-bar">
            <span className="qlc-tag-pill">&lt;{element!.tag}&gt;</span>
            {element!.attrs.id && <span className="qlc-tag-pill">#{element!.attrs.id}</span>}
            {element!.isSvg && <span className="qlc-tag-pill qlc-tag-svg">SVG</span>}
            {element!.inShadowRoot && <span className="qlc-warn-pill" title={`Shadow chain: ${element!.shadowChain.join(' › ')}`}>shadow root</span>}
            {element!.inIframe && <span className="qlc-warn-pill" title={`Frame chain: ${element!.frameChain.join(' › ')}`}>iframe — frameLocator()</span>}
          </div>
          <LocatorList
            candidates={candidates}
            framework={framework}
            onHighlight={flash}
            onAddToPom={addToPom}
            showSmart={showSmart}
            showAxes={showAxes}
            withHealing={withHealing}
          />
        </>
      ) : (
        <EmptyState error={error} />
      )}

      <PomBasketBar items={basket.items} onOpen={() => setPomOpen(true)} onClear={basket.clear} />

      <div className="qlc-footer">
        <div className="qlc-footer-meta">
          <span><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>↵</kbd> top · <kbd>⌘⇧P</kbd> POM · <kbd>⌘⇧H</kbd> history · <kbd>⌘⇧R</kbd> rec · <kbd>⌘⇧F</kbd> freeze · <kbd>⌘⇧D</kbd> test data · <kbd>⌘⇧E</kbd> export</span>
        </div>
        <span>LocatorForge v0.8.0</span>
      </div>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        testIdAttribute={testIdAttribute}
        onTestIdAttributeChange={setTestIdAttribute}
        showSmart={showSmart}
        onShowSmartChange={setShowSmart}
        showAxes={showAxes}
        onShowAxesChange={setShowAxes}
        withHealing={withHealing}
        onWithHealingChange={setWithHealing}
      />

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={history.entries}
        onJump={(e) => { history.jumpTo(e); setHistoryOpen(false); }}
        onRemove={history.remove}
        onClear={history.clear}
      />

      <PomGeneratorModal
        open={pomOpen}
        onClose={() => setPomOpen(false)}
        items={basket.items}
        onRemove={basket.remove}
        onRename={basket.rename}
        defaultFramework={frameworkId}
        inspectedUrl={inspectedUrl}
      />

      <RecorderPanel
        open={recorderOpen}
        recording={recorder.recording}
        steps={recorder.steps}
        framework={framework}
        testIdAttribute={testIdAttribute}
        onStart={recorder.start}
        onStop={recorder.stop}
        onClear={recorder.clear}
        onClose={() => setRecorderOpen(false)}
      />

      <TestDataModal
        open={testDataOpen}
        onClose={() => setTestDataOpen(false)}
        element={element}
        onFill={fillCurrent}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        inspectedUrl={inspectedUrl}
        framework={framework}
        testIdAttribute={testIdAttribute}
        showSmart={showSmart}
      />
    </div>
  );
}
