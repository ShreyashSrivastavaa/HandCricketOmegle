"use client";

import React from "react";
import { Lobby } from "@/components/Lobby";
import { Toast } from "@/components/Toast";
import { useGameStore } from "@/lib/store/gameStore";

export default function HomePage() {
  const { toasts, removeToast } = useGameStore();

  return (
    <>
      <Lobby />
      <Toast toasts={toasts} onDismiss={removeToast} />
    </>
  );
}
