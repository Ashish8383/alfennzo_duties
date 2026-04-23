// components/pos/SuccessModal.js
import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';

const PRIMARY = colors.primary;
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#666666';
const TEXT_LIGHT = '#999999';
const BORDER_COLOR = '#F0F0F0';

export default function SuccessModal({ visible, orderDetails, onClose }) {
  const insets = useSafeAreaInsets();

  if (!orderDetails) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + nzVertical(20) }]}>

          {/* Success icon */}
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={nz(68)} color={PRIMARY} />
          </View>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.orderId}>{orderDetails.orderId}</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.detailsScroll} bounces={false}>

            <Section title="Customer">
              <Row label="Name"  value={orderDetails.customerName} />
              <Row label="Phone" value={orderDetails.phoneNumber} />
            </Section>

            <Section title="Seat">
              <Row label="Audi" value={`Audi ${orderDetails.audi}`} />
              {orderDetails.row  && <Row label="Row"  value={`Row ${orderDetails.row}`} />}
              <Row label="Seat" value={`Seat ${orderDetails.seat}`} />
            </Section>
            <Section title="Order Items">
              {orderDetails.items?.map((item, idx) => (
                <View key={idx} style={styles.orderItem}>
                  {/* Item header row */}
                  <View style={styles.orderItemTop}>
                    <View style={styles.orderItemLeft}>
                      <Text style={styles.orderItemName}>{item.name}</Text>
                      {item.itemType === 'combo' && (
                        <View style={styles.comboBadge}>
                          <Text style={styles.comboBadgeText}>COMBO</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.orderItemRight}>
                      <Text style={styles.orderItemQty}>×{item.quantity}</Text>
                      <Text style={styles.orderItemPrice}>
                        ₹{item.price * item.quantity}
                      </Text>
                    </View>
                  </View>

                  {item.itemType === 'combo' && item.comboItems?.length > 0 && (
                    <View style={styles.comboBreakdown}>
                      {item.comboItems.map((ci, ciIdx) => (
                        <View key={ci._id ?? ciIdx} style={styles.comboBreakdownRow}>
                          <Text style={styles.comboBreakdownDot}>•</Text>
                          <Text style={styles.comboBreakdownName} numberOfLines={1}>
                            {ci.foodName}
                          </Text>
                          <Text style={styles.comboBreakdownQty}>×{ci.quantity}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </Section>

            {/* Payment */}
            <Section title="Payment" last>
              <Row label="Method"   value={orderDetails.paymentMethod?.toUpperCase()} />
              <Row label="Subtotal" value={`₹${orderDetails.subtotal}`} />
              <Row label="GST (5%)" value={`₹${orderDetails.tax}`} />
              <View style={styles.totalSeparator} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{orderDetails.total}</Text>
              </View>
            </Section>

          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children, last }) {
  return (
    <View style={[styles.section, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nz(16),
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: nz(24),
    width: '100%',
    maxHeight: '90%',
    padding: nz(20),
  },
  successIconWrap: { alignItems: 'center', marginBottom: nzVertical(8) },
  successTitle: {
    fontSize: rs(22),
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: nzVertical(4),
  },
  orderId: {
    fontSize: rs(11),
    color: TEXT_LIGHT,
    textAlign: 'center',
    marginBottom: nzVertical(16),
    letterSpacing: 0.4,
  },
  detailsScroll: { maxHeight: '68%' },

  section: {
    paddingBottom: nzVertical(12),
    marginBottom: nzVertical(12),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  sectionTitle: {
    fontSize: rs(11),
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: nzVertical(8),
  },

  // Key-value row
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: nzVertical(4),
  },
  rowLabel: { fontSize: rs(13), color: TEXT_LIGHT },
  rowValue: { fontSize: rs(13), fontWeight: '500', color: TEXT_PRIMARY },

  // Order item
  orderItem: {
    paddingVertical: nzVertical(6),
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  orderItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderItemLeft: { flex: 1, paddingRight: nz(8) },
  orderItemName: {
    fontSize: rs(13),
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: nzVertical(3),
  },
  comboBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF8C00',
    paddingHorizontal: nz(6),
    paddingVertical: nzVertical(1),
    borderRadius: nz(4),
    marginBottom: nzVertical(2),
  },
  comboBadgeText: { fontSize: rs(9), fontWeight: '700', color: '#FFFFFF' },
  orderItemRight: { alignItems: 'flex-end', gap: nzVertical(2) },
  orderItemQty: { fontSize: rs(12), color: PRIMARY, fontWeight: '600' },
  orderItemPrice: { fontSize: rs(13), fontWeight: '500', color: TEXT_SECONDARY },

  comboBreakdown: {
    marginTop: nzVertical(4),
    paddingLeft: nz(8),
    borderLeftWidth: 2,
    borderLeftColor: PRIMARY + '40',
  },
  comboBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(4),
    paddingVertical: nzVertical(2),
  },
  comboBreakdownDot: { fontSize: rs(10), color: PRIMARY },
  comboBreakdownName: {
    flex: 1,
    fontSize: rs(11),
    color: TEXT_SECONDARY,
  },
  comboBreakdownQty: { fontSize: rs(11), color: TEXT_LIGHT },

  totalSeparator: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: nzVertical(8),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: rs(15), fontWeight: '700', color: TEXT_PRIMARY },
  totalValue: { fontSize: rs(17), fontWeight: '700', color: PRIMARY },

  doneBtn: {
    backgroundColor: PRIMARY,
    borderRadius: nz(12),
    paddingVertical: nzVertical(14),
    alignItems: 'center',
    marginTop: nzVertical(16),
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  doneBtnText: { fontSize: rs(15), fontWeight: '700', color: colors.white },
});