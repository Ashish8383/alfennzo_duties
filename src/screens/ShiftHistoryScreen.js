// src/screens/ShiftHistoryScreen.js
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import useUIStore from '../stores/uiStore';
import colors from '../utils/colors';
import { isTablet, nz, nzVertical, rs } from '../utils/responsive';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function formatTime(dateStr) {
    const d = new Date(dateStr);
    const h = d.getHours();
    const m = pad(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${pad(h % 12 || 12)}:${m} ${ampm}`;
}

function toYMD(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getMonthRange(year, month) {
    const start = `${year}-${pad(month + 1)}-01`;
    const end = `${year}-${pad(month + 1)}-${pad(getDaysInMonth(year, month))}`;
    return { start, end };
}

function parseDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${pad(m)}m`;
    if (m > 0) return `${m}m ${pad(s)}s`;
    return `${s}s`;
}

// ─── Skeleton Components ──────────────────────────────────────────────────────
const SkeletonBox = ({ width, height, borderRadius = nz(6), style }) => {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const opacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: '#E0E0E0',
                    opacity,
                },
                style,
            ]}
        />
    );
};

const SkeletonSummaryCard = ({ delay = 0 }) => (
    <View style={skStyles.summaryCard}>
        <SkeletonBox width={nz(40)} height={nz(40)} borderRadius={nz(12)} style={{ marginBottom: nzVertical(2) }} />
        <SkeletonBox width={nz(50)} height={nzVertical(16)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(4) }} />
        <SkeletonBox width={nz(40)} height={nzVertical(10)} borderRadius={nz(4)} />
    </View>
);

const SkeletonDayCell = () => (
    <View style={skStyles.dayCell}>
        <SkeletonBox width={nz(24)} height={nz(24)} borderRadius={nz(6)} />
    </View>
);

const SkeletonCalendar = () => (
    <View style={skStyles.calendarCard}>
        {/* Day headers */}
        <View style={skStyles.calendarDayHeaders}>
            {DAYS_SHORT.map((_, idx) => (
                <SkeletonBox key={idx} width={nz(30)} height={nzVertical(11)} borderRadius={nz(4)} />
            ))}
        </View>

        {/* Day cells - 6 rows of 7 days */}
        <View style={skStyles.calendarGrid}>
            {Array.from({ length: 42 }).map((_, idx) => (
                <SkeletonDayCell key={idx} />
            ))}
        </View>

        {/* Legend */}
        <View style={skStyles.legend}>
            {[1, 2, 3].map((_, idx) => (
                <View key={idx} style={skStyles.legendItem}>
                    <SkeletonBox width={nz(10)} height={nz(10)} borderRadius={nz(5)} />
                    <SkeletonBox width={nz(40)} height={nzVertical(11)} borderRadius={nz(4)} />
                </View>
            ))}
        </View>
    </View>
);

const SkeletonShiftItem = () => (
    <View style={skStyles.shiftCard}>
        <View style={skStyles.shiftCardHeader}>
            <SkeletonBox width={nz(100)} height={nzVertical(14)} borderRadius={nz(4)} />
            <SkeletonBox width={nz(70)} height={nzVertical(24)} borderRadius={nz(20)} />
        </View>
        <View style={skStyles.timesRow}>
            <View style={skStyles.timeBlock}>
                <SkeletonBox width={nz(50)} height={nzVertical(10)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(4) }} />
                <SkeletonBox width={nz(70)} height={nzVertical(14)} borderRadius={nz(4)} />
            </View>
            <SkeletonBox width={nz(20)} height={nzVertical(14)} borderRadius={nz(4)} />
            <View style={skStyles.timeBlock}>
                <SkeletonBox width={nz(50)} height={nzVertical(10)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(4) }} />
                <SkeletonBox width={nz(70)} height={nzVertical(14)} borderRadius={nz(4)} />
            </View>
            <SkeletonBox width={nz(60)} height={nzVertical(26)} borderRadius={nz(20)} />
        </View>
    </View>
);

const SkeletonShiftList = () => (
    <View style={skStyles.listSection}>
        <SkeletonBox width={nz(120)} height={nzVertical(13)} borderRadius={nz(4)} style={{ marginBottom: nzVertical(8), marginLeft: nz(4) }} />
        {[1, 2, 3, 4].map((_, idx) => (
            <View key={idx} style={skStyles.shiftRow}>
                <View style={skStyles.timelineCol}>
                    <SkeletonBox width={nz(12)} height={nz(12)} borderRadius={nz(6)} />
                    <View style={{ flex: 1, width: 1.5, backgroundColor: '#E0E0E0', marginTop: nzVertical(4) }} />
                </View>
                <SkeletonShiftItem />
            </View>
        ))}
    </View>
);

const ShiftHistorySkeleton = () => (
    <ScrollView
        style={skStyles.scroll}
        contentContainerStyle={skStyles.scrollContent}
        showsVerticalScrollIndicator={false}
    >
        {/* Month picker skeleton */}
        <View style={skStyles.monthPicker}>
            <SkeletonBox width={nz(36)} height={nz(36)} borderRadius={nz(10)} />
            <SkeletonBox width={nz(120)} height={nzVertical(20)} borderRadius={nz(4)} />
            <SkeletonBox width={nz(36)} height={nz(36)} borderRadius={nz(10)} />
        </View>

        {/* Summary cards */}
        <View style={skStyles.summaryRow}>
            {[0, 80, 160, 240].map((delay, idx) => (
                <SkeletonSummaryCard key={idx} delay={delay} />
            ))}
        </View>

        {/* Tab toggle */}
        <View style={skStyles.tabToggle}>
            <SkeletonBox width="48%" height={nzVertical(40)} borderRadius={nz(10)} />
            <SkeletonBox width="48%" height={nzVertical(40)} borderRadius={nz(10)} />
        </View>

        {/* Calendar skeleton (default view) */}
        <SkeletonCalendar />

        {/* List skeleton (hidden initially) */}
        <SkeletonShiftList />
    </ScrollView>
);

const skStyles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: '#F5F6FA' },
    scrollContent: {
        paddingHorizontal: nz(16),
        paddingTop: nzVertical(16),
        gap: nzVertical(14),
    },
    monthPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        borderRadius: nz(16),
        paddingHorizontal: nz(16),
        paddingVertical: nzVertical(14),
    },
    summaryRow: {
        flexDirection: 'row',
        gap: nz(10),
    },
    summaryCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: nz(14),
        paddingVertical: nzVertical(14),
        alignItems: 'center',
        gap: nzVertical(6),
    },
    tabToggle: {
        flexDirection: 'row',
        backgroundColor: colors.primary + '12',
        borderRadius: nz(14),
        padding: nz(4),
        gap: nz(8),
    },
    calendarCard: {
        backgroundColor: colors.white,
        borderRadius: nz(20),
        padding: nz(16),
    },
    calendarDayHeaders: {
        flexDirection: 'row',
        marginBottom: nzVertical(8),
        justifyContent: 'space-around',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: nzVertical(14),
        gap: nz(20),
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(6),
    },
    listSection: {
        gap: nzVertical(4),
    },
    shiftRow: {
        flexDirection: 'row',
        gap: nz(10),
        marginBottom: nzVertical(4),
    },
    timelineCol: {
        alignItems: 'center',
        paddingTop: nzVertical(16),
        width: nz(16),
    },
    shiftCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: nz(16),
        padding: nz(14),
        marginBottom: nzVertical(8),
    },
    shiftCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: nzVertical(12),
    },
    timesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(6),
    },
    timeBlock: {
        flex: 1,
    },
});

// ─── Animated Summary Card ────────────────────────────────────────────────────
function SummaryCard({ icon, label, value, color, delay }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            delay,
            bounciness: 8,
            speed: 12,
        }).start();
    }, []);

    return (
        <Animated.View style={[
            styles.summaryCard,
            {
                opacity: anim,
                transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            }
        ]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={nz(22)} color={color} />
            </View>
            <Text style={styles.summaryValue}>{value}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
        </Animated.View>
    );
}

// ─── Calendar Day Cell ────────────────────────────────────────────────────────
function DayCell({ day, status, isToday, onPress }) {
    const isPast = status === 'present' || status === 'absent';
    const isPresent = status === 'present';
    const isAbsent = status === 'absent';

    return (
        <TouchableOpacity
            style={[
                styles.dayCell,
                isPresent && styles.dayCellPresent,
                isAbsent && styles.dayCellAbsent,
                isToday && styles.dayCellToday,
            ]}
            onPress={onPress}
            activeOpacity={isPast ? 0.7 : 1}
            disabled={!isPast}
        >
            <Text style={[
                styles.dayNum,
                isPresent && styles.dayNumPresent,
                isAbsent && styles.dayNumAbsent,
                isToday && !isPast && styles.dayNumToday,
            ]}>
                {day || ''}
            </Text>
            {isPresent && <View style={styles.presentDot} />}
            {isAbsent && <View style={styles.absentDot} />}
        </TouchableOpacity>
    );
}

// ─── Shift Day Group ──────────────────────────────────────────────────────────
function ShiftDayGroup({ date, shifts, index }) {
    const [expanded, setExpanded] = useState(true);
    const slideAnim = useRef(new Animated.Value(40)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 80, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 80, useNativeDriver: true }),
        ]).start();
    }, []);

    const totalSeconds = shifts.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    const d = new Date(date);
    const dayLabel = DAYS_SHORT[d.getDay()];
    const dateLabel = `${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;

    return (
        <Animated.View style={[
            styles.shiftRow,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
            <View style={styles.timelineCol}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineLine} />
            </View>

            <View style={styles.shiftCard}>
                <TouchableOpacity
                    style={styles.dayGroupHeader}
                    onPress={() => setExpanded(e => !e)}
                    activeOpacity={0.7}
                >
                    <View style={styles.dayGroupLeft}>
                        <View style={styles.dayBadge}>
                            <Text style={styles.dayBadgeDay}>{dayLabel}</Text>
                            <Text style={styles.dayBadgeNum}>{pad(d.getDate())}</Text>
                        </View>
                        <View>
                            <Text style={styles.dayGroupDate}>{dateLabel}</Text>
                            <View style={styles.dayGroupMeta}>
                                <MaterialCommunityIcons name="timer-outline" size={nz(12)} color={colors.primary} />
                                <Text style={styles.dayGroupTotal}>
                                    {parseDuration(totalSeconds)} total
                                </Text>
                                <View style={styles.dayGroupDot} />
                                <Text style={styles.dayGroupShiftCount}>
                                    {shifts.length} shift{shifts.length > 1 ? 's' : ''}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={nz(18)}
                        color={colors.textLight}
                    />
                </TouchableOpacity>

                {expanded && (
                    <>
                        <View style={styles.shiftListDivider} />
                        {shifts.map((shift, idx) => {
                            const isActive = shift.status === 'ACTIVE';
                            const clockOut = shift.clockOut ? new Date(shift.clockOut) : null;
                            return (
                                <View key={shift._id}>
                                    <View style={styles.shiftEntryHeader}>
                                        <View style={styles.shiftNumBadge}>
                                            <Text style={styles.shiftNumText}>#{idx + 1}</Text>
                                        </View>
                                        <View style={[
                                            styles.shiftStatusChip,
                                            isActive ? styles.shiftStatusActive : styles.shiftStatusDone,
                                        ]}>
                                            <View style={[
                                                styles.shiftStatusDot,
                                                { backgroundColor: isActive ? '#4CD964' : colors.primary },
                                            ]} />
                                            <Text style={[
                                                styles.shiftStatusText,
                                                { color: isActive ? '#2E7D32' : colors.primary },
                                            ]}>
                                                {isActive ? 'Active' : 'Completed'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.timesRow}>
                                        <View style={styles.timeBlock}>
                                            <Text style={styles.timeBlockLabel}>Clock In</Text>
                                            <View style={styles.timeBlockValue}>
                                                <Ionicons name="log-in-outline" size={nz(14)} color="#4CD964" />
                                                <Text style={styles.timeBlockTime}>{formatTime(shift.clockIn)}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.timeArrow}>
                                            <View style={styles.timeArrowLine} />
                                            <Ionicons name="chevron-forward" size={nz(14)} color={colors.border} />
                                        </View>

                                        <View style={styles.timeBlock}>
                                            <Text style={styles.timeBlockLabel}>Clock Out</Text>
                                            <View style={styles.timeBlockValue}>
                                                <Ionicons
                                                    name="log-out-outline"
                                                    size={nz(14)}
                                                    color={clockOut ? '#E53935' : colors.textLighter}
                                                />
                                                <Text style={[
                                                    styles.timeBlockTime,
                                                    !clockOut && { color: colors.textLighter },
                                                ]}>
                                                    {clockOut ? formatTime(shift.clockOut) : 'Active'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.durationPill}>
                                            <MaterialCommunityIcons name="timer-outline" size={nz(13)} color={colors.primary} />
                                            <Text style={styles.durationText}>
                                                {parseDuration(shift.durationSeconds)}
                                            </Text>
                                        </View>
                                    </View>

                                    {idx < shifts.length - 1 && <View style={styles.shiftEntryDivider} />}
                                </View>
                            );
                        })}
                    </>
                )}
            </View>
        </Animated.View>
    );
}

// ─── Month Picker ─────────────────────────────────────────────────────────────
function MonthPicker({ year, month, onPrev, onNext }) {
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    return (
        <View style={styles.monthPicker}>
            <TouchableOpacity style={styles.monthArrow} onPress={onPrev} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={nz(20)} color={colors.black} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
                {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity
                style={[styles.monthArrow, isCurrentMonth && { opacity: 0.3 }]}
                onPress={onNext}
                activeOpacity={0.7}
                disabled={isCurrentMonth}
            >
                <Ionicons name="chevron-forward" size={nz(20)} color={colors.black} />
            </TouchableOpacity>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ShiftHistoryScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { fetchDutyHistory, dutyHistory, dutyHistoryLoading, dutyHistoryError } = useUIStore();
    const TAB_BAR_HEIGHT = nzVertical(72) + (insets.bottom > 0 ? insets.bottom : nzVertical(12));

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [activeTab, setActiveTab] = useState('calendar');
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const load = useCallback(async () => {
        const { start, end } = getMonthRange(year, month);
        await fetchDutyHistory(start, end);
        setIsInitialLoad(false);
    }, [year, month]);

    useEffect(() => {
        load();
    }, [load]);

    const goToPrev = () => {
        if (month === 0) { setYear(y => y - 1); setMonth(11); }
        else setMonth(m => m - 1);
    };

    const goToNext = () => {
        const n = new Date();
        if (year === n.getFullYear() && month === n.getMonth()) return;
        if (month === 11) { setYear(y => y + 1); setMonth(0); }
        else setMonth(m => m + 1);
    };

    const shiftsByDate = useMemo(() => {
        const map = {};
        if (!dutyHistory?.history) return map;
        dutyHistory.history.forEach(shift => {
            const key = toYMD(new Date(shift.clockIn));
            if (!map[key]) map[key] = [];
            map[key].push(shift);
        });
        return map;
    }, [dutyHistory]);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const total = getDaysInMonth(year, month);
        const today = toYMD(now);
        const cells = [];

        for (let i = 0; i < firstDay; i++) cells.push({ day: null, status: 'empty' });

        for (let d = 1; d <= total; d++) {
            const key = `${year}-${pad(month + 1)}-${pad(d)}`;
            const isT = key === today;
            const isFuture = key > today;
            let status = 'future';
            if (!isFuture) {
                status = shiftsByDate[key] ? 'present' : 'absent';
            }
            cells.push({ day: d, date: key, status, isToday: isT });
        }
        return cells;
    }, [year, month, shiftsByDate]);

    const summary = dutyHistory?.summary;
    const history = dutyHistory?.history || [];

    const presentDays = useMemo(() => {
        const today = toYMD(now);
        return Object.keys(shiftsByDate).filter(d => d <= today).length;
    }, [shiftsByDate]);

    const totalPastDays = useMemo(() => {
        const today = toYMD(now);
        let count = 0;
        for (let d = 1; d <= getDaysInMonth(year, month); d++) {
            const key = `${year}-${pad(month + 1)}-${pad(d)}`;
            if (key <= today) count++;
        }
        return count;
    }, [year, month]);

    const absentDays = totalPastDays - presentDays;

    function groupShiftsByDate(history) {
        const groups = {};
        history.forEach(shift => {
            const key = toYMD(new Date(shift.clockIn));
            if (!groups[key]) groups[key] = [];
            groups[key].push(shift);
        });
        return Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, shifts]) => ({ date, shifts }));
    }

    // Show skeleton during initial load
    if (isInitialLoad && dutyHistoryLoading) {
        return (
            <>
                <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
                <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => navigation?.goBack()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={nz(24)} color={colors.black} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Shift History</Text>
                        <View style={styles.refreshBtn}>
                            <Ionicons name="refresh-outline" size={nz(22)} color={colors.primary} />
                        </View>
                    </View>
                    <ShiftHistorySkeleton />
                </SafeAreaView>
            </>
        );
    }

    return (
        <>
            <StatusBar style="dark" translucent={false} backgroundColor={colors.white} />
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation?.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={nz(24)} color={colors.black} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Shift History</Text>
                    <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.7}>
                        <Ionicons name="refresh-outline" size={nz(22)} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: TAB_BAR_HEIGHT + nzVertical(20) },
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={dutyHistoryLoading && !isInitialLoad}
                            onRefresh={load}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                >
                    <MonthPicker
                        year={year}
                        month={month}
                        onPrev={goToPrev}
                        onNext={goToNext}
                    />

                    {dutyHistoryError ? (
                        <View style={styles.errorWrap}>
                            <Ionicons name="cloud-offline-outline" size={nz(44)} color={colors.border} />
                            <Text style={styles.errorTitle}>Couldn't load data</Text>
                            <Text style={styles.errorSub}>{dutyHistoryError}</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.8}>
                                <Text style={styles.retryBtnText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={styles.summaryRow}>
                                <SummaryCard
                                    icon="time-outline"
                                    label="Total Hours"
                                    value={summary?.totalActiveHours || '0h 0m'}
                                    color={colors.primary}
                                    delay={0}
                                />
                                <SummaryCard
                                    icon="checkmark-circle-outline"
                                    label="Present"
                                    value={presentDays}
                                    color="#4CD964"
                                    delay={80}
                                />
                                <SummaryCard
                                    icon="close-circle-outline"
                                    label="Absent"
                                    value={absentDays}
                                    color="#E53935"
                                    delay={160}
                                />
                                <SummaryCard
                                    icon="repeat-outline"
                                    label="Shifts"
                                    value={summary?.totalShifts || 0}
                                    color="#F5A623"
                                    delay={240}
                                />
                            </View>

                            <View style={styles.tabToggle}>
                                <TouchableOpacity
                                    style={[styles.tabToggleBtn, activeTab === 'calendar' && styles.tabToggleBtnActive]}
                                    onPress={() => setActiveTab('calendar')}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={nz(15)}
                                        color={activeTab === 'calendar' ? colors.white : colors.primary}
                                    />
                                    <Text style={[
                                        styles.tabToggleText,
                                        activeTab === 'calendar' && styles.tabToggleTextActive,
                                    ]}>
                                        Calendar
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tabToggleBtn, activeTab === 'list' && styles.tabToggleBtnActive]}
                                    onPress={() => setActiveTab('list')}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name="list-outline"
                                        size={nz(15)}
                                        color={activeTab === 'list' ? colors.white : colors.primary}
                                    />
                                    <Text style={[
                                        styles.tabToggleText,
                                        activeTab === 'list' && styles.tabToggleTextActive,
                                    ]}>
                                        Shifts
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {activeTab === 'calendar' && (
                                <View style={styles.calendarCard}>
                                    <View style={styles.calendarDayHeaders}>
                                        {DAYS_SHORT.map(d => (
                                            <Text key={d} style={styles.calendarDayHeader}>{d}</Text>
                                        ))}
                                    </View>

                                    <View style={styles.calendarGrid}>
                                        {calendarDays.map((cell, idx) => (
                                            <DayCell
                                                key={idx}
                                                day={cell.day}
                                                status={cell.status}
                                                isToday={cell.isToday}
                                                onPress={() => {
                                                    if (cell.status === 'present') setActiveTab('list');
                                                }}
                                            />
                                        ))}
                                    </View>

                                    <View style={styles.legend}>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                                            <Text style={styles.legendText}>Present</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#FFCDD2' }]} />
                                            <Text style={styles.legendText}>Absent</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#F0F0F0' }]} />
                                            <Text style={styles.legendText}>Future</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {activeTab === 'list' && (
                                <View style={styles.listSection}>
                                    {history.length === 0 ? (
                                        <View style={styles.emptyWrap}>
                                            <MaterialCommunityIcons name="clock-remove-outline" size={nz(52)} color={colors.border} />
                                            <Text style={styles.emptyTitle}>No shifts this month</Text>
                                            <Text style={styles.emptySub}>Your recorded shifts will appear here.</Text>
                                        </View>
                                    ) : (() => {
                                        const grouped = groupShiftsByDate(history);
                                        return (
                                            <>
                                                <Text style={styles.listSectionTitle}>
                                                    {grouped.length} day{grouped.length !== 1 ? 's' : ''} · {history.length} total shifts
                                                </Text>
                                                {grouped.map(({ date, shifts }, idx) => (
                                                    <ShiftDayGroup key={date} date={date} shifts={shifts} index={idx} />
                                                ))}
                                            </>
                                        );
                                    })()}
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: nz(16),
        paddingVertical: nzVertical(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.white,
    },
    backBtn: {
        width: nz(38),
        height: nz(38),
        borderRadius: nz(12),
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: rs(isTablet ? 20 : 17),
        fontWeight: '700',
        color: colors.black,
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    },
    refreshBtn: {
        width: nz(38),
        height: nz(38),
        borderRadius: nz(12),
        backgroundColor: colors.primary + '12',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: { flex: 1, backgroundColor: '#F5F6FA' },
    scrollContent: {
        paddingHorizontal: nz(16),
        paddingTop: nzVertical(16),
        gap: nzVertical(14),
    },
    monthPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        borderRadius: nz(16),
        paddingHorizontal: nz(16),
        paddingVertical: nzVertical(14),
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    monthArrow: {
        width: nz(36),
        height: nz(36),
        borderRadius: nz(10),
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthLabel: {
        fontSize: rs(16),
        fontWeight: '700',
        color: colors.black,
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    },
    summaryRow: {
        flexDirection: 'row',
        gap: nz(10),
    },
    summaryCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: nz(14),
        paddingVertical: nzVertical(14),
        alignItems: 'center',
        gap: nzVertical(6),
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryIconWrap: {
        width: nz(40),
        height: nz(40),
        borderRadius: nz(12),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: nzVertical(2),
    },
    summaryValue: {
        fontSize: rs(isTablet ? 16 : 13),
        fontWeight: '700',
        color: colors.black,
        textAlign: 'center',
    },
    summaryLabel: {
        fontSize: rs(10),
        color: colors.textLighter,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    },
    tabToggle: {
        flexDirection: 'row',
        backgroundColor: colors.primary + '12',
        borderRadius: nz(14),
        padding: nz(4),
    },
    tabToggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: nzVertical(10),
        borderRadius: nz(10),
        gap: nz(6),
    },
    tabToggleBtnActive: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    tabToggleText: {
        fontSize: rs(14),
        fontWeight: '600',
        color: colors.primary,
    },
    tabToggleTextActive: {
        color: colors.white,
    },
    calendarCard: {
        backgroundColor: colors.white,
        borderRadius: nz(20),
        padding: nz(16),
        shadowColor: '#000',
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 4,
    },
    calendarDayHeaders: {
        flexDirection: 'row',
        marginBottom: nzVertical(8),
    },
    calendarDayHeader: {
        flex: 1,
        textAlign: 'center',
        fontSize: rs(11),
        fontWeight: '600',
        color: colors.textLighter,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: nz(10),
        marginVertical: nzVertical(2),
    },
    dayCellPresent: {
        backgroundColor: colors.primary + '18',
    },
    dayCellAbsent: {
        backgroundColor: '#FFEBEE',
    },
    dayCellToday: {
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    dayNum: {
        fontSize: rs(13),
        fontWeight: '500',
        color: colors.text,
    },
    dayNumPresent: {
        color: colors.primary,
        fontWeight: '700',
    },
    dayNumAbsent: {
        color: '#E53935',
        fontWeight: '600',
    },
    dayNumToday: {
        color: colors.primary,
        fontWeight: '700',
    },
    presentDot: {
        width: nz(4),
        height: nz(4),
        borderRadius: nz(2),
        backgroundColor: colors.primary,
        marginTop: nzVertical(2),
    },
    absentDot: {
        width: nz(4),
        height: nz(4),
        borderRadius: nz(2),
        backgroundColor: '#E53935',
        marginTop: nzVertical(2),
    },
    dayGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dayGroupLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(12),
    },
    dayBadge: {
        width: nz(44),
        height: nz(44),
        borderRadius: nz(12),
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayBadgeDay: {
        fontSize: rs(10),
        fontWeight: '600',
        color: colors.primary,
    },
    dayBadgeNum: {
        fontSize: rs(16),
        fontWeight: '800',
        color: colors.primary,
    },
    dayGroupDate: {
        fontSize: rs(13),
        fontWeight: '700',
        color: colors.black,
        marginBottom: nzVertical(3),
    },
    dayGroupMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(4),
    },
    dayGroupTotal: {
        fontSize: rs(11),
        fontWeight: '600',
        color: colors.primary,
    },
    dayGroupDot: {
        width: nz(3),
        height: nz(3),
        borderRadius: nz(1.5),
        backgroundColor: colors.textLighter,
    },
    dayGroupShiftCount: {
        fontSize: rs(11),
        color: colors.textLight,
    },
    shiftListDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: nzVertical(12),
    },
    shiftEntryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: nzVertical(8),
    },
    shiftNumBadge: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: nz(8),
        paddingVertical: nzVertical(3),
        borderRadius: nz(6),
    },
    shiftNumText: {
        fontSize: rs(11),
        fontWeight: '700',
        color: colors.textLight,
    },
    shiftEntryDivider: {
        height: 1,
        backgroundColor: '#F5F5F5',
        marginVertical: nzVertical(12),
        borderStyle: 'dashed',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: nzVertical(14),
        gap: nz(20),
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(6),
    },
    legendDot: {
        width: nz(10),
        height: nz(10),
        borderRadius: nz(5),
    },
    legendText: {
        fontSize: rs(11),
        color: colors.textLight,
    },
    listSection: { gap: nzVertical(4) },
    listSectionTitle: {
        fontSize: rs(13),
        fontWeight: '600',
        color: colors.textLight,
        marginBottom: nzVertical(4),
        marginLeft: nz(4),
    },
    shiftRow: {
        flexDirection: 'row',
        gap: nz(10),
        marginBottom: nzVertical(4),
    },
    timelineCol: {
        alignItems: 'center',
        paddingTop: nzVertical(16),
        width: nz(16),
    },
    timelineDot: {
        width: nz(12),
        height: nz(12),
        borderRadius: nz(6),
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.white,
        shadowColor: colors.primary,
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
    timelineLine: {
        flex: 1,
        width: 1.5,
        backgroundColor: colors.border,
        marginTop: nzVertical(4),
    },
    shiftCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: nz(16),
        padding: nz(14),
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: nzVertical(8),
    },
    shiftCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: nzVertical(12),
    },
    shiftDateChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(4),
    },
    shiftDateText: {
        fontSize: rs(12),
        fontWeight: '600',
        color: colors.text,
    },
    shiftStatusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(4),
        paddingHorizontal: nz(10),
        paddingVertical: nzVertical(4),
        borderRadius: nz(20),
    },
    shiftStatusActive: { backgroundColor: '#E8F5E9' },
    shiftStatusDone: { backgroundColor: colors.primary + '12' },
    shiftStatusDot: {
        width: nz(6),
        height: nz(6),
        borderRadius: nz(3),
    },
    shiftStatusText: {
        fontSize: rs(11),
        fontWeight: '700',
    },
    timesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(6),
    },
    timeBlock: { flex: 1 },
    timeBlockLabel: {
        fontSize: rs(10),
        color: colors.textLighter,
        marginBottom: nzVertical(3),
    },
    timeBlockValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(4),
    },
    timeBlockTime: {
        fontSize: rs(13),
        fontWeight: '700',
        color: colors.black,
    },
    timeArrow: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeArrowLine: {
        width: nz(16),
        height: 1,
        backgroundColor: colors.border,
    },
    durationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: nz(3),
        backgroundColor: colors.primary + '12',
        paddingHorizontal: nz(8),
        paddingVertical: nzVertical(5),
        borderRadius: nz(20),
    },
    durationText: {
        fontSize: rs(11),
        fontWeight: '700',
        color: colors.primary,
    },
    loadingWrap: {
        alignItems: 'center',
        paddingVertical: nzVertical(60),
        gap: nzVertical(12),
    },
    loadingText: {
        fontSize: rs(14),
        color: colors.textLight,
    },
    errorWrap: {
        alignItems: 'center',
        paddingVertical: nzVertical(50),
        gap: nzVertical(10),
    },
    errorTitle: {
        fontSize: rs(16),
        fontWeight: '700',
        color: colors.text,
    },
    errorSub: {
        fontSize: rs(13),
        color: colors.textLight,
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: nzVertical(8),
        backgroundColor: colors.primary,
        paddingHorizontal: nz(24),
        paddingVertical: nzVertical(12),
        borderRadius: nz(12),
    },
    retryBtnText: {
        fontSize: rs(14),
        fontWeight: '700',
        color: colors.white,
    },
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: nzVertical(50),
        gap: nzVertical(10),
    },
    emptyTitle: {
        fontSize: rs(16),
        fontWeight: '700',
        color: colors.text,
    },
    emptySub: {
        fontSize: rs(13),
        color: colors.textLight,
        textAlign: 'center',
    },
});