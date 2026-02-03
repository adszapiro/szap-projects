import { StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useEffect, useState, useCallback } from 'react';
import { getPortfolioStats, getAgentStatus, getRecentTrades, AgentTrade } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface PortfolioStats {
  portfolioValue: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  totalPnl: number;
  totalPnlPercent: number;
  tradesToday: number;
  winRate: number;
  activeStrategies: number;
}

interface AgentStatusData {
  isRunning: boolean;
  lastActivity: string | null;
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatusData | null>(null);
  const [recentTrades, setRecentTrades] = useState<AgentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, statusData, tradesData] = await Promise.all([
        getPortfolioStats(),
        getAgentStatus(),
        getRecentTrades(5),
      ]);
      setStats(statsData);
      setAgentStatus(statusData);
      setRecentTrades(tradesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
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

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Quant Dashboard</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: agentStatus?.isRunning ? colors.success : colors.danger }
          ]}>
            <Text style={styles.statusText}>
              {agentStatus?.isRunning ? 'LIVE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {stats?.activeStrategies || 0} strategies competing
        </Text>
      </View>

      {/* Portfolio Value Card */}
      <View style={[styles.card, styles.mainCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardLabel, { color: colors.muted }]}>Portfolio Value</Text>
        <Text style={[styles.portfolioValue, { color: colors.text }]}>
          {formatCurrency(stats?.portfolioValue || 0)}
        </Text>
        <View style={styles.pnlRow}>
          <Text style={[
            styles.pnlValue, 
            { color: (stats?.dailyPnl || 0) >= 0 ? colors.success : colors.danger }
          ]}>
            {formatCurrency(stats?.dailyPnl || 0)} today
          </Text>
          <Text style={[
            styles.pnlPercent,
            { color: (stats?.dailyPnlPercent || 0) >= 0 ? colors.success : colors.danger }
          ]}>
            ({formatPercent(stats?.dailyPnlPercent || 0)})
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(stats?.totalPnl || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Total P&L</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.tradesToday || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Trades Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {((stats?.winRate || 0) * 100).toFixed(0)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Win Rate</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.activeStrategies || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Strategies</Text>
        </View>
      </View>

      {/* Recent Trades */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Trades</Text>
        {recentTrades.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>No recent trades</Text>
        ) : (
          recentTrades.map((trade) => (
            <View key={trade.id} style={[styles.tradeRow, { borderBottomColor: colors.border }]}>
              <View style={styles.tradeLeft}>
                <View style={[
                  styles.tradeSide,
                  { backgroundColor: trade.side === 'buy' ? colors.success : colors.danger }
                ]}>
                  <Text style={styles.tradeSideText}>{trade.side.toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={[styles.tradeSymbol, { color: colors.text }]}>{trade.symbol}</Text>
                  <Text style={[styles.tradeQty, { color: colors.muted }]}>
                    {trade.qty} @ ${trade.price.toFixed(2)}
                  </Text>
                </View>
              </View>
              {trade.pnl !== null && (
                <Text style={[
                  styles.tradePnl,
                  { color: trade.pnl >= 0 ? colors.success : colors.danger }
                ]}>
                  {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.footer} />
    </ScrollView>
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
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  mainCard: {
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  portfolioValue: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  pnlValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  pnlPercent: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statCard: {
    width: '46%',
    margin: '2%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tradeSide: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tradeSideText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tradeSymbol: {
    fontSize: 16,
    fontWeight: '600',
  },
  tradeQty: {
    fontSize: 12,
  },
  tradePnl: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 40,
  },
});
