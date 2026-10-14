import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastMessage {
  id: string;
  message: string;
  type?: ToastType;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const type = toast.type || "info";

          const iconMap = {
            info: <Info className="w-4 h-4 text-sky" />,
            success: <CheckCircle2 className="w-4 h-4 text-turf" />,
            warning: <AlertTriangle className="w-4 h-4 text-amber" />,
            error: <AlertTriangle className="w-4 h-4 text-ball" />,
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className="pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-[12px] bg-surface-2 border border-line shadow-lg text-sm text-chalk select-none"
            >
              <div className="flex items-center gap-2.5">
                {iconMap[type]}
                <span className="font-medium text-xs sm:text-sm">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-muted hover:text-chalk p-1 transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
