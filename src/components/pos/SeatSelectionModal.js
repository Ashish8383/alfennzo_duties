// components/pos/SeatSelectionModal.js
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../utils/colors';
import { nz, nzVertical, rs } from '../../utils/responsive';

const PRIMARY = colors.primary;
const PRIMARY_LIGHT = '#E8F5F2';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#666666';
const TEXT_LIGHT = '#999999';
const BORDER_COLOR = '#F0F0F0';

export default function SeatSelectionModal({ visible, seatingData, onClose, onConfirm }) {
  const insets = useSafeAreaInsets();
  const [selectedAudi, setSelectedAudi] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [audiSearch, setAudiSearch] = useState('');

  // Get screens from seatingData
  const screens = seatingData?.screens || [];
  
  // Filter screens by search
  const filteredScreens = useMemo(() => {
    if (!audiSearch) return screens;
    return screens.filter(s => s.audiNo?.toLowerCase().includes(audiSearch.toLowerCase()));
  }, [screens, audiSearch]);

  // Get rows for selected audi
  const selectedScreenData = screens.find(s => s.audiNo === selectedAudi);
  const rows = selectedScreenData?.lines || [];

  const handleConfirm = () => {
    if (selectedAudi && selectedSeat) {
      onConfirm({
        audi: selectedAudi,
        row: selectedRow,
        seat: selectedSeat,
      });
      onClose();
    }
  };

  const handleSelectAudi = (audiNo) => {
    setSelectedAudi(audiNo);
    setSelectedRow(null);
    setSelectedSeat(null);
  };

  const handleSelectRow = (rowLine) => {
    setSelectedRow(rowLine);
    setSelectedSeat(null);
  };

  const isValid = selectedAudi && selectedSeat;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + nzVertical(16) }]}>
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Seat</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={nz(24)} color={TEXT_LIGHT} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            {/* Audi Selection */}
            <Text style={styles.sectionTitle}>AUDI NUMBER</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Audi..."
              placeholderTextColor={TEXT_LIGHT}
              value={audiSearch}
              onChangeText={setAudiSearch}
            />
            <View style={styles.audiGrid}>
              {filteredScreens.length === 0 ? (
                <Text style={styles.noResultsText}>No auditoriums found</Text>
              ) : (
                filteredScreens.map(screen => (
                  <TouchableOpacity
                    key={screen.audiNo}
                    style={[
                      styles.audiCard,
                      selectedAudi === screen.audiNo && styles.audiCardActive
                    ]}
                    onPress={() => handleSelectAudi(screen.audiNo)}
                  >
                    <Text style={[
                      styles.audiCardText,
                      selectedAudi === screen.audiNo && styles.audiCardTextActive
                    ]}>
                      Audi {screen.audiNo}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Row Selection */}
            {selectedAudi && rows.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: nzVertical(16) }]}>ROW</Text>
                <View style={styles.rowGrid}>
                  {rows.map((rowData) => (
                    <TouchableOpacity
                      key={rowData.line}
                      style={[
                        styles.rowCard,
                        selectedRow === rowData.line && styles.rowCardActive
                      ]}
                      onPress={() => handleSelectRow(rowData.line)}
                    >
                      <Text style={[
                        styles.rowCardText,
                        selectedRow === rowData.line && styles.rowCardTextActive
                      ]}>
                        {rowData.line}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Seat Selection */}
            {selectedRow && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: nzVertical(16) }]}>SEAT</Text>
                <View style={styles.seatGrid}>
                  {rows
                    .find(r => r.line === selectedRow)
                    ?.seats.map(seat => (
                      <TouchableOpacity
                        key={seat}
                        style={[
                          styles.seatCard,
                          selectedSeat === seat && styles.seatCardActive
                        ]}
                        onPress={() => setSelectedSeat(seat)}
                      >
                        <Text style={[
                          styles.seatCardText,
                          selectedSeat === seat && styles.seatCardTextActive
                        ]}>
                          {seat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!isValid}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>
              {isValid ? `Confirm Seat ${selectedAudi} → ${selectedRow || ''} → ${selectedSeat}` : 'Select Audi, Row & Seat'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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
    paddingHorizontal: nz(20),
    paddingTop: nzVertical(12),
    maxHeight: '90%',
  },
  modalHandle: {
    width: nz(40),
    height: nz(4),
    borderRadius: nz(2),
    backgroundColor: BORDER_COLOR,
    alignSelf: 'center',
    marginBottom: nzVertical(16),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nzVertical(20),
  },
  modalTitle: {
    fontSize: rs(20),
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  modalScroll: {
    maxHeight: '70%',
  },
  sectionTitle: {
    fontSize: rs(14),
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: nzVertical(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: nz(10),
    paddingHorizontal: nz(14),
    paddingVertical: nzVertical(10),
    fontSize: rs(14),
    color: TEXT_PRIMARY,
    backgroundColor: colors.surface,
    marginBottom: nzVertical(12),
  },
  noResultsText: {
    fontSize: rs(14),
    color: TEXT_LIGHT,
    textAlign: 'center',
    paddingVertical: nzVertical(20),
  },
  audiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nz(8),
  },
  audiCard: {
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(10),
    borderRadius: nz(10),
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  audiCardActive: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  audiCardText: {
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  audiCardTextActive: {
    color: PRIMARY,
  },
  rowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nz(8),
  },
  rowCard: {
    paddingHorizontal: nz(16),
    paddingVertical: nzVertical(8),
    borderRadius: nz(8),
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowCardActive: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  rowCardText: {
    fontSize: rs(14),
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  rowCardTextActive: {
    color: PRIMARY,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nz(8),
  },
  seatCard: {
    minWidth: nz(50),
    paddingHorizontal: nz(12),
    paddingVertical: nzVertical(8),
    borderRadius: nz(8),
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  seatCardActive: {
    backgroundColor: PRIMARY,
  },
  seatCardText: {
    fontSize: rs(13),
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  seatCardTextActive: {
    color: colors.white,
  },
  confirmBtn: {
    backgroundColor: PRIMARY,
    borderRadius: nz(12),
    paddingVertical: nzVertical(16),
    alignItems: 'center',
    marginTop: nzVertical(16),
  },
  confirmBtnDisabled: {
    backgroundColor: TEXT_LIGHT,
  },
  confirmBtnText: {
    fontSize: rs(16),
    fontWeight: '700',
    color: colors.white,
  },
});