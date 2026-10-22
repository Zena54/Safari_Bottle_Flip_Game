/** Tooltip tour. Next and Back open the step’s screen, then point at a [data-tour] target. */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { TOUR_STEPS } from './steps';

const STORAGE_KEY = 'bf-demo-tour';

interface TourControls {
  replay: () => void;
}

const TourContext = createContext<TourControls | null>(null);

export function useTour(): TourControls {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside TourProvider');
  return ctx;
}

function readProgress(): { open: boolean; index: number } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === 'done') return { open: false, index: 0 };
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < TOUR_STEPS.length) return { open: true, index: n };
  } catch {
    // sessionStorage can throw in private modes; start the tour anyway
  }
  return { open: true, index: 0 };
}

function remember(open: boolean, index: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, open ? String(index) : 'done');
  } catch {
    // ignore quota / private mode
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(readProgress);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = TOUR_STEPS[progress.index] ?? TOUR_STEPS[0]!;

  const go = useCallback((index: number) => {
    const next = Math.max(0, Math.min(TOUR_STEPS.length - 1, index));
    setProgress({ open: true, index: next });
    remember(true, next);
  }, []);

  const close = useCallback(() => {
    setProgress({ open: false, index: 0 });
    remember(false, 0);
  }, []);

  const replay = useCallback(() => {
    go(0);
    navigate('/');
  }, [go, navigate]);

  useEffect(() => {
    if (!progress.open) return;
    if (location.pathname !== step.route) navigate(step.route);
    // Only follow the step. A later pathname change is the viewer using the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.open, progress.index, step.route, navigate]);

  useEffect(() => {
    if (!progress.open || !step.target) {
      setRect(null);
      return;
    }
    const target = step.target;
    let el: Element | null = null;
    let observer: ResizeObserver | null = null;
    let timer = 0;

    const measure = () => {
      if (!el) return;
      setRect(el.getBoundingClientRect());
    };

    const attach = () => {
      el = document.querySelector(`[data-tour="${target}"]`);
      if (!el) return false;
      el.scrollIntoView({ block: 'nearest' });
      observer = new ResizeObserver(measure);
      observer.observe(el);
      measure();
      return true;
    };

    if (!attach()) {
      setRect(null);
      timer = window.setInterval(() => {
        if (attach()) window.clearInterval(timer);
      }, 80);
    }

    const stop = window.setTimeout(() => window.clearInterval(timer), 4000);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      observer?.disconnect();
    };
  }, [progress.open, progress.index, step.target, location.pathname]);

  const last = progress.index === TOUR_STEPS.length - 1;

  return (
    <TourContext.Provider value={{ replay }}>
      {children}
      {progress.open && (
        <div className="tour" data-no-flip>
          {rect && (
            <div
              className="tour-spot"
              style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
            />
          )}
          <div className="tour-card card" role="dialog" aria-labelledby="tour-title" style={placeCard(rect)}>
            <div className="label">
              {progress.index + 1} of {TOUR_STEPS.length}
            </div>
            <div className="h2" id="tour-title">
              {step.title}
            </div>
            <p className="sub">{step.body}</p>
            <div className="tour-actions">
              <button type="button" className="btn btn--small btn--ghost" disabled={progress.index === 0} onClick={() => go(progress.index - 1)}>
                Back
              </button>
              <button type="button" className="link" onClick={close}>
                Skip
              </button>
              <button type="button" className="btn btn--small" onClick={() => (last ? close() : go(progress.index + 1))}>
                {last ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}

function placeCard(rect: DOMRect | null): { top: number; left: number; width: number } {
  const margin = 12;
  const width = Math.min(340, window.innerWidth - margin * 2);
  const cardHeight = 188;
  const centered = {
    top: Math.max(margin, (window.innerHeight - cardHeight) / 2),
    left: Math.max(margin, (window.innerWidth - width) / 2),
    width,
  };
  if (!rect) return centered;

  // Wide windows keep the card beside the phone column so it does not cover the screen.
  const columnWidth = 460;
  if (window.innerWidth >= columnWidth + width + margin * 3) {
    const columnLeft = (window.innerWidth - columnWidth) / 2;
    const beside = columnLeft + columnWidth + margin;
    const left = beside + width <= window.innerWidth - margin ? beside : columnLeft - width - margin;
    const top = Math.max(margin, Math.min(rect.top, window.innerHeight - cardHeight - margin));
    return { top, left, width };
  }

  const below = rect.bottom + margin;
  const above = rect.top - margin - cardHeight;
  const top = below + cardHeight <= window.innerHeight - margin ? below : Math.max(margin, above);
  const left = Math.max(margin, Math.min((window.innerWidth - width) / 2, window.innerWidth - width - margin));
  return { top, left, width };
}
