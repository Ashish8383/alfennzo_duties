// components/pos/CartItem.js
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';
import DefaultImage from './DefaultImage';
import QuantityControl from './QuantityControl';
import VegDot from './VegDot';

const PRIMARY = colors.primary;
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#666666';
const TEXT_LIGHT = '#999999';
const BORDER_COLOR = '#F0F0F0';

export default function CartItem({ item, quantity, onIncrease, onDecrease, onRemove }) {
  const [imageError, setImageError] = useState(false);
  const [showComboDetails, setShowComboDetails] = useState(false);

  if (!item) return null;

  // ── Resolve display values ──────────────────────────────────────────────────
  // Cart items always have `name` set by addToCart, but guard all paths
  const itemName = item.name || item.itemName || item.combofoodName || 'Item';

  const displayPrice =
    item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0
      ? item.price * (1 - item.discountinPercentageByRestraurant / 100)
      : (item.price ?? 0);

  const isCombo =
    item.itemType === 'combo' || Boolean(item.comboData) || Boolean(item.comboItemCount);

  // comboData is the full API combo object stored by addToCart
  const comboData = item.comboData || {};
  const comboItemsList = comboData.ComboItems || [];
  const comboItemCount = item.comboItemCount ?? comboItemsList.length;

  const itemImage = item.image ?? comboData.image;

  return (
    <>
      {/* ── Row ── */}
      <View style={styles.cartItem}>
        {/* Thumbnail */}
        <View style={styles.imageContainer}>
          {!imageError && itemImage ? (
            <Image
              source={{ uri: itemImage }}
              style={styles.itemImage}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          ) : (
            <DefaultImage size={nz(50)} />
          )}
        </View>

        {/* Info block */}
        <View style={styles.cartItemInfo}>
          {/* Name row — NO flexWrap so flex:1 works on the Text */}
          <View style={styles.nameRow}>
            <VegDot isVeg={item.isVeg} />
            <Text style={styles.cartItemName} numberOfLines={2}>
              {itemName}
            </Text>
          </View>

          {/* Combo badge sits on its own line under the name */}
          {isCombo && (
            <View style={styles.comboBadgeWrap}>
              <View style={styles.comboBadge}>
                <Text style={styles.comboBadgeText}>COMBO</Text>
              </View>
            </View>
          )}

          <Text style={styles.cartItemPrice}>₹{Math.round(displayPrice)}</Text>

          {/* Tap to see combo breakdown */}
          {isCombo && comboItemCount > 0 && (
            <TouchableOpacity
              style={styles.comboInfoRow}
              onPress={() => setShowComboDetails(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="list-outline" size={nz(12)} color={PRIMARY} />
              <Text style={styles.comboItemCount}>{comboItemCount} items included</Text>
              <Ionicons name="chevron-forward" size={nz(12)} color={PRIMARY} />
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.cartItemActions}>
          <QuantityControl
            quantity={quantity}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
            size="small"
          />
          <TouchableOpacity onPress={onRemove} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={nz(18)} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Combo Detail Bottom-Sheet ── */}
      <Modal
        visible={showComboDetails}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowComboDetails(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop tap to close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowComboDetails(false)}
          />

          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowComboDetails(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={nz(22)} color={TEXT_PRIMARY} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Combo Details</Text>
              <View style={{ width: nz(40) }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Combo image */}
              <View style={styles.detailImageContainer}>
                {!imageError && itemImage ? (
                  <Image
                    source={{ uri: itemImage }}
                    style={styles.detailImage}
                    onError={() => setImageError(true)}
                    resizeMode="cover"
                  />
                ) : (
                  <DefaultImage size={nz(160)} />
                )}
              </View>

              <View style={styles.detailBody}>
                {/* Combo name + veg dot */}
                <View style={styles.comboTitleRow}>
                  <VegDot isVeg={item.isVeg} />
                  <Text style={styles.comboName} numberOfLines={2}>
                    {itemName}
                  </Text>
                </View>

                {/* Price */}
                <Text style={styles.comboPrice}>₹{Math.round(displayPrice)}</Text>

                <View style={styles.divider} />

                {/* Includes list */}
                <Text style={styles.sectionTitle}>
                  Combo Includes ({comboItemsList.length} items)
                </Text>

                {comboItemsList.length === 0 ? (
                  <Text style={styles.emptyText}>No item details available</Text>
                ) : (
                  comboItemsList.map((ci, idx) => (
                    <View
                      key={ci._id ?? idx}
                      style={[
                        styles.comboItem,
                        idx === comboItemsList.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={styles.comboItemLeft}>
                        <Text style={styles.comboItemName}>{ci.foodName}</Text>
                        {ci.categoryName ? (
                          <Text style={styles.comboItemCategory}>{ci.categoryName}</Text>
                        ) : null}
                      </View>
                      <View style={styles.comboItemRight}>
                        <Text style={styles.comboItemQty}>×{ci.quantity}</Text>
                        <Text style={styles.comboItemPrice}>₹{ci.price}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.gotItBtn}
                onPress={() => setShowComboDetails(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.gotItBtnText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Row ──────────────────────────────────────────────────────────────────────
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nzVertical(12),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
    gap: nz(10),
  },
  imageContainer: {
    width: nz(52),
    height: nz(52),
    borderRadius: nz(10),
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    flexShrink: 0,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },

  // Info — flex:1 so it fills remaining space
  cartItemInfo: {
    flex: 1,
    minWidth: 0, // allows text truncation to work
  },

  // Name row — NO flexWrap so the Text's flex:1 works correctly
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(5),
    marginBottom: nzVertical(3),
  },
  cartItemName: {
    flex: 1,          // fills the row; VegDot is fixed-size so this always has room
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_PRIMARY,
    flexShrink: 1,
  },

  // Combo badge on its own line
  comboBadgeWrap: {
    flexDirection: 'row',
    marginBottom: nzVertical(3),
  },
  comboBadge: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: nz(6),
    paddingVertical: nzVertical(2),
    borderRadius: nz(4),
  },
  comboBadgeText: {
    fontSize: rs(9),
    fontWeight: '700',
    color: '#FFFFFF',
  },

  cartItemPrice: {
    fontSize: rs(13),
    color: TEXT_SECONDARY,
    marginBottom: nzVertical(3),
  },
  comboInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(4),
  },
  comboItemCount: {
    fontSize: rs(11),
    color: PRIMARY,
    fontWeight: '500',
  },

  // Actions
  cartItemActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: nzVertical(8),
    flexShrink: 0,
  },
  removeBtn: {
    padding: nz(4),
  },

  // ── Modal ─────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: nz(24),
    borderTopRightRadius: nz(24),
    maxHeight: '85%',
    paddingBottom: nzVertical(4),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(14),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  closeBtn: {
    width: nz(36),
    height: nz(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: rs(17),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  detailImageContainer: {
    alignItems: 'center',
    paddingVertical: nzVertical(20),
    backgroundColor: '#FAFAFA',
  },
  detailImage: {
    width: nz(160),
    height: nz(160),
    borderRadius: nz(14),
  },
  detailBody: {
    padding: nz(20),
  },
  comboTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: nz(8),
    marginBottom: nzVertical(8),
  },
  comboName: {
    flex: 1,
    fontSize: rs(18),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  comboPrice: {
    fontSize: rs(22),
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: nzVertical(4),
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: nzVertical(16),
  },
  sectionTitle: {
    fontSize: rs(14),
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginBottom: nzVertical(12),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  emptyText: {
    fontSize: rs(13),
    color: TEXT_LIGHT,
    textAlign: 'center',
    paddingVertical: nzVertical(12),
  },
  comboItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nzVertical(11),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  comboItemLeft: {
    flex: 1,
    paddingRight: nz(12),
  },
  comboItemName: {
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_PRIMARY,
    marginBottom: nzVertical(2),
  },
  comboItemCategory: {
    fontSize: rs(11),
    color: TEXT_LIGHT,
  },
  comboItemRight: {
    alignItems: 'flex-end',
    gap: nzVertical(2),
  },
  comboItemQty: {
    fontSize: rs(13),
    color: PRIMARY,
    fontWeight: '600',
  },
  comboItemPrice: {
    fontSize: rs(13),
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  modalFooter: {
    padding: nz(16),
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  gotItBtn: {
    backgroundColor: PRIMARY,
    borderRadius: nz(12),
    paddingVertical: nzVertical(14),
    alignItems: 'center',
  },
  gotItBtnText: {
    fontSize: rs(15),
    fontWeight: '700',
    color: colors.white,
  },
});