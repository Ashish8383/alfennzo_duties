// navigation/BottomTabNavigator.js
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import POSScreen from '../screens/posScreen';
import ProfileScreen from '../screens/ProfileScreen';
import colors from '../utils/colors';
import { useHaptics } from '../utils/Haptic';
import { nz, nzVertical, rs } from '../utils/responsive';

const Tab = createBottomTabNavigator();
const ORANGE = '#F07B2B';

// ─── Tab config ───────────────────────────────────────────────────────────────
const TAB_CONFIG = {
  Home: {
    component: HomeScreen,
    label: 'Home',
    icon: (focused) => (
      <Feather name="home" size={rs(focused ? 22 : 20)}
        color={focused ? colors.primary : colors.textLighter} />
    ),
  },
  POS: {
    component: POSScreen,
    label: 'POS',
    // Orange icon to stand out as a key action tab
    icon: (focused) => (
      <MaterialCommunityIcons
        name="point-of-sale"
        size={rs(focused ? 24 : 22)}
        color={focused ? ORANGE : colors.textLighter}
      />
    ),
    isAction: true, // renders with special orange active style
  },
  History: {
    component: OrderHistoryScreen,
    label: 'History',
    icon: (focused) => (
      <Ionicons name="time-outline" size={rs(focused ? 22 : 20)}
        color={focused ? colors.primary : colors.textLighter} />
    ),
  },
  Setting: {
    component: ProfileScreen,
    label: 'Setting',
    icon: (focused) => (
      <Ionicons name="settings-outline" size={rs(focused ? 22 : 20)}
        color={focused ? colors.primary : colors.textLighter} />
    ),
  },
};

// ─── Single Tab Button ────────────────────────────────────────────────────────
function TabBarButton({ onPress, onLongPress, isFocused, routeName }) {
  const { tabClick } = useHaptics();
  const config = TAB_CONFIG[routeName];
  const isAction = config?.isAction;

  // Float up on active
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: withSpring(isFocused ? -6 : 0, { damping: 15, stiffness: 300 }),
    }],
  }));

  // Scale icon
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{
      scale: withSpring(isFocused ? 1.08 : 1, { damping: 12, stiffness: 200 }),
    }],
  }));

  const handlePress = async () => {
    await tabClick();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={styles.tabButton}
      android_ripple={{
        color: (isAction ? ORANGE : colors.primary) + '20',
        borderless: true,
        radius: nz(30),
        foreground: true,
      }}
    >
      <Animated.View style={[styles.iconContainer, floatStyle]}>
        <Animated.View style={scaleStyle}>
          {config?.icon(isFocused)}
        </Animated.View>
        {/* Active dot */}
        {isFocused && (
          <View style={[
            styles.activeDot,
            isAction && { backgroundColor: ORANGE },
          ]} />
        )}
      </Animated.View>

      {isFocused && (
        <Animated.Text style={[
          styles.tabLabel,
          isAction && { color: ORANGE },
        ]}>
          {config?.label}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Custom Floating Tab Bar ──────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.tabBarContainer,
      { paddingBottom: insets.bottom > 0 ? insets.bottom + nzVertical(8) : nzVertical(12) },
    ]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabBarButton
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              isFocused={isFocused}
              routeName={route.name}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
      initialRouteName="Home"
    >
      <Tab.Screen name="Home"    component={HomeScreen}         />
      <Tab.Screen name="POS"     component={POSScreen}          />
      <Tab.Screen name="History" component={OrderHistoryScreen} />
      <Tab.Screen name="Setting" component={ProfileScreen}      />
    </Tab.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.98)',
    marginHorizontal: nz(16),
    paddingHorizontal: nz(8),
    paddingVertical: nz(10),
    borderRadius: nz(50),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: nzVertical(4),
    borderRadius: nz(30),
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: -nz(5),
    width: nz(4),
    height: nz(4),
    borderRadius: nz(2),
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: rs(10),
    color: colors.primary,
    fontWeight: '600',
    marginTop: nzVertical(3),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});