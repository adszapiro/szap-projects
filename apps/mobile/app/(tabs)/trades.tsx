import { StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useEffect, useState, useCallback } from 'react';
import { getRecentTrades, AgentTrade } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type AssetFilter = 'all' | 'stock' | 'crypto';

export default function TradesScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  
  const [trades, setTrades] = useState<AgentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<AssetFilter>('all');

  const fetchData = useCallback(async () => {
    try {
      const data = await getRecentTrades(100);
      setTrades(data);
    } catch (error) {
      console.error('Error fetching trades:', error);
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

  const filteredTrades = trades.filter(trade => {
    if (filter === 'all') return true;
    return trade.asset_class === filter;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderTrade = ({ item: trade }: { item: AgentTrade }) => (
    <View style={[styles.tradeCard, { backgroundColor: colors.card }]}>
      <View style={styles.tradeHeader}>
        <View style={styles.tradeHeaderLeft}>
          <View style={[
            styles.sideBadge,
            { backgroundColor: trade.side === 'buy' ? colors.success : colors.danger }
          ]}>
            <Text style={styles.sideBadgeText}>{trade.side.toUpperCase()}</Text>
          </View>
          <View style={[
            styles.assetBadge,
            { backgroundColor: trade.asset_class === 'crypto' ? '#8b5cf6' : '#3b82f6' }
          ]}>
            <Text style={styles.assetBadgeText}>
              {trade.asset_class === 'crypto' ? 'CRYPTO' : 'STOCK'}
            </Text>
          </View>
        </View>
        <Text style={[styles.tradeTime, { color: colors.muted }]}>
          {formatTime(trade.created_at)}
        </Text>
      </View>

      <View style={styles.tradeBody}>
        <View>
          <Text style={[styles.tradeSymbol, { color: colors.text }]}>{trade.symbol}</Text>
          <Text style={[styles.tradeDetails, { color: colors.muted }]}>
            {trade.qty} shares @ {formatCurrency(trade.price)}
          </Text>
        </View>
        {trade.pnl !== null && (
          <View style={styles.pnlContainer}>
            <Text style={[
              styles.tradePnl,
              { color: trade.pnl >= 0 ? colors.success : colors.danger }
            ]}>
              {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
            </Text>
            {trade.pnl_percent !== null && (
              <Text style={[
                styles.tradePnlPercent,
                { color: trade.pnl >= 0 ? colors.success : colors.danger }
              ]}>
                {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
              </Text>
            )}
          </View>
        )}
      </View>

      {trade.reasoning && (
        <Text style={[styles.tradeReasoning, { color: colors.muted }]} numberOfLines={2}>
          {trade.reasoning}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading trades...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Trade History</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {filteredTrades.length} trades
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.background }]}>
        {(['all', 'stock', 'crypto'] as AssetFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && { backgroundColor: colors.tint }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText,
              { color: filter === f ? '#fff' : colors.muted }
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trades List */}
      <FlatList
        data={filteredTrades}
        renderItem={renderTrade}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>No trades found</Text>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  tradeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeHeaderLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sideBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  assetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  assetBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  tradeTime: {
    fontSize: 12,
  },
  tradeBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tradeSymbol: {
    fontSize: 18,
    fontWeight: '700',
  },
  tradeDetails: {
    fontSize: 13,
    marginTop: 2,
  },
  pnlContainer: {
    alignItems: 'flex-end',
  },
  tradePnl: {
    fontSize: 18,
    fontWeight: '700',
  },
  tradePnlPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  tradeReasoning: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
