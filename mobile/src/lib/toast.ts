import Toast from 'react-native-toast-message';

export function toastSuccess(message: string) {
  Toast.show({ type: 'success', text1: message, position: 'bottom' });
}

export function toastError(message: string) {
  Toast.show({ type: 'error', text1: message, position: 'bottom' });
}
