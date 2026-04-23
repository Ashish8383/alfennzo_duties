import { BaseToast, ErrorToast } from 'react-native-toast-message';

export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#0B735F',   
        backgroundColor: '#2ECCB0', 
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

  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#FF3B30',   
        backgroundColor: '#FF6B6B',  
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
        borderLeftColor: '#007AFF', 
        backgroundColor: '#4DA3FF',  
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