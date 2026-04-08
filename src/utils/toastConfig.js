import { BaseToast, ErrorToast } from 'react-native-toast-message';

export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#0B735F',   // 🔥 dark green
        backgroundColor: '#2ECCB0',   // 🔥 light green
        height: 70,
        borderRadius: 10,
        marginHorizontal: 10,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',                // ✅ white text
      }}
      text2Style={{
        fontSize: 14,
        color: '#fff',                // ✅ white text
      }}
    />
  ),

  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#FF3B30',   // 🔥 dark red
        backgroundColor: '#FF6B6B',   // 🔥 light red
        height: 70,
        borderRadius: 10,
        marginHorizontal: 10,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
      }}
      text2Style={{
        fontSize: 14,
        color: '#fff',
      }}
    />
  ),

  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#007AFF',   // 🔥 dark blue
        backgroundColor: '#4DA3FF',   // 🔥 light blue
        height: 70,
        borderRadius: 10,
        marginHorizontal: 10,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
      }}
      text2Style={{
        fontSize: 14,
        color: '#fff',
      }}
    />
  ),
};              