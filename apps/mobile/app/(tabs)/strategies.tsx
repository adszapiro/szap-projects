import { StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useEffect, useState, useCallback } from 'react';
import { getStrategiesWithPerformance, StrategyWithPerformance } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function StrategiesScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  
  const [strategies, setStrategies] = useState<StrategyWithPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getStrategiesWithPerformance();
      setStrategies(data);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#fbbf24'; // Gold
    if (rank === 2) return '#9ca3af'; // Silver
    if (rank === 3) return '#cd7f32'; // Bronze
    return colors.muted;
  };

  const renderStrategy = ({ item: strategy }: { item: StrategyWithPerformance }) => {
    const perf = strategy.performance;
    const winRate = (strategy.expectedWinRate * 100).toFixed(0);
    const allocation = perf ? (perf.current_weight * 100).toFixed(1) : '0';
    const trades = perf?.total_trades || 0;
    const pnl = perf?.total_pnl || 0;

    return (
      <View style={[styles.strategyCard, { backgroundColor: colors.card }]}>
        {/* Rank Badge */}
        <View style={[styles.rankBadge, { backgroundColor: getRankColor(strategy.rank) }]}>
          <Text style={styles.rankText}>{strategy.rank}</Text>
        </View>

        <View style={styles.strategyContent}>
          {/* Header */}
          <View style={styles.strategyHeader}>
            <View style={styles.strategyNameContainer}>
              <Text style={[styles.strategyName, { color: colors.text }]} numberOfLines={1}>
                {strategy.name}
              </Text>
              <View style={[
                styles.assetBadge,
                { backgroundColor: strategy.asset_class === 'crypto' ? '#8b5cf6' : '#3b82f6' }
              ]}>
                <Text style={styles.assetBadgeText}>
                  {strategy.asset_class === 'crypto' ? 'CRYPTO' : 'STOCK'}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{winRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Win Rate</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{trades}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Trades</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[
                styles.statValue, 
                { color: pnl >= 0 ? colors.success : colors.danger }
              ]}>
                {formatCurrency(pnl)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>P&L</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.tint }]}>{allocation}%</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Allocation</Text>
            </View>
          </View>

          {/* Allocation Bar */}
          <View style={[styles.allocationBarBg, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.allocationBarFill, 
                { 
                  backgroundColor: colors.tint,
                  width: `${Math.min(parseFloat(allocation) * 10, 100)}%` 
                }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading strategies...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Strategy Leaderboard</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {strategies.length} strategies ranked by Thompson Sampling
        </Text>
      </View>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.background }]}>
        <Text style={[styles.legendText, { color: colors.muted }]}>
          Allocation is dynamically adjusted based on win/loss performance
        </Text>
      </View>

      {/* Strategies List */}
      <FlatList
        data={strategies}
        renderItem={renderStrategy}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>No strategies found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  legend: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  legendText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  strategyCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  rankBadge: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  strategyContent: {
    flex: 1,
    padding: 16,
  },
  strategyHeader: {
    marginBottom: 12,
  },
  strategyNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strategyName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  assetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  assetBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  allocationBarBg: {
    height: 4,
    borderRadius: 2,
  },
  allocationBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
