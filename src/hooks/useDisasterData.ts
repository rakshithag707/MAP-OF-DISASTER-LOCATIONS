import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDisasterData, type FeedResult } from "../lib/disasters";

type LoadStatus = "loading" | "ready" | "error";

interface FeedState {
  status: LoadStatus;
  data?: FeedResult;
  error?: string;
  refreshing: boolean;
}

const initialState: FeedState = {
  status: "loading",
  refreshing: false,
};

export function useDisasterData(start: string, end: string) {
  const [state, setState] = useState<FeedState>(initialState);
  const [nonce, setNonce] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;

    setState((previous) => ({
      // Keep the last window on screen while the new one loads so charts,
      // cards and the map never collapse into an empty skeleton.
      status: previous.data ? "ready" : "loading",
      data: previous.data,
      error: undefined,
      refreshing: true,
    }));

    fetchDisasterData(start, end, { signal: controller.signal, force })
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({
          status: "ready",
          data,
          refreshing: false,
          error: undefined,
        });
      })
      .catch((error: Error) => {
        if (controller.signal.aborted || error?.name === "AbortError") return;
        setState((previous) => ({
          status: previous.data ? "ready" : "error",
          data: previous.data,
          refreshing: false,
          error:
            error?.message ||
            "The disaster feeds could not be reached. Check your connection and try again.",
        }));
      });

    return () => controller.abort();
  }, [start, end, nonce]);

  const refresh = useCallback(() => {
    forceRef.current = true;
    setState((previous) => ({ ...previous, refreshing: true }));
    setNonce((value) => value + 1);
  }, []);

  return {
    status: state.status,
    data: state.data,
    events: state.data?.events ?? [],
    meta: state.data?.meta,
    error: state.error,
    refreshing: state.refreshing,
    refresh,
  };
}
