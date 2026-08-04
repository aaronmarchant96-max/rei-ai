import { useState, useCallback } from "react";
import { detectDomain } from "../lib/nightShiftRouter";

export function useDomainHint(selectedDomain) {
  const [domainHint, setDomainHint] = useState(null);

  const updateDomainHint = useCallback((inputValue) => {
    if (inputValue && inputValue.trim()) {
      const detected = detectDomain(inputValue);
      setDomainHint(detected && detected !== selectedDomain ? detected : null);
    } else {
      setDomainHint(null);
    }
  }, [selectedDomain]);

  const dismissDomainHint = useCallback(() => {
    setDomainHint(null);
  }, []);

  const switchDomain = useCallback((domain) => {
    setDomainHint(null);
    return domain;
  }, []);

  return { domainHint, updateDomainHint, dismissDomainHint, switchDomain };
}
