import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface ShowAlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  cancelable?: boolean;
}

interface AlertState {
  isOpen: boolean;
  title: string;
  message?: string;
  type: AlertType;
  buttons: AlertButton[];
  cancelable: boolean;

  showAlert: (options: ShowAlertOptions) => void;
  closeAlert: () => void;
}

function inferAlertType(title: string, message?: string, buttons?: AlertButton[]): AlertType {
  const text = `${title} ${message || ''}`.toLowerCase();
  if (buttons?.some(b => b.style === 'destructive')) return 'warning';
  if (
    text.includes('error') || 
    text.includes('failed') || 
    text.includes('fail') || 
    text.includes('invalid') || 
    text.includes('cannot')
  ) {
    return 'error';
  }
  if (
    text.includes('warning') || 
    text.includes('delete') || 
    text.includes('discard') || 
    text.includes('remove') || 
    text.includes('permission') ||
    text.includes('required') ||
    text.includes('enter ')
  ) {
    return 'warning';
  }
  if (
    text.includes('success') || 
    text.includes('saved') || 
    text.includes('created') || 
    text.includes('done') || 
    text.includes('updated') ||
    text.includes('generated') ||
    text.includes('cleared')
  ) {
    return 'success';
  }
  return 'info';
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: '',
  message: undefined,
  type: 'info',
  buttons: [{ text: 'OK', style: 'default' }],
  cancelable: true,

  showAlert: (options: ShowAlertOptions) => {
    const inferredType = options.type || inferAlertType(options.title, options.message, options.buttons);
    const resolvedButtons = options.buttons && options.buttons.length > 0 
      ? options.buttons 
      : [{ text: 'OK', style: 'default' as const }];

    set({
      isOpen: true,
      title: options.title,
      message: options.message,
      type: inferredType,
      buttons: resolvedButtons,
      cancelable: options.cancelable !== undefined ? options.cancelable : true,
    });
  },

  closeAlert: () => {
    set({ isOpen: false });
  },
}));

/**
 * Global helper to trigger NatureSync themed alert modals from anywhere in the app.
 * Compatible with React Native's Alert.alert signature with added type styling.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  type?: AlertType,
  options?: { cancelable?: boolean }
) {
  useAlertStore.getState().showAlert({
    title,
    message,
    type,
    buttons,
    cancelable: options?.cancelable,
  });
}

export function closeAlert() {
  useAlertStore.getState().closeAlert();
}

export const CustomAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { cancelable?: boolean; type?: AlertType }
  ) => {
    showAlert(title, message, buttons, options?.type, options);
  },
};
