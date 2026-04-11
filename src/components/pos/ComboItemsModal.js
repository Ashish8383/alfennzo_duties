import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';
import DefaultImage from './DefaultImage';
import VegDot from './VegDot';

const PRIMARY = colors.primary;
const SUCCESS = '#2E7D32';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#666666';
const TEXT_LIGHT = '#999999';

const ComboItemsModal = ({ visible, combo, onClose, onAddToCart }) => {
  const insets = useSafeAreaInsets();
  const [imageError, setImageError] = useState(false);

  if (!combo) return null;

  const comboData = combo.comboData || combo;
  
  const calculateOriginalPrice = () => {
    return comboData.ComboItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  };

  const originalPrice = calculateOriginalPrice();
  const displayPrice = comboData.comboprice;
  const savings = originalPrice - displayPrice;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + nzVertical(16) }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={nz(24)} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Combo Details</Text>
            <View style={{ width: nz(40) }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.imageContainer}>
              {!imageError && comboData.image ? (
                <Image 
                  source={{ uri: comboData.image }}
                  style={styles.comboImage}
                  onError={() => setImageError(true)}
                  resizeMode="cover"
                />
              ) : (
                <DefaultImage size={nz(180)} />
              )}
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.titleRow}>
                <View style={styles.nameRow}>
                  <VegDot isVeg={comboData.isVeg} />
                  <Text style={styles.comboName}>{comboData.combofoodName || combo.name}</Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.comboPrice}>₹{displayPrice}</Text>
                {savings > 0 && (
                  <>
                    <Text style={styles.originalPrice}>₹{originalPrice}</Text>
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsBadgeText}>Save ₹{savings}</Text>
                    </View>
                  </>
                )}
              </View>

              {comboData.isDiscountedByRestraurant && comboData.discountinPercentageByRestraurant > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{comboData.discountinPercentageByRestraurant}% OFF</Text>
                </View>
              )}

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Combo Includes</Text>
              
              {comboData.ComboItems?.map((item, index) => (
                <View key={index} style={styles.comboItem}>
                  <View style={styles.comboItemInfo}>
                    <Text style={styles.comboItemName}>{item.foodName}</Text>
                    <Text style={styles.comboItemCategory}>{item.categoryName}</Text>
                  </View>
                  <View style={styles.comboItemRight}>
                    <Text style={styles.comboItemQty}>×{item.quantity}</Text>
                    <Text style={styles.comboItemPrice}>₹{item.price}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.addToCartBtn} 
              onPress={() => {
                onAddToCart(combo);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.addToCartBtnText}>Add Combo to Cart • ₹{displayPrice}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: nz(24),
    borderTopRightRadius: nz(24),
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeBtn: {
    width: nz(40),
    height: nz(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: rs(18),
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: nzVertical(20),
    backgroundColor: '#FAFAFA',
  },
  comboImage: {
    width: nz(180),
    height: nz(180),
    borderRadius: nz(16),
  },
  detailsContainer: {
    padding: nz(20),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: nzVertical(12),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  comboName: {
    fontSize: rs(20),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(10),
    marginBottom: nzVertical(8),
    flexWrap: 'wrap',
  },
  comboPrice: {
    fontSize: rs(24),
    fontWeight: '700',
    color: PRIMARY,
  },
  originalPrice: {
    fontSize: rs(16),
    color: TEXT_LIGHT,
    textDecorationLine: 'line-through',
  },
  savingsBadge: {
    backgroundColor: SUCCESS,
    paddingHorizontal: nz(8),
    paddingVertical: nzVertical(3),
    borderRadius: nz(8),
  },
  savingsBadgeText: {
    fontSize: rs(11),
    fontWeight: '600',
    color: colors.white,
  },
  discountBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: nz(8),
    paddingVertical: nzVertical(3),
    borderRadius: nz(8),
    alignSelf: 'flex-start',
    marginBottom: nzVertical(12),
  },
  discountBadgeText: {
    fontSize: rs(11),
    fontWeight: '600',
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: nzVertical(16),
  },
  sectionTitle: {
    fontSize: rs(16),
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: nzVertical(16),
  },
  comboItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nzVertical(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  comboItemInfo: {
    flex: 1,
  },
  comboItemName: {
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_PRIMARY,
    marginBottom: nzVertical(4),
  },
  comboItemCategory: {
    fontSize: rs(12),
    color: TEXT_LIGHT,
  },
  comboItemRight: {
    alignItems: 'flex-end',
    gap: nzVertical(4),
  },
  comboItemQty: {
    fontSize: rs(13),
    color: PRIMARY,
    fontWeight: '500',
  },
  comboItemPrice: {
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  footer: {
    padding: nz(20),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addToCartBtn: {
    backgroundColor: PRIMARY,
    borderRadius: nz(12),
    paddingVertical: nzVertical(16),
    alignItems: 'center',
  },
  addToCartBtnText: {
    fontSize: rs(16),
    fontWeight: '700',
    color: colors.white,
  },
});

export default ComboItemsModal;