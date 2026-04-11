// src/components/PermissionGuard.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../utils/colors';
import { nz, nzVertical, rs } from '../utils/responsive';
import { usePermissions } from '../utils/usePermission';

export const PermissionGuard = ({ children, requiredPermissions = ['location', 'notification'], onPermissionsGranted }) => {
  const { permissions, loading, requestLocation, requestNotification, checkPermissions } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [requestedPermissions, setRequestedPermissions] = useState([]);

  useEffect(() => {
    if (!loading) {
      const missing = requiredPermissions.filter(p => !permissions[p]);
      if (missing.length > 0) {
        setShowModal(true);
      } else {
        setShowModal(false);
        if (onPermissionsGranted) onPermissionsGranted();
      }
    }
  }, [loading, permissions, requiredPermissions]);

  const handleAllow = async (permission) => {
    if (permission === 'location') {
      const granted = await requestLocation(true);
      if (granted) {
        setRequestedPermissions(prev => [...prev, 'location']);
      }
    } else if (permission === 'notification') {
      const granted = await requestNotification(true);
      if (granted) {
        setRequestedPermissions(prev => [...prev, 'notification']);
      }
    }
    
    // Recheck permissions
    await checkPermissions();
  };

  const handleAllowAll = async () => {
    if (requiredPermissions.includes('location')) {
      await requestLocation(true);
    }
    if (requiredPermissions.includes('notification')) {
      await requestNotification(true);
    }
    await checkPermissions();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const missingPermissions = requiredPermissions.filter(p => !permissions[p]);

  return (
    <>
      {children}
      
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => {
          if (missingPermissions.length === 0) setShowModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>🔐</Text>
            </View>
            
            <Text style={styles.modalTitle}>
              Permissions Required
            </Text>
            
            <Text style={styles.modalDescription}>
              To provide you with the best experience, we need the following permissions:
            </Text>

            {missingPermissions.includes('location') && (
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>📍</Text>
                <View style={styles.permissionContent}>
                  <Text style={styles.permissionTitle}>Location Access</Text>
                  <Text style={styles.permissionDesc}>
                    Required to track delivery routes and verify restaurant presence
                  </Text>
                  <TouchableOpacity 
                    style={styles.allowButton} 
                    onPress={() => handleAllow('location')}
                  >
                    <Text style={styles.allowButtonText}>Allow Location</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {missingPermissions.includes('notification') && (
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>🔔</Text>
                <View style={styles.permissionContent}>
                  <Text style={styles.permissionTitle}>Notification Access</Text>
                  <Text style={styles.permissionDesc}>
                    Required for order updates, delivery requests, and important alerts
                  </Text>
                  <TouchableOpacity 
                    style={styles.allowButton} 
                    onPress={() => handleAllow('notification')}
                  >
                    <Text style={styles.allowButtonText}>Allow Notifications</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {missingPermissions.length > 1 && (
              <TouchableOpacity style={styles.allowAllButton} onPress={handleAllowAll}>
                <Text style={styles.allowAllButtonText}>Allow All Permissions</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: nz(24),
    padding: nz(24),
    width: '85%',
    maxWidth: 400,
  },
  modalIcon: {
    alignItems: 'center',
    marginBottom: nzVertical(16),
  },
  modalIconText: {
    fontSize: rs(48),
  },
  modalTitle: {
    fontSize: rs(22),
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
    marginBottom: nzVertical(8),
  },
  modalDescription: {
    fontSize: rs(14),
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: nzVertical(24),
    lineHeight: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    marginBottom: nzVertical(20),
    padding: nz(12),
    backgroundColor: '#F8F9FA',
    borderRadius: nz(12),
  },
  permissionIcon: {
    fontSize: rs(28),
    marginRight: nz(12),
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: rs(16),
    fontWeight: '600',
    color: colors.black,
    marginBottom: nzVertical(4),
  },
  permissionDesc: {
    fontSize: rs(12),
    color: colors.textLight,
    marginBottom: nzVertical(12),
    lineHeight: 16,
  },
  allowButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(8),
    borderRadius: nz(8),
    alignSelf: 'flex-start',
  },
  allowButtonText: {
    color: colors.white,
    fontSize: rs(13),
    fontWeight: '600',
  },
  allowAllButton: {
    backgroundColor: colors.primary,
    paddingVertical: nzVertical(14),
    borderRadius: nz(12),
    alignItems: 'center',
    marginTop: nzVertical(8),
  },
  allowAllButtonText: {
    color: colors.white,
    fontSize: rs(16),
    fontWeight: '700',
  },
});