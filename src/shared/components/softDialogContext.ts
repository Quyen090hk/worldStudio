import { createContext, useContext } from "react";

export type DialogOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  defaultValue?: string;
  placeholder?: string;
  allowEmpty?: boolean;
};

export type SoftDialogApi = {
  confirm: (options: DialogOptions) => Promise<boolean>;
  prompt: (options: DialogOptions) => Promise<string | null>;
};

const fallbackDialog: SoftDialogApi = {
  confirm: async () => false,
  prompt: async () => null,
};

export const SoftDialogContext = createContext<SoftDialogApi>(fallbackDialog);

export function useSoftDialog() {
  const value = useContext(SoftDialogContext);
  return value;
}
