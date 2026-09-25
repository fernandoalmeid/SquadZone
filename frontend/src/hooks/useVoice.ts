import { useContext } from "react";
import { VoiceContext } from "../context/VoiceContext.ts";

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used inside VoiceProvider");
  }
  return context;
}
