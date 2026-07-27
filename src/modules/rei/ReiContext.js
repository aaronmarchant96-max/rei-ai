import { createContext, useContext } from "react";

const ReiContext = createContext(null);

export function useRei() {
  const ctx = useContext(ReiContext);
  if (!ctx) throw new Error("useRei must be used within a REI component");
  return ctx;
}

export default ReiContext;
