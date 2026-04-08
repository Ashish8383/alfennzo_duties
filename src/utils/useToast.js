import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#0B735F', backgroundColor: '#28a745', height: 70 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}
      text2Style={{ fontSize: 14, color: '#fff' }}
    />
  ),

  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#FF3B30', backgroundColor: '#dc3545', height: 70 }}
      text1Style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}
      text2Style={{ fontSize: 14, color: '#fff' }}
    />
  ),

  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#007bff', backgroundColor: '#007bff', height: 70 }}
      text1Style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}
      text2Style={{ fontSize: 14, color: '#fff' }}
    />
  ),
};

export default function useToast() {
  const showSuccess = (title, message) => {
    Toast.show({ type: 'success', text1: title, text2: message });
  };

  const showError = (title, message) => {
    Toast.show({ type: 'error', text1: title, text2: message });
  };

  const showInfo = (title, message) => {
    Toast.show({ type: 'info', text1: title, text2: message });
  };

  return { showSuccess, showError, showInfo };
}