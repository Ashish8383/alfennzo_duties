// screens/CartScreen.js
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import VegDot from '../components/pos/VegDot';
import useUIStore from '../stores/uiStore';
import colors from '../utils/colors';
import { nz, nzVertical, rs } from '../utils/responsive';

const { height: SH, width: SW } = Dimensions.get('window');
const PRIMARY = colors.primary;
const PRIMARY_LIGHT = '#E8F5F2';
const PRIMARY_PALE = '#F0FAF7';
const WHITE = '#FFFFFF';
const BG = '#F2F4F7';
const TEXT1 = '#111111';
const TEXT2 = '#555555';
const TEXT3 = '#999999';
const BORDER = '#E8E8E8';
const RED = '#E53935';

// ─── Skeleton Components ──────────────────────────────────────────────────────
const SkeletonBox = ({ width, height, borderRadius = nz(6), style }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7]
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E0E0E0',
          opacity
        },
        style
      ]}
    />
  );
};

const SkeletonCartItem = () => (
  <View style={skStyles.card}>
    <View style={skStyles.mainRow}>
      <SkeletonBox width={nz(72)} height={nz(72)} borderRadius={nz(10)} />
      <View style={skStyles.rightBlock}>
        <View style={skStyles.nameRow}>
          <SkeletonBox width={nz(12)} height={nz(12)} borderRadius={nz(6)} />
          <SkeletonBox width="70%" height={nzVertical(16)} borderRadius={nz(4)} />
          <SkeletonBox width={nz(50)} height={nzVertical(20)} borderRadius={nz(5)} />
        </View>
        <SkeletonBox width="40%" height={nzVertical(11)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(8) }} />
        <View style={skStyles.priceRow}>
          <SkeletonBox width={nz(60)} height={nzVertical(18)} borderRadius={nz(4)} />
          <SkeletonBox width={nz(90)} height={nzVertical(32)} borderRadius={nz(16)} />
        </View>
      </View>
    </View>
  </View>
);

const SkeletonSection = ({ showHeader = true, itemCount = 3 }) => (
  <View style={skStyles.section}>
    {showHeader && (
      <View style={skStyles.sectionHeader}>
        <SkeletonBox width={nz(100)} height={nzVertical(16)} borderRadius={nz(4)} />
      </View>
    )}
    <View style={skStyles.sectionBody}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <SkeletonCartItem key={index} />
      ))}
    </View>
  </View>
);

const CartScreenSkeleton = () => (
  <ScrollView
    showsVerticalScrollIndicator={false}
    contentContainerStyle={skStyles.scrollContent}
  >
    {/* Items section */}
    <SkeletonSection itemCount={3} />

    {/* Bill details section */}
    <SkeletonSection showHeader={false} itemCount={1}>
      <View style={skStyles.billSkeleton}>
        <View style={skStyles.billRow}>
          <SkeletonBox width={nz(80)} height={nzVertical(14)} borderRadius={nz(4)} />
          <SkeletonBox width={nz(60)} height={nzVertical(14)} borderRadius={nz(4)} />
        </View>
        <View style={skStyles.billRow}>
          <SkeletonBox width={nz(70)} height={nzVertical(14)} borderRadius={nz(4)} />
          <SkeletonBox width={nz(50)} height={nzVertical(14)} borderRadius={nz(4)} />
        </View>
        <View style={skStyles.divider} />
        <View style={skStyles.billRow}>
          <SkeletonBox width={nz(60)} height={nzVertical(16)} borderRadius={nz(4)} />
          <SkeletonBox width={nz(70)} height={nzVertical(16)} borderRadius={nz(4)} />
        </View>
      </View>
    </SkeletonSection>

    {/* Customer details section */}
    <SkeletonSection showHeader={false} itemCount={1}>
      <View style={skStyles.inputSkeleton}>
        <SkeletonBox width="100%" height={nzVertical(50)} borderRadius={nz(10)} />
      </View>
      <View style={skStyles.inputSkeleton}>
        <SkeletonBox width="100%" height={nzVertical(50)} borderRadius={nz(10)} />
      </View>
    </SkeletonSection>

    {/* Seat selection section */}
    <SkeletonSection showHeader={false} itemCount={1}>
      <SkeletonBox width="100%" height={nzVertical(80)} borderRadius={nz(12)} />
    </SkeletonSection>

    {/* Payment section */}
    <SkeletonSection showHeader={false} itemCount={1}>
      <View style={skStyles.paymentSkeleton}>
        {[1, 2, 3].map((_, index) => (
          <SkeletonBox key={index} width="30%" height={nzVertical(44)} borderRadius={nz(10)} />
        ))}
      </View>
    </SkeletonSection>
  </ScrollView>
);

const skStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: nz(14),
    paddingTop: nzVertical(14),
    paddingBottom: nzVertical(100),
  },
  section: {
    backgroundColor: WHITE,
    borderRadius: nz(16),
    marginBottom: nzVertical(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionHeader: {
    paddingHorizontal: nz(14),
    paddingVertical: nzVertical(12),
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionBody: {
    padding: nz(14),
  },
  card: {
    paddingVertical: nzVertical(8),
    marginBottom: nzVertical(8),
  },
  mainRow: {
    flexDirection: 'row',
    gap: nz(12),
  },
  rightBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nz(5),
    marginBottom: nzVertical(6),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: nzVertical(4),
  },
  billSkeleton: {
    gap: nzVertical(8),
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: nzVertical(5),
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: nzVertical(8),
  },
  inputSkeleton: {
    marginBottom: nzVertical(10),
  },
  paymentSkeleton: {
    flexDirection: 'row',
    gap: nz(10),
    justifyContent: 'space-between',
  },
});

// ─── helpers ──────────────────────────────────────────────────────────────────
const resolveName = it =>
  it?.name || it?.itemName || it?.combofoodName || it?.comboData?.combofoodName || 'Item';
const resolvePrice = it =>
  it.isDiscountedByRestraurant && it.discountinPercentageByRestraurant > 0
    ? it.price * (1 - it.discountinPercentageByRestraurant / 100)
    : (it.price ?? 0);
const resolveImage = it => it?.image || it?.categoryImage || it?.comboData?.image || null;

// ─── Item image with fallback ─────────────────────────────────────────────────
function ItemImage({ uri, size = nz(72) }) {
  const [err, setErr] = useState(false);
  if (!err && uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: nz(10), backgroundColor: '#F0F0F0' }}
        onError={() => setErr(true)}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: nz(10), backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }}>
      <MaterialCommunityIcons name="food" size={nz(28)} color={TEXT3} />
    </View>
  );
}

// ─── Qty stepper ──────────────────────────────────────────────────────────────
function Stepper({ qty, onInc, onDec, onRemove }) {
  return (
    <View style={st.row}>
      <TouchableOpacity
        style={[st.btn, qty === 1 && st.btnRed]}
        onPress={qty === 1 ? onRemove : onDec}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={nz(15)} color={qty === 1 ? RED : PRIMARY} />
      </TouchableOpacity>
      <Text style={st.qty}>{qty}</Text>
      <TouchableOpacity
        style={st.btn}
        onPress={onInc}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={nz(15)} color={PRIMARY} />
      </TouchableOpacity>
    </View>
  );
}
const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: nz(12) },
  btn: { width: nz(32), height: nz(32), borderRadius: nz(16), backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center' },
  btnRed: { backgroundColor: '#FFEBEE' },
  qty: { fontSize: rs(16), fontWeight: '700', color: TEXT1, minWidth: nz(22), textAlign: 'center' },
});

// ─── Cart item card ───────────────────────────────────────────────────────────
function CartCard({ item, onInc, onDec, onRemove }) {
  const [open, setOpen] = useState(false);
  const name = resolveName(item);
  const price = resolvePrice(item);
  const imgUri = resolveImage(item);
  const isCombo = item.itemType === 'combo' || Boolean(item.comboData);
  const kids = item.comboData?.ComboItems || [];

  return (
    <View style={cc.card}>
      <View style={cc.mainRow}>
        <ItemImage uri={imgUri} size={nz(72)} />
        <View style={cc.rightBlock}>
          <View style={cc.nameRow}>
            <VegDot isVeg={item.isVeg} />
            <Text style={cc.name}>{name}</Text>
            {isCombo && (
              <View style={cc.pill}>
                <Text style={cc.pillTxt}>COMBO</Text>
              </View>
            )}
          </View>
          {item.categoryName ? (
            <Text style={cc.cat} numberOfLines={1}>{item.categoryName}</Text>
          ) : null}
          <View style={cc.priceRow}>
            <View>
              <Text style={cc.price}>₹{Math.round(price)}</Text>
              {item.isDiscountedByRestraurant && item.discountinPercentageByRestraurant > 0 && (
                <Text style={cc.strike}>₹{item.price}</Text>
              )}
            </View>
            <Stepper qty={item.quantity} onInc={onInc} onDec={onDec} onRemove={onRemove} />
          </View>
        </View>
      </View>

      {isCombo && kids.length > 0 && (
        <TouchableOpacity style={cc.toggle} onPress={() => setOpen(v => !v)} activeOpacity={0.7}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={nz(13)} color={PRIMARY} />
          <Text style={cc.toggleTxt}>{open ? 'Hide' : 'Show'} {kids.length} included items</Text>
        </TouchableOpacity>
      )}
      {open && (
        <View style={cc.breakdown}>
          {kids.map((k, i) => (
            <View key={i} style={cc.kidRow}>
              <View style={cc.kidDot} />
              <Text style={cc.kidName}>{k.foodName}</Text>
              <Text style={cc.kidMeta}>×{k.quantity}  ₹{k.price}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const cc = StyleSheet.create({
  card: { backgroundColor: WHITE, borderRadius: nz(14), padding: nz(12), marginBottom: nzVertical(10), borderWidth: 1, borderColor: BORDER },
  mainRow: { flexDirection: 'row', gap: nz(12) },
  rightBlock: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: nz(5), marginBottom: nzVertical(3) },
  name: { flex: 1, flexShrink: 1, fontSize: rs(14), fontWeight: '600', color: TEXT1, lineHeight: nzVertical(20) },
  pill: { backgroundColor: '#FFF3E0', borderRadius: nz(5), paddingHorizontal: nz(5), paddingVertical: nzVertical(2), flexShrink: 0, alignSelf: 'flex-start' },
  pillTxt: { fontSize: rs(8), fontWeight: '800', color: '#E65100' },
  cat: { fontSize: rs(11), color: TEXT3, marginBottom: nzVertical(6) },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: rs(16), fontWeight: '700', color: PRIMARY },
  strike: { fontSize: rs(10), color: TEXT3, textDecorationLine: 'line-through' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: nz(5), marginTop: nzVertical(10), paddingTop: nzVertical(8), borderTopWidth: 1, borderTopColor: BORDER },
  toggleTxt: { fontSize: rs(12), color: PRIMARY, fontWeight: '500' },
  breakdown: { marginTop: nzVertical(6), borderLeftWidth: 2, borderLeftColor: PRIMARY + '25', paddingLeft: nz(10) },
  kidRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: nzVertical(3), gap: nz(6) },
  kidDot: { width: nz(5), height: nz(5), borderRadius: nz(3), backgroundColor: PRIMARY, flexShrink: 0 },
  kidName: { flex: 1, fontSize: rs(12), color: TEXT2 },
  kidMeta: { fontSize: rs(11), color: TEXT3 },
});

// ─── Seat Picker Bottom Sheet ─────────────────────────────────────────────────
function SeatPickerSheet({ visible, seatingData, onConfirm, onClose, insets }) {
  const slideX = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);
  const [audi, setAudi] = useState(null);
  const [row, setRow] = useState(null);
  const [seat, setSeat] = useState(null);

  const screens = useMemo(() => (seatingData?.screens || []).filter(s => s.audiNo), [seatingData]);
  const lines = useMemo(() => screens.find(s => s.audiNo === audi)?.lines || [], [screens, audi]);
  const seats = useMemo(() => lines.find(l => l.line === row)?.seats || [], [lines, row]);

  const slideTo = nextStep => {
    Animated.timing(slideX, {
      toValue: -SW * nextStep,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setStep(nextStep);
  };

  const pickAudi = a => { setAudi(a); setRow(null); setSeat(null); slideTo(1); };
  const pickRow = r => { setRow(r); setSeat(null); slideTo(2); };
  const pickSeat = s => setSeat(s === seat ? null : s);

  const goBack = () => {
    if (step === 1) { setAudi(null); slideTo(0); }
    if (step === 2) { setRow(null); setSeat(null); slideTo(1); }
  };

  const reset = () => {
    setStep(0); setAudi(null); setRow(null); setSeat(null);
    slideX.setValue(0);
  };

  const handleClose = () => { reset(); onClose(); };

  const confirm = () => {
    if (audi && seat) { onConfirm({ audi, row, seat }); handleClose(); }
  };

  const STEPS = ['Audi', 'Row', 'Seat'];
  const pb = Math.max(insets.bottom, nzVertical(16));

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <View style={sh.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />

        <View style={[sh.sheet, { paddingBottom: pb }]}>
          <View style={sh.pill} />

          <View style={sh.header}>
            {step > 0
              ? <TouchableOpacity onPress={goBack} style={sh.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="arrow-back" size={nz(20)} color={TEXT1} />
              </TouchableOpacity>
              : <View style={sh.navBtn} />}
            <View style={{ flex: 1 }}>
              <Text style={sh.headerTitle} numberOfLines={1}>
                {step === 0 ? 'Select Audi'
                  : step === 1 ? `Audi ${audi}  ·  Select Row`
                    : `Audi ${audi}  ·  Row ${row}`}
              </Text>
              {step === 2 && <Text style={sh.headerSub}>Select a seat number</Text>}
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={nz(22)} color={TEXT2} />
            </TouchableOpacity>
          </View>

          <View style={sh.crumb}>
            {STEPS.map((s, i) => (
              <View key={i} style={sh.crumbItem}>
                <View style={[sh.dot, step > i ? sh.dotDone : step === i ? sh.dotActive : sh.dotIdle]}>
                  {step > i
                    ? <Ionicons name="checkmark" size={nz(11)} color={WHITE} />
                    : <Text style={[sh.dotNum, step === i && { color: WHITE }]}>{i + 1}</Text>}
                </View>
                <Text style={[sh.crumbLbl, step === i && sh.crumbLblActive, step > i && sh.crumbLblDone]}>
                  {s}
                  {i === 0 && audi ? ` ${audi}` : ''}
                  {i === 1 && row ? ` ${row}` : ''}
                  {i === 2 && seat ? ` ${seat}` : ''}
                </Text>
                {i < STEPS.length - 1 && (
                  <View style={[sh.crumbLine, step > i && sh.crumbLineDone]} />
                )}
              </View>
            ))}
          </View>

          <View style={sh.clip}>
            <Animated.View style={[sh.track, { transform: [{ translateX: slideX }] }]}>

              {/* Panel 0 — Audi */}
              <View style={sh.panel}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sh.grid} bounces={false}>
                  {screens.length === 0
                    ? <Text style={sh.none}>No audis available</Text>
                    : screens.map(sc => (
                      <TouchableOpacity
                        key={sc.audiNo}
                        style={[sh.gridBtn, audi === sc.audiNo && sh.gridBtnActive]}
                        onPress={() => pickAudi(sc.audiNo)}
                        activeOpacity={0.7}
                      >
                        <Text style={sh.gridLbl}>Audi</Text>
                        <Text style={[sh.gridNum, audi === sc.audiNo && sh.gridNumActive]}>{sc.audiNo}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>

              {/* Panel 1 — Row */}
              <View style={sh.panel}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sh.grid} bounces={false}>
                  {lines.map(l => (
                    <TouchableOpacity
                      key={l.line}
                      style={[sh.gridBtn, row === l.line && sh.gridBtnActive]}
                      onPress={() => pickRow(l.line)}
                      activeOpacity={0.7}
                    >
                      <Text style={sh.gridLbl}>Row</Text>
                      <Text style={[sh.gridNum, row === l.line && sh.gridNumActive]}>{l.line}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Panel 2 — Seat */}
              <View style={sh.panel}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sh.seatGrid} bounces={false}>
                  {seats.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[sh.seatBtn, seat === s && sh.seatBtnActive]}
                      onPress={() => pickSeat(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[sh.seatNum, seat === s && sh.seatNumActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

            </Animated.View>
          </View>

          {step === 2 && (
            <TouchableOpacity
              style={[sh.confirmBtn, !seat && sh.confirmOff]}
              onPress={confirm}
              disabled={!seat}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={nz(20)} color={WHITE} />
              <Text style={sh.confirmTxt} numberOfLines={1}>
                {seat
                  ? `Confirm — Audi ${audi}  ·  Row ${row}  ·  Seat ${seat}`
                  : 'Tap a seat to select'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const GRID_COLS = 3;
const SEAT_COLS = 5;
const PANEL_PAD = nz(16);
const GRID_GAP = nz(8);
const gridBtnW = (SW - PANEL_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const seatBtnW = (SW - PANEL_PAD * 2 - GRID_GAP * (SEAT_COLS - 1)) / SEAT_COLS;

const sh = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: nz(28), borderTopRightRadius: nz(28),
    paddingTop: nzVertical(8),
    maxHeight: SH * 0.85,
    overflow: 'hidden',
  },
  pill: { width: nz(42), height: nz(4), borderRadius: nz(2), backgroundColor: '#DDD', alignSelf: 'center', marginBottom: nzVertical(14) },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: nz(16), marginBottom: nzVertical(14), gap: nz(10) },
  navBtn: { width: nz(34), height: nz(34), justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: rs(15), fontWeight: '700', color: TEXT1 },
  headerSub: { fontSize: rs(11), color: TEXT3, marginTop: nzVertical(2) },

  crumb: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: nz(16), marginBottom: nzVertical(16) },
  crumbItem: { flexDirection: 'row', alignItems: 'center', gap: nz(5) },
  dot: { width: nz(24), height: nz(24), borderRadius: nz(12), justifyContent: 'center', alignItems: 'center' },
  dotActive: { backgroundColor: PRIMARY },
  dotDone: { backgroundColor: '#2E7D32' },
  dotIdle: { backgroundColor: '#E0E0E0' },
  dotNum: { fontSize: rs(11), fontWeight: '700', color: TEXT3 },
  crumbLbl: { fontSize: rs(11), color: TEXT3, fontWeight: '500' },
  crumbLblActive: { color: PRIMARY, fontWeight: '700' },
  crumbLblDone: { color: '#2E7D32', fontWeight: '600' },
  crumbLine: { width: nz(20), height: nz(2), backgroundColor: '#E0E0E0', marginHorizontal: nz(4) },
  crumbLineDone: { backgroundColor: '#2E7D32' },

  clip: { overflow: 'hidden', height: SH * 0.38 },
  track: { flexDirection: 'row', width: SW * 3, height: '100%' },
  panel: { width: SW, paddingHorizontal: PANEL_PAD },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, paddingBottom: nzVertical(8) },
  gridBtn: { width: gridBtnW, paddingVertical: nzVertical(13), borderRadius: nz(12), backgroundColor: '#F5F5F5', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  gridBtnActive: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  gridLbl: { fontSize: rs(9), color: TEXT3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: nzVertical(3) },
  gridNum: { fontSize: rs(17), fontWeight: '800', color: TEXT2 },
  gridNumActive: { color: PRIMARY },
  none: { fontSize: rs(13), color: TEXT3, textAlign: 'center', paddingVertical: nzVertical(20), width: '100%' },

  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, paddingBottom: nzVertical(8) },
  seatBtn: { width: seatBtnW, paddingVertical: nzVertical(12), borderRadius: nz(10), backgroundColor: '#F5F5F5', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  seatBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  seatNum: { fontSize: rs(13), fontWeight: '700', color: TEXT2 },
  seatNumActive: { color: WHITE },

  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: nz(8), margin: nz(16), backgroundColor: PRIMARY, borderRadius: nz(14), paddingVertical: nzVertical(14), shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  confirmOff: { backgroundColor: '#C0C0C0', shadowOpacity: 0 },
  confirmTxt: { fontSize: rs(14), fontWeight: '700', color: WHITE },
});

// ─── Success sheet ─────────────────────────────────────────────────────────────
function SuccessSheet({ order, onDone, insets }) {
  const slideY = useRef(new Animated.Value(SH)).current;
  useState(() => {
    Animated.timing(slideY, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  });
  const pb = Math.max(insets.bottom, nzVertical(16));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={sx.backdrop} />
      <Animated.View style={[sx.sheet, { paddingBottom: pb, transform: [{ translateY: slideY }] }]}>
        <View style={sx.pill} />
        <View style={sx.iconWrap}><Ionicons name="checkmark-circle" size={nz(58)} color={PRIMARY} /></View>
        <Text style={sx.title}>Order Placed!</Text>
        <Text style={sx.sub}>{order.orderId}</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SH * 0.5 }} bounces={false}>
          <View style={sx.block}>
            {[
              ['Customer', order.customerName || '—'],
              ['Phone', order.phoneNumber],
              ['Seat', [order.audi && `Audi ${order.audi}`, order.row && `Row ${order.row}`, order.seat && `Seat ${order.seat}`].filter(Boolean).join(' · ')],
              ['Payment', (order.paymentMethod || '').toUpperCase()],
            ].map(([k, v]) => (
              <View key={k} style={sx.row}><Text style={sx.lbl}>{k}</Text><Text style={sx.val}>{v}</Text></View>
            ))}
            <View style={sx.line} />
            <View style={sx.row}><Text style={sx.lbl}>Subtotal</Text><Text style={sx.val}>₹{order.subtotal}</Text></View>
            <View style={sx.row}><Text style={sx.lbl}>GST (5%)</Text><Text style={sx.val}>₹{order.tax}</Text></View>
            <View style={[sx.row, { paddingTop: nzVertical(4) }]}>
              <Text style={sx.totalLbl}>Total</Text><Text style={sx.totalVal}>₹{order.total}</Text>
            </View>
          </View>
          <Text style={sx.itemsHead}>Items ({order.items?.length})</Text>
          {order.items?.map((it, i) => (
            <View key={i} style={sx.item}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: nz(8) }}>
                <Text style={sx.itemName}>{it.name}</Text>
                <Text style={sx.itemMeta}>×{it.quantity}  ₹{Math.round(it.price * it.quantity)}</Text>
              </View>
              {it.comboItems?.length > 0 && (
                <View style={sx.kids}>
                  {it.comboItems.map((c, j) => <Text key={j} style={sx.kid}>· {c.foodName}  ×{c.quantity}</Text>)}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={sx.doneBtn} onPress={onDone} activeOpacity={0.85}>
          <Text style={sx.doneTxt}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
const sx = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: WHITE, borderTopLeftRadius: nz(28), borderTopRightRadius: nz(28), paddingHorizontal: nz(20), paddingTop: nzVertical(8), maxHeight: SH * 0.88, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, elevation: 20 },
  pill: { width: nz(42), height: nz(4), borderRadius: nz(2), backgroundColor: '#DDD', alignSelf: 'center', marginBottom: nzVertical(18) },
  iconWrap: { alignItems: 'center', marginBottom: nzVertical(6) },
  title: { fontSize: rs(22), fontWeight: '800', color: TEXT1, textAlign: 'center', marginBottom: nzVertical(4) },
  sub: { fontSize: rs(11), color: TEXT3, textAlign: 'center', letterSpacing: 0.6, marginBottom: nzVertical(14) },
  block: { backgroundColor: PRIMARY_PALE, borderRadius: nz(14), padding: nz(14), marginBottom: nzVertical(14), borderWidth: 1, borderColor: PRIMARY + '25' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: nzVertical(4) },
  lbl: { fontSize: rs(12), color: TEXT3 },
  val: { fontSize: rs(12), fontWeight: '600', color: TEXT1 },
  line: { height: 1, backgroundColor: BORDER, marginVertical: nzVertical(8) },
  totalLbl: { fontSize: rs(14), fontWeight: '700', color: TEXT1 },
  totalVal: { fontSize: rs(15), fontWeight: '800', color: PRIMARY },
  itemsHead: { fontSize: rs(11), fontWeight: '700', color: TEXT2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: nzVertical(8) },
  item: { paddingVertical: nzVertical(8), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemName: { flex: 1, fontSize: rs(13), fontWeight: '600', color: TEXT1 },
  itemMeta: { fontSize: rs(12), color: TEXT3, flexShrink: 0 },
  kids: { paddingLeft: nz(10), marginTop: nzVertical(4) },
  kid: { fontSize: rs(11), color: TEXT2, lineHeight: nzVertical(18) },
  doneBtn: { marginTop: nzVertical(14), backgroundColor: PRIMARY, borderRadius: nz(14), paddingVertical: nzVertical(15), alignItems: 'center', shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  doneTxt: { fontSize: rs(16), fontWeight: '700', color: WHITE },
});

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon, title, badge, badgeDanger, children }) {
  return (
    <View style={sc.wrap}>
      <View style={sc.hdr}>
        <View style={sc.iconBox}><Ionicons name={icon} size={nz(16)} color={PRIMARY} /></View>
        <Text style={sc.title}>{title}</Text>
        {badge && (
          <View style={[sc.badge, badgeDanger && sc.badgeRed]}>
            <Text style={sc.badgeTxt}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  wrap: { backgroundColor: WHITE, borderRadius: nz(16), marginBottom: nzVertical(12), overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  hdr: { flexDirection: 'row', alignItems: 'center', gap: nz(8), paddingHorizontal: nz(14), paddingVertical: nzVertical(12), backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: BORDER },
  iconBox: { width: nz(28), height: nz(28), borderRadius: nz(8), backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: rs(13), fontWeight: '700', color: TEXT1 },
  badge: { backgroundColor: PRIMARY, paddingHorizontal: nz(8), paddingVertical: nzVertical(2), borderRadius: nz(10) },
  badgeRed: { backgroundColor: RED },
  badgeTxt: { fontSize: rs(10), fontWeight: '700', color: WHITE },
  body: { padding: nz(14) },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function CartScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const FOOTER_H = nzVertical(10) + Math.max(insets.bottom, nzVertical(16));
  const footerPB = Math.max(insets.bottom, nzVertical(16));

  const { cart: initCart = {}, onCartChange } = route.params ?? {};
  const [cart, setCart] = useState(initCart);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading cart data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof onCartChange === 'function') {
      onCartChange(cart);
    }
  }, [cart]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const [custName, setCustName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [seatErr, setSeatErr] = useState('');

  const [seatInfo, setSeatInfo] = useState(null);
  const [showSeatPicker, setShowSeatPicker] = useState(false);

  const [payMethod, setPayMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [order, setOrder] = useState(null);

  const { seatingData, createPOSOrder, orderCreating } = useUIStore();

  const cartItems = useMemo(() => Object.values(cart).filter(it => it && it.quantity > 0), [cart]);
  const subtotal = useMemo(() => cartItems.reduce((s, it) => s + resolvePrice(it) * it.quantity, 0), [cartItems]);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const inc = useCallback(id => setCart(p => p[id] ? { ...p, [id]: { ...p[id], quantity: p[id].quantity + 1 } } : p), []);
  const dec = useCallback(id => setCart(p => {
    if (!p[id]) return p;
    if (p[id].quantity <= 1) { const { [id]: _, ...r } = p; return r; }
    return { ...p, [id]: { ...p[id], quantity: p[id].quantity - 1 } };
  }), []);
  const remove = useCallback(id => setCart(p => { const { [id]: _, ...r } = p; return r; }), []);

  const validateAndPlace = () => {
    let valid = true;

    if (!phone.trim()) {
      setPhoneErr('Phone number is required');
      valid = false;
    } else if (!/^\d{10}$/.test(phone.trim())) {
      setPhoneErr('Enter a valid 10-digit number');
      valid = false;
    } else {
      setPhoneErr('');
    }

    if (!seatInfo?.seat) {
      setSeatErr('Please select a seat before placing the order');
      valid = false;
    } else {
      setSeatErr('');
    }

    if (!valid) return;
    doPlaceOrder();
  };

  const doPlaceOrder = async () => {
    const seatNo = seatInfo?.audi && seatInfo?.row && seatInfo?.seat
      ? `Aud ${seatInfo.audi} / ${seatInfo.row}-${seatInfo.seat}`
      : '';

    const orderPayload = {
      seatNo,
      customerName: custName.trim() || '',
      Customerphone: phone.trim(),
      orderItems: cartItems.map(item => {
        const isCombo = item.itemType === 'combo' || Boolean(item.comboData);
        const baseItem = {
          _id: item.id || item._id,
          foodName: resolveName(item),
          foodtype: item.isVeg ? 'Veg' : 'Non-Veg',
          amount: Math.round(resolvePrice(item)),
          GST: 0,
          quantity: item.quantity,
          size: 'full',
          customization: [],
          combo_items: [],
        };

        if (isCombo && item.comboData?.ComboItems) {
          baseItem.combo_items = item.comboData.ComboItems.map(comboItem => ({
            foodName: comboItem.foodName,
            foodtype: comboItem.isVeg ? 'Veg' : 'Non-Veg',
            amount: comboItem.price || 0,
            quantity: comboItem.quantity || 1,
          }));
        }

        return baseItem;
      }),
      paymentMethod: payMethod.toUpperCase(),
    };


    const result = await createPOSOrder(orderPayload);

    if (result.success) {
      const od = {
        orderId: result.data?.orderId || `ORD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        customerName: custName.trim() || null,
        phoneNumber: phone.trim(),
        audi: seatInfo.audi,
        row: seatInfo.row,
        seat: seatInfo.seat,
        paymentMethod: payMethod,
        note: note.trim() || null,
        items: cartItems.map(it => ({
          id: it.id,
          name: resolveName(it),
          quantity: it.quantity,
          price: resolvePrice(it),
          itemType: it.itemType || 'regular',
          isVeg: it.isVeg,
          comboItems: it.comboData?.ComboItems || [],
        })),
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        total: Math.round(total),
        apiResponse: result.data,
      };
      setOrder(od);
    } else {
      Alert.alert('Order Failed', result.error || 'Could not place order. Please try again.');
    }
  };

  const handleDone = () => {
    if (typeof onCartChange === 'function') onCartChange({});
    navigation.goBack();
  };

  const canPlace =
    cartItems.length > 0 &&
    /^\d{10}$/.test(phone.trim()) &&
    Boolean(seatInfo?.seat) &&
    !orderCreating;

  const PAY_METHODS = [
    { id: 'cash', label: 'Cash', icon: 'cash-outline' },
    { id: 'card', label: 'Card', icon: 'card-outline' },
    { id: 'upi', label: 'UPI', icon: 'qr-code-outline' },
  ];

  // Calculate dynamic footer padding when keyboard is visible
  const footerPadding = isKeyboardVisible ? keyboardHeight - insets.bottom : footerPB;

  // Loading state with skeleton
  if (isLoading) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={BG} />
        <SafeAreaView style={scr.root} edges={['top', 'left', 'right']}>
          <CartHeader title="Cart" onBack={() => navigation.goBack()} />
          <CartScreenSkeleton />
          <View style={[scr.footer, { paddingBottom: footerPB }]}>
            <SkeletonBox width="100%" height={nzVertical(56)} borderRadius={nz(14)} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Empty cart
  if (cartItems.length === 0 && !order) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={BG} />
        <SafeAreaView style={scr.root} edges={['top', 'left', 'right']}>
          <CartHeader title="Cart" onBack={() => navigation.goBack()} />
          <View style={scr.emptyWrap}>
            <MaterialCommunityIcons name="cart-off" size={nz(64)} color={TEXT3} />
            <Text style={scr.emptyTitle}>Your cart is empty</Text>
            <Text style={scr.emptySub}>Add items from the menu</Text>
            <TouchableOpacity style={scr.emptyBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={scr.emptyBtnTxt}>← Back to Menu</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={BG} />
      <SafeAreaView style={scr.root} edges={['top', 'left', 'right']}>
        <CartHeader title={`Cart (${cartItems.length})`} onBack={() => navigation.goBack()} />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={!isKeyboardVisible} // Disable when keyboard is already visible to prevent jumping
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[scr.scroll, { paddingBottom: FOOTER_H + nzVertical(16) }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEnabled={!isKeyboardVisible} // Prevent scroll while keyboard is open
          >
            <Section icon="receipt-outline" title="Your Order">
              {cartItems.map(it => (
                <CartCard
                  key={it.id} item={it}
                  onInc={() => inc(it.id)}
                  onDec={() => dec(it.id)}
                  onRemove={() => remove(it.id)}
                />
              ))}
            </Section>

            <Section icon="calculator-outline" title="Bill Details">
              <BillRow label="Subtotal" value={`₹${Math.round(subtotal)}`} />
              <BillRow label="GST (5%)" value={`₹${Math.round(tax)}`} />
              <View style={{ height: 1, backgroundColor: BORDER, marginVertical: nzVertical(8) }} />
              <BillRow label="Total" value={`₹${Math.round(total)}`} bold />
            </Section>

            <Section icon="person-outline" title="Customer Details">
              <InputField
                icon="person-outline"
                placeholder="Customer name (optional)"
                value={custName}
                onChange={setCustName}
              />
              <InputField
                icon="call-outline"
                placeholder="Phone number *"
                value={phone}
                onChange={t => { setPhone(t.replace(/\D/g, '')); if (phoneErr) setPhoneErr(''); }}
                keyboard="phone-pad"
                maxLen={10}
                error={phoneErr}
              />
            </Section>

            <Section
              icon="location-outline"
              title="Seat Selection"
              badge={seatInfo?.seat ? '✓ Selected' : 'Required'}
              badgeDanger={!seatInfo?.seat}
            >
              {seatInfo?.seat ? (
                <View style={scr.seatCard}>
                  <View style={scr.seatCardLeft}>
                    <View style={scr.seatIconBox}>
                      <Ionicons name="location" size={nz(20)} color={PRIMARY} />
                    </View>
                    <View>
                      <Text style={scr.seatCardTitle}>
                        Audi {seatInfo.audi}
                        {seatInfo.row ? `  ·  Row ${seatInfo.row}` : ''}
                        {seatInfo.seat ? `  ·  Seat ${seatInfo.seat}` : ''}
                      </Text>
                      <Text style={scr.seatCardSub}>Tap Change to pick a different seat</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={scr.changeBtn} onPress={() => setShowSeatPicker(true)} activeOpacity={0.7}>
                    <Text style={scr.changeTxt}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={scr.seatPrompt} onPress={() => setShowSeatPicker(true)} activeOpacity={0.8}>
                  <View style={scr.seatPromptIcon}>
                    <Ionicons name="location-outline" size={nz(22)} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={scr.seatPromptTitle}>Select Your Seat</Text>
                    <Text style={scr.seatPromptSub}>Audi  →  Row  →  Seat number</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={nz(20)} color={TEXT3} />
                </TouchableOpacity>
              )}

              {seatErr ? (
                <Text style={scr.seatErrTxt}>{seatErr}</Text>
              ) : null}
            </Section>

            <Section icon="wallet-outline" title="Payment Method">
              <View style={scr.payRow}>
                {PAY_METHODS.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[scr.payBtn, payMethod === m.id && scr.payBtnOn]}
                    onPress={() => setPayMethod(m.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={m.icon} size={nz(19)} color={payMethod === m.id ? WHITE : TEXT2} />
                    <Text style={[scr.payLbl, payMethod === m.id && { color: WHITE }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Section>

            <Section icon="chatbubble-ellipses-outline" title="Special Instructions" badge="Optional">
              <InputField
                icon="create-outline"
                placeholder="Any special requests…"
                value={note}
                onChange={setNote}
                multiline
              />
            </Section>

          </ScrollView>

          <View style={[scr.footer, { paddingBottom: footerPadding }]}>
            {!seatInfo?.seat && cartItems.length > 0 && (
              <Text style={scr.hint}>Select a seat to continue</Text>
            )}
            <TouchableOpacity
              style={[scr.placeBtn, (!canPlace || orderCreating) && scr.placeBtnOff]}
              onPress={validateAndPlace}
              disabled={orderCreating}
              activeOpacity={0.85}
            >
              <Text style={scr.placeTxt}>
                {orderCreating ? 'Placing Order…' : `Place Order  ·  ₹${Math.round(total)}`}
              </Text>
              {!orderCreating && <Ionicons name="arrow-forward-circle" size={nz(22)} color={WHITE} />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SeatPickerSheet
        visible={showSeatPicker}
        seatingData={seatingData}
        onConfirm={info => { setSeatInfo(info); setSeatErr(''); }}
        onClose={() => setShowSeatPicker(false)}
        insets={insets}
      />

      {order && <SuccessSheet order={order} onDone={handleDone} insets={insets} />}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function CartHeader({ title, onBack }) {
  return (
    <View style={scr.header}>
      <TouchableOpacity onPress={onBack} style={scr.backBtn} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={nz(21)} color={TEXT1} />
      </TouchableOpacity>
      <Text style={scr.headerTitle}>{title}</Text>
      <View style={{ width: nz(40) }} />
    </View>
  );
}

function InputField({ icon, placeholder, value, onChange, keyboard, maxLen, multiline, error }) {
  return (
    <View style={{ marginBottom: nzVertical(10) }}>
      <View style={[inf.wrap, error && inf.wrapErr, multiline && { alignItems: 'flex-start', minHeight: nzVertical(80) }]}>
        <Ionicons name={icon} size={nz(17)} color={error ? RED : TEXT3} style={{ marginTop: multiline ? nzVertical(12) : 0 }} />
        <TextInput
          style={[inf.input, multiline && { height: '100%', textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={TEXT3}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard || 'default'}
          maxLength={maxLen}
          multiline={multiline}
          returnKeyType={multiline ? 'default' : 'done'}
          autoCapitalize={keyboard ? 'none' : 'sentences'}
          scrollEnabled={false}
        />
      </View>
      {error ? <Text style={inf.err}>{error}</Text> : null}
    </View>
  );
}
const inf = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: nz(10), backgroundColor: BG, borderRadius: nz(10), borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: nz(12), minHeight: nzVertical(50) },
  wrapErr: { borderColor: RED, backgroundColor: '#FFF5F5' },
  input: { flex: 1, fontSize: rs(14), color: TEXT1, paddingVertical: nzVertical(10) },
  err: { fontSize: rs(11), color: RED, marginTop: nzVertical(3), marginLeft: nz(4) },
});

function BillRow({ label, value, bold }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: nzVertical(5) }}>
      <Text style={{ fontSize: bold ? rs(15) : rs(13), fontWeight: bold ? '700' : '500', color: bold ? TEXT1 : TEXT2 }}>{label}</Text>
      <Text style={{ fontSize: bold ? rs(16) : rs(13), fontWeight: bold ? '700' : '600', color: bold ? PRIMARY : TEXT1 }}>{value}</Text>
    </View>
  );
}

const scr = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: nz(14), paddingVertical: nzVertical(12), backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { width: nz(40), height: nz(40), borderRadius: nz(20), backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: rs(17), fontWeight: '700', color: TEXT1 },
  scroll: { paddingHorizontal: nz(14), paddingTop: nzVertical(14) },

  seatCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY_PALE, borderRadius: nz(12), padding: nz(12), borderWidth: 1, borderColor: PRIMARY + '30', gap: nz(10) },
  seatCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: nz(10) },
  seatIconBox: { width: nz(38), height: nz(38), borderRadius: nz(19), backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  seatCardTitle: { fontSize: rs(13), fontWeight: '700', color: TEXT1, flexShrink: 1 },
  seatCardSub: { fontSize: rs(11), color: TEXT3, marginTop: nzVertical(2) },
  changeBtn: { backgroundColor: PRIMARY_LIGHT, borderRadius: nz(8), paddingHorizontal: nz(12), paddingVertical: nzVertical(8), borderWidth: 1, borderColor: PRIMARY + '40', flexShrink: 0 },
  changeTxt: { fontSize: rs(12), fontWeight: '700', color: PRIMARY },

  seatPrompt: { flexDirection: 'row', alignItems: 'center', gap: nz(12), backgroundColor: PRIMARY_PALE, borderRadius: nz(12), padding: nz(14), borderWidth: 1.5, borderColor: PRIMARY + '30', borderStyle: 'dashed' },
  seatPromptIcon: { width: nz(46), height: nz(46), borderRadius: nz(23), backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  seatPromptTitle: { fontSize: rs(14), fontWeight: '700', color: PRIMARY },
  seatPromptSub: { fontSize: rs(12), color: TEXT3, marginTop: nzVertical(2) },

  seatErrTxt: { fontSize: rs(11), color: RED, marginTop: nzVertical(6), marginLeft: nz(4) },

  payRow: { flexDirection: 'row', gap: nz(10) },
  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: nz(6), borderWidth: 1.5, borderColor: BORDER, borderRadius: nz(10), paddingVertical: nzVertical(11), backgroundColor: WHITE },
  payBtnOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  payLbl: { fontSize: rs(12), fontWeight: '600', color: TEXT2 },

  footer: { paddingHorizontal: nz(16), paddingTop: nzVertical(10), backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER },
  hint: { fontSize: rs(12), color: RED, textAlign: 'center', marginBottom: nzVertical(6) },
  placeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: nz(10), backgroundColor: PRIMARY, borderRadius: nz(14), paddingVertical: nzVertical(15), marginBottom: nzVertical(16), shadowColor: PRIMARY, shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  placeBtnOff: { backgroundColor: '#C0C0C0', shadowOpacity: 0 },
  placeTxt: { fontSize: rs(16), fontWeight: '700', color: WHITE },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: nzVertical(12), paddingHorizontal: nz(40) },
  emptyTitle: { fontSize: rs(20), fontWeight: '700', color: TEXT1 },
  emptySub: { fontSize: rs(14), color: TEXT3, textAlign: 'center' },
  emptyBtn: { marginTop: nzVertical(8), backgroundColor: PRIMARY, paddingHorizontal: nz(28), paddingVertical: nzVertical(12), borderRadius: nz(12) },
  emptyBtnTxt: { fontSize: rs(14), fontWeight: '700', color: WHITE },
});