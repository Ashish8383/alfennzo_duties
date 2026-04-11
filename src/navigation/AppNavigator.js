import { createStackNavigator } from '@react-navigation/stack';
import BottomTabNavigator from '../components/TabNavigator';
import CartScreen from '../screens/CartScreen';
import CreatePasswordScreen from '../screens/CreatePasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import LoginScreen from '../screens/LoginScreen';
import PermissionStatusScreen from '../screens/PermissionStatusScreen';
import ShiftHistoryScreen from '../screens/ShiftHistoryScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';
import useAuthStore from '../stores/authStore';
import colors from '../utils/colors';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
          <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
        </>
      ) : (
        <>
          {/* ✅ Main tabs */}
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen name="PermissionStatus" component={PermissionStatusScreen} />
          {/* ✅ Screens that push OVER the tab bar */}
          <Stack.Screen name="ShiftHistory" component={ShiftHistoryScreen} />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{
              headerShown: false,           // CartScreen has its own header
              presentation: 'card',         // standard push animation
              gestureEnabled: true,         // swipe-back gesture
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}