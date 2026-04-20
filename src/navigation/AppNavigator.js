import { createStackNavigator } from '@react-navigation/stack';
import BottomTabNavigator from '../components/TabNavigator';
import CartScreen from '../screens/CartScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import LoginScreen from '../screens/LoginScreen';
import PermissionStatusScreen from '../screens/PermissionStatusScreen';
import ShiftHistoryScreen from '../screens/ShiftHistoryScreen';
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
        </>
      ) : (
        <>
          {/* ✅ Main tabs */}
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen name="PermissionStatus" component={PermissionStatusScreen} />
          <Stack.Screen name="ShiftHistory" component={ShiftHistoryScreen} />
          <Stack.Screen
            name="Earnings"
            component={EarningsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{
              headerShown: false,
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}