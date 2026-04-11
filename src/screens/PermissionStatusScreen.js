// src/screens/PermissionStatusScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../utils/colors';
import {
  checkLocationPermission,
  checkNotificationPermission,
  requestLocationPermission,
  requestNotificationPermission,
} from '../utils/Permissions';
import { nz, nzVertical, rs } from '../utils/responsive';

const PermissionStatusScreen = () => {
  const navigation = useNavigation();
  const [permissions, setPermissions] = useState({
    location: false,
    notification: false,
  });
  const [loading, setLoading] = useState({
    location: false,
    notification: false,
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setChecking(true);
    const locationStatus = await checkLocationPermission();
    const notificationStatus = await checkNotificationPermission();
    
    setPermissions({
      location: locationStatus,
      notification: notificationStatus,
    });
    setChecking(false);
  };

  const handleRequestLocation = async () => {
    setLoading(prev => ({ ...prev, location: true }));
    const granted = await requestLocationPermission();
    if (granted) {
      await checkPermissions();
    }
    setLoading(prev => ({ ...prev, location: false }));
  };

  const handleRequestNotification = async () => {
    setLoading(prev => ({ ...prev, notification: true }));
    const granted = await requestNotificationPermission();
    if (granted) {
      await checkPermissions();
    }
    setLoading(prev => ({ ...prev, notification: false }));
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Permissions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Location Permission */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, permissions.location && styles.iconGranted]}>
              <Ionicons 
                name="location" 
                size={28} 
                color={permissions.location ? colors.success : colors.primary} 
              />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Location Access</Text>
              <Text style={styles.cardStatus}>
                {permissions.location ? '✅ Granted' : '❌ Not Granted'}
              </Text>
              <Text style={styles.cardDesc}>
                Required to track delivery routes & verify restaurant presence
              </Text>
            </View>
          </View>
          
          {!permissions.location && (
            <TouchableOpacity 
              style={styles.allowBtn}
              onPress={handleRequestLocation}
              disabled={loading.location}
            >
              {loading.location ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.allowBtnText}>Allow Location Access</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Permission */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, permissions.notification && styles.iconGranted]}>
              <Ionicons 
                name="notifications" 
                size={28} 
                color={permissions.notification ? colors.success : colors.primary} 
              />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Notification Access</Text>
              <Text style={styles.cardStatus}>
                {permissions.notification ? '✅ Granted' : '❌ Not Granted'}
              </Text>
              <Text style={styles.cardDesc}>
                Required to receive order updates & important alerts
              </Text>
            </View>
          </View>
          
          {!permissions.notification && (
            <TouchableOpacity 
              style={styles.allowBtn}
              onPress={handleRequestNotification}
              disabled={loading.notification}
            >
              {loading.notification ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.allowBtnText}>Allow Notification Access</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(15),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: rs(18),
    fontWeight: '600',
    color: colors.black,
  },
  content: {
    flex: 1,
    padding: nz(16),
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: nz(12),
    padding: nz(16),
    marginBottom: nzVertical(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: nzVertical(12),
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(12),
  },
  iconGranted: {
    backgroundColor: colors.success + '10',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: rs(16),
    fontWeight: '600',
    color: colors.black,
    marginBottom: nzVertical(4),
  },
  cardStatus: {
    fontSize: rs(13),
    fontWeight: '500',
    marginBottom: nzVertical(4),
  },
  cardDesc: {
    fontSize: rs(12),
    color: colors.textLight,
    lineHeight: 16,
  },
  allowBtn: {
    backgroundColor: colors.primary,
    paddingVertical: nzVertical(10),
    borderRadius: nz(8),
    alignItems: 'center',
    marginTop: nzVertical(8),
  },
  allowBtnText: {
    color: colors.white,
    fontSize: rs(14),
    fontWeight: '600',
  },
});

export default PermissionStatusScreen;