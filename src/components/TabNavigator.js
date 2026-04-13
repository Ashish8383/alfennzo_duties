// navigation/BottomTabNavigator.js
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import POSScreen from '../screens/posScreen';
import ProfileScreen from '../screens/ProfileScreen';
import colors from '../utils/colors';
import { useHaptics } from '../utils/Haptic';
import { nz, nzVertical, rs } from '../utils/responsive';

const Tab = createBottomTabNavigator();

// ─── Tab config ───────────────────────────────────────────────────────────────
const TAB_CONFIG = {
  Home: {
    label: 'Home',
    activeColor: colors.primary,
    icon: (focused) => (
      <Feather
        name="home"
        size={rs(22)}
        color={focused ? colors.primary : colors.textLighter}
      />
    ),
  },
  POS: {
    label: 'POS',
    activeColor: colors.primary,
    icon: (focused) => (
      <MaterialCommunityIcons
        name="point-of-sale"
        size={rs(22)}
        color={focused ? colors.primary : colors.textLighter}
      />
    ),
  },
  History: {
    label: 'History',
    activeColor: colors.primary,
    icon: (focused) => (
      <Ionicons
        name="time-outline"
        size={rs(22)}
        color={focused ? colors.primary : colors.textLighter}
      />
    ),
  },
  Setting: {
    label: 'Setting',
    activeColor: colors.primary,
    icon: (focused) => (
      <Ionicons
        name="settings-outline"
        size={rs(22)}
        color={focused ? colors.primary : colors.textLighter}
      />
    ),
  },
};

// ─── Single Tab Button ────────────────────────────────────────────────────────
function TabBarButton({ onPress, onLongPress, isFocused, routeName }) {
  const config = TAB_CONFIG[routeName];
  const activeColor = config?.activeColor ?? colors.primary;
  const { tabClick } = useHaptics();

  const handlePress = () => {
    onPress();
    tabClick?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={styles.tabButton}
    >
      {/* Active indicator bar at top */}
      <View style={[styles.activeBar, isFocused && { backgroundColor: activeColor }]} />

      {/* Icon */}
      {config?.icon(isFocused)}

      {/* Label */}
      <Text style={[
        styles.tabLabel,
        { color: isFocused ? activeColor : colors.textLighter },
        isFocused && styles.tabLabelActive,
      ]}>
        {config?.label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.tabBar,
      { paddingBottom: insets.bottom > 0 ? insets.bottom : nzVertical(8) },
    ]}>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: nzVertical(8),
    paddingBottom: nzVertical(4),
    gap: nzVertical(3),
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    left: nz(16),
    right: nz(16),
    height: nz(2.5),
    borderRadius: nz(2),
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: rs(10),
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});