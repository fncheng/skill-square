import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

/** 在加载完成和保存成功时记录快照，并保护尚未保存的表单。 */
export function useUnsavedChanges(value: unknown, ready = true) {
  const current = JSON.stringify(value);
  const snapshot = useRef(current);
  const state = useRef({ current, ready });
  const awaitingLoad = useRef(!ready);
  state.current = { current, ready };

  useEffect(() => {
    if (!ready) awaitingLoad.current = true;
    else if (awaitingLoad.current) {
      snapshot.current = current;
      awaitingLoad.current = false;
    }
  }, [current, ready]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    currentLocation.pathname !== nextLocation.pathname && state.current.ready && state.current.current !== snapshot.current
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('内容尚未保存，确定放弃修改吗？')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!state.current.ready || state.current.current === snapshot.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { markSaved: (saved: unknown) => { snapshot.current = JSON.stringify(saved); } };
}
