import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { readConsent, writeConsent, type Consent } from "@/lib/consent";

type ConsentContextValue = {
  consent: Consent | null;
  settingsOpen: boolean;
  acceptAll: () => void;
  acceptNecessary: () => void;
  saveMap: (map: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(() => readConsent());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const acceptAll = useCallback(() => {
    setConsent(writeConsent(true));
    setSettingsOpen(false);
  }, []);

  const acceptNecessary = useCallback(() => {
    setConsent(writeConsent(false));
    setSettingsOpen(false);
  }, []);

  const saveMap = useCallback((map: boolean) => {
    setConsent(writeConsent(map));
    setSettingsOpen(false);
  }, []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const value = useMemo(
    () => ({ consent, settingsOpen, acceptAll, acceptNecessary, saveMap, openSettings, closeSettings }),
    [consent, settingsOpen, acceptAll, acceptNecessary, saveMap, openSettings, closeSettings],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const value = useContext(ConsentContext);
  if (!value) throw new Error("useConsent debe usarse dentro de ConsentProvider");
  return value;
}
