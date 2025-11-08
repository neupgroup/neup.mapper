"use client";

import { useEffect } from "react";
import { installGlobalErrorListeners } from "@/app/errors/logger";

export default function GlobalErrorCatcher() {
  useEffect(() => {
    installGlobalErrorListeners();
  }, []);
  return null;
}

