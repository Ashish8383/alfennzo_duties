// screens/ProfileScreen.js
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../stores/authStore';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

// ─── The header background color ─────────────────────────────────────────────
// StatusBar backgroundColor must match this so the battery/wifi area
// blends seamlessly with the page header on real devices.
const HEADER_BG = '#FFFFFF';

// ─── Menu config ──────────────────────────────────────────────────────────────
const MENU_ITEMS = [
  { key: 'earning',      label: 'My Earning',        icon: 'wallet-outline'              },
  { key: 'notification', label: 'Notification',       icon: 'notifications-outline'       },
  { key: 'privacy',      label: 'Privacy',            icon: 'shield-checkmark-outline'    },
  { key: 'help',         label: 'Help',               icon: 'help-circle-outline'         },
  { key: 'support',      label: 'Contact Support',    icon: 'chatbubble-ellipses-outline' },
  { key: 'terms',        label: 'Terms & Conditions', icon: 'document-text-outline'       },
];

// ─── Menu Row ─────────────────────────────────────────────────────────────────
function MenuItem({ item, onPress, isLast }) {
  return (
    <>
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.55}>
        <View style={styles.menuLeft}>
          <View style={styles.menuIconWrap}>
            <Ionicons name={item.icon} size={nz(20)} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>{item.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={nz(18)} color={colors.textLighter} />
      </TouchableOpacity>
      {!isLast && <View style={styles.menuDivider} />}
    </>
  );
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  
  // Floating tab bar height — match BottomTabNavigator
  const TAB_BAR_HEIGHT = nzVertical(72) + (insets.bottom > 0 ? insets.bottom : nzVertical(12));

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleMenuItemPress = (itemKey) => {
    switch (itemKey) {
      case 'earning':
        // Navigate to earnings screen
        Alert.alert('My Earnings', 'Coming soon!');
        break;
      case 'notification':
        Alert.alert('Notifications', 'Coming soon!');
        break;
      case 'privacy':
        Alert.alert('Privacy', 'Coming soon!');
        break;
      case 'help':
        Alert.alert('Help', 'Coming soon!');
        break;
      case 'support':
        Alert.alert('Contact Support', 'support@example.com');
        break;
      case 'terms':
        Alert.alert('Terms & Conditions', 'Coming soon!');
        break;
      default:
        break;
    }
  };

  // Get user's display name
  const displayName = user?.name || user?.username || 'User';
  const phoneNumber = user?.phone || '+91 9876543210';

  return (
    <>
      <StatusBar
        style="dark"
        translucent={false}
        backgroundColor={HEADER_BG}
      />

      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: HEADER_BG }]}
        edges={['top', 'left', 'right']}
      >
        <View style={[styles.header, { backgroundColor: HEADER_BG }]}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.body}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: TAB_BAR_HEIGHT + nzVertical(16) },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={Platform.OS === 'ios'}
          >
            <View style={styles.avatarCard}>
              <View style={styles.avatarCircle}>
                <View style={styles.avatarHead} />
                <View style={styles.avatarBody} />
              </View>
              <View style={styles.avatarInfo}>
                <Text style={styles.avatarName}>{displayName}</Text>
                <View style={styles.phoneRow}>
                  <Ionicons
                    name="call-outline"
                    size={nz(14)}
                    color={colors.textLight}
                    style={{ marginRight: nz(4) }}
                  />
                  <Text style={styles.avatarPhone}>{phoneNumber}</Text>
                </View>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>142</Text>
                <Text style={styles.statLabel}>Delivered</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>₹18,400</Text>
                <Text style={styles.statLabel}>Earnings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>4.9 ⭐</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>

            {/* Menu */}
            <View style={styles.menuCard}>
              {MENU_ITEMS.map((item, idx) => (
                <MenuItem
                  key={item.key}
                  item={item}
                  onPress={() => handleMenuItemPress(item.key)}
                  isLast={idx === MENU_ITEMS.length - 1}
                />
              ))}
            </View>

            {/* Logout */}
            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={handleLogout}
              activeOpacity={0.75}
            >
              <View style={styles.logoutIconWrap}>
                <Ionicons name="log-out-outline" size={nz(20)} color="#E53935" />
              </View>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor set inline above to match HEADER_BG
  },

  // Title bar
  header: {
    paddingTop: nzVertical(8),
    paddingBottom: nzVertical(14),
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: rs(isTablet ? 22 : 18),
    fontWeight: '700',
    color: colors.black,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },

  // Body
  body: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: nz(16),
    paddingTop: nzVertical(20),
    gap: nzVertical(14),
  },

  // Avatar card
  avatarCard: {
    backgroundColor: colors.white,
    borderRadius: nz(16),
    padding: nz(16),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCircle: {
    width: nz(62),
    height: nz(62),
    borderRadius: nz(31),
    backgroundColor: '#F5A623',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginRight: nz(14),
  },
  avatarHead: {
    width: nz(24),
    height: nz(24),
    borderRadius: nz(12),
    backgroundColor: '#5C3D11',
    marginBottom: nz(2),
  },
  avatarBody: {
    width: nz(40),
    height: nz(28),
    borderRadius: nz(20),
    backgroundColor: '#5C3D11',
  },
  avatarInfo: { flex: 1 },
  avatarName: {
    fontSize: rs(18),
    fontWeight: '700',
    color: colors.black,
    marginBottom: nzVertical(4),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPhone: {
    fontSize: rs(13),
    color: colors.textLight,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  editBtn: {
    width: nz(36),
    height: nz(36),
    borderRadius: nz(18),
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsRow: {
    backgroundColor: colors.white,
    borderRadius: nz(16),
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nzVertical(16),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: rs(16),
    fontWeight: '700',
    color: colors.black,
    marginBottom: nzVertical(2),
  },
  statLabel: {
    fontSize: rs(11),
    color: colors.textLighter,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  statDivider: {
    width: 1,
    height: nzVertical(32),
    backgroundColor: colors.border,
  },

  // Menu
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: nz(16),
    paddingHorizontal: nz(16),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nzVertical(15),
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(12),
  },
  menuIconWrap: {
    width: nz(36),
    height: nz(36),
    borderRadius: nz(10),
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: rs(14),
    color: colors.black,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: nz(48),
  },

  // Logout
  logoutBtn: {
    backgroundColor: colors.white,
    borderRadius: nz(16),
    padding: nz(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(12),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: nzVertical(20),
  },
  logoutIconWrap: {
    width: nz(36),
    height: nz(36),
    borderRadius: nz(10),
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: rs(15),
    fontWeight: '700',
    color: '#E53935',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});