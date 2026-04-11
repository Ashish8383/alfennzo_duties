import { StyleSheet, View } from 'react-native';
import { nz } from '../../utils/responsive';

const SUCCESS = '#2E7D32';

export default function VegDot({ isVeg }) {
  const color = isVeg ? SUCCESS : '#E53935';
  return (
    <View style={[styles.vegDot, { borderColor: color }]}>
      <View style={[styles.vegDotInner, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  vegDot: {
    width: nz(12),
    height: nz(12),
    borderRadius: nz(3),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nz(6),
  },
  vegDotInner: {
    width: nz(5),
    height: nz(5),
    borderRadius: nz(2.5),
  },
});