"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { AccountEntryCard } from "@/components/auth/account-entry-card";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
}

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const handleSuccess = async () => {
    if (onSuccess) {
      await onSuccess();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="relative">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <AccountEntryCard onSuccess={handleSuccess} showHomeLink={false} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
