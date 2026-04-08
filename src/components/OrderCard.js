// components/OrderCard.js
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

export default function OrderCard({ order, status, onAccept, onUpdateStatus }) {
  const getNextStatusText = () => {
    switch(status) {
      case 'new':
        return 'Accept Order';
      case 'preparing':
        return 'Mark as Ready';
      case 'ready':
        return 'Mark as Delivered';
      default:
        return null;
    }
  };

  const getButtonStyle = () => {
    switch(status) {
      case 'new':
        return styles.acceptButton;
      case 'preparing':
        return styles.preparingButton;
      case 'ready':
        return styles.readyButton;
      default:
        return styles.updateButton;
    }
  };

  const nextStatusText = getNextStatusText();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.tableNo}>Table {order.tableNo}</Text>
          <Text style={styles.customer}>Customer: {order.customer}</Text>
        </View>
        <Text style={styles.time}>{order.time}</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.itemsLabel}>Items:</Text>
      <Text style={styles.items}>{order.items}</Text>
      
      {order.quantity && (
        <Text style={styles.quantity}>Quantity: {order.quantity}</Text>
      )}
      
      {order.total && (
        <Text style={styles.total}>Total: {order.total}</Text>
      )}

      {nextStatusText && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.updateButton, getButtonStyle()]} 
            onPress={status === 'new' ? onAccept : onUpdateStatus}
          >
            <Text style={styles.updateButtonText}>{nextStatusText}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: nz(12),
    padding: nz(16),
    marginBottom: nzVertical(12),
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: nzVertical(8),
  },
  tableNo: {
    fontSize: rs(isTablet ? 20 : 18),
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  customer: {
    fontSize: rs(isTablet ? 15 : 14),
    color: colors.textLight,
    marginTop: nzVertical(4),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  time: {
    fontSize: rs(isTablet ? 13 : 12),
    color: colors.textLighter,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: nzVertical(12),
  },
  itemsLabel: {
    fontSize: rs(isTablet ? 13 : 12),
    color: colors.textLight,
    marginBottom: nzVertical(4),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  items: {
    fontSize: rs(isTablet ? 16 : 14),
    color: colors.text,
    fontWeight: '500',
    marginBottom: nzVertical(4),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  quantity: {
    fontSize: rs(isTablet ? 13 : 12),
    color: colors.textLight,
    marginTop: nzVertical(4),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  total: {
    fontSize: rs(isTablet ? 16 : 14),
    color: colors.primary,
    fontWeight: '600',
    marginTop: nzVertical(4),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  actions: {
    marginTop: nzVertical(16),
  },
  updateButton: {
    padding: nzVertical(isTablet ? 14 : 12),
    borderRadius: nz(8),
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  preparingButton: {
    backgroundColor: colors.warning,
  },
  readyButton: {
    backgroundColor: colors.primary,
  },
  updateButtonText: {
    color: colors.white,
    fontSize: rs(isTablet ? 15 : 14),
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});