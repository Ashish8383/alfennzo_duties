import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { nz } from '../../utils/responsive';

const TEXT_LIGHT = '#999999';

export default function DefaultImage({ size = nz(80) }) {
  return (
    <View style={[styles.defaultImage, { width: size, height: size }]}>
      <MaterialCommunityIcons name="food" size={nz(32)} color={TEXT_LIGHT} />
    </View>
  );
}

const styles = StyleSheet.create({
  defaultImage: {
    borderRadius: nz(12),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});