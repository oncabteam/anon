/**
 * OnCabaret Anonymous Intent Graph Dashboard
 * Real-time analytics and intent visualization
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChartBarIcon, 
  GlobeAltIcon, 
  UsersIcon, 
  EyeIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { format, subDays, subHours } from 'date-fns';
import clsx from 'clsx';

import { IntentHeatmap } from './IntentHeatmap';
import { RealTimeMetrics } from './RealTimeMetrics';
import { EventTypeChart } from './EventTypeChart';
import { PlatformBreakdown } from './PlatformBreakdown';
import { IntentTrendChart } from './IntentTrendChart';
import { SessionMetrics } from './SessionMetrics';
import { FiltersPanel } from './FiltersPanel';
import { ExportPanel } from './ExportPanel';
import { 
  GET_ANALYTICS_METRICS,
  GET_INTENT_TRENDS,
  LIVE_METRICS_SUBSCRIPTION,
  INTENT_TREND_SUBSCRIPTION 
} from '../graphql/queries';
import { useAnalyticsStore } from '../store/analyticsStore';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';

interface DashboardProps {
  className?: string;
}

const timeRangeOptions = [
  { label: 'Last Hour', value: '1h', hours: 1 },
  { label: 'Last 6 Hours', value: '6h', hours: 6 },
  { label: 'Last 24 Hours', value: '24h', hours: 24 },
  { label: 'Last 7 Days', value: '7d', hours: 24 * 7 },
  { label: 'Last 30 Days', value: '30d', hours: 24 * 30 }
];

export const Dashboard: React.FC<DashboardProps> = ({ className }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Global state
  const { 
    filters, 
    setFilters, 
    liveMetrics, 
    setLiveMetrics,
    intentTrends,
    setIntentTrends 
  } = useAnalyticsStore();

  // Calculate date range based on selected time range
  const { startDate, endDate } = useMemo(() => {
    const option = timeRangeOptions.find(opt => opt.value === selectedTimeRange);
    const end = new Date();
    const start = option 
      ? subHours(end, option.hours)
      : subDays(end, 1);
    
    return { startDate: start, endDate: end };
  }, [selectedTimeRange]);

  // Construct analytics filter
  const analyticsFilter = useMemo(() => ({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    platform: selectedPlatform || undefined,
    environment: 'PRODUCTION'
  }), [startDate, endDate, selectedPlatform]);

  // GraphQL queries
  const { 
    data: analyticsData, 
    loading: analyticsLoading, 
    error: analyticsError,
    refetch: refetchAnalytics 
  } = useQuery(GET_ANALYTICS_METRICS, {
    variables: { filter: analyticsFilter },
    pollInterval: 30000, // Poll every 30 seconds
    errorPolicy: 'partial'
  });

  const { 
    data: trendsData, 
    loading: trendsLoading 
  } = useQuery(GET_INTENT_TRENDS, {
    variables: { 
      filter: { 
        region: selectedRegion,
        timeRange: selectedTimeRange,
        platform: selectedPlatform,
        minConfidence: 0.6
      } 
    },
    pollInterval: 60000, // Poll every minute
    errorPolicy: 'partial'
  });

  // Real-time subscriptions
  const { data: liveMetricsData } = useSubscription(LIVE_METRICS_SUBSCRIPTION);
  const { data: trendUpdateData } = useSubscription(INTENT_TREND_SUBSCRIPTION, {
    variables: { region: selectedRegion }
  });

  // Update live metrics from subscription
  useEffect(() => {
    if (liveMetricsData?.liveMetricsUpdate) {
      setLiveMetrics(liveMetricsData.liveMetricsUpdate);
    }
  }, [liveMetricsData, setLiveMetrics]);

  // Update trends from subscription
  useEffect(() => {
    if (trendUpdateData?.intentTrendUpdate) {
      setIntentTrends(prev => {
        const updated = [...(prev || [])];
        const index = updated.findIndex(
          t => t.category === trendUpdateData.intentTrendUpdate.category
        );
        
        if (index >= 0) {
          updated[index] = trendUpdateData.intentTrendUpdate;
        } else {
          updated.push(trendUpdateData.intentTrendUpdate);
        }
        
        return updated;
      });
    }
  }, [trendUpdateData, setIntentTrends]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    setSelectedPlatform(newFilters.platform);
    setSelectedRegion(newFilters.region);
    refetchAnalytics();
  };

  if (analyticsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error loading dashboard</div>
          <div className="text-gray-600 text-sm">{analyticsError.message}</div>
          <button 
            onClick={() => refetchAnalytics()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={clsx("min-h-screen bg-gray-50", className)}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Anonymous Intent Dashboard
                  </h1>
                  <p className="text-gray-600 text-sm">
                    Real-time behavioral analytics • Privacy-first insights
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Time Range Selector */}
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {timeRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Filters Toggle */}
                <button
                  onClick={() => setIsFiltersOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span className="text-sm">Filters</span>
                </button>

                {/* Export Toggle */}
                <button
                  onClick={() => setIsExportOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                  <span className="text-sm">Export</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Live Metrics Row */}
          <div className="mb-8">
            <RealTimeMetrics 
              data={analyticsData?.getAnalyticsMetrics}
              liveData={liveMetrics}
              loading={analyticsLoading}
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Intent Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <GlobeAltIcon className="w-6 h-6 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Intent Heatmap
                    </h2>
                  </div>
                  <div className="text-sm text-gray-500">
                    Updated {format(new Date(), 'HH:mm:ss')}
                  </div>
                </div>
                
                <IntentHeatmap 
                  data={trendsData?.getIntentTrends || []}
                  loading={trendsLoading}
                  onRegionSelect={setSelectedRegion}
                  selectedRegion={selectedRegion}
                />
              </div>
            </motion.div>

            {/* Event Types Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <EyeIcon className="w-6 h-6 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Event Types
                  </h2>
                </div>
                
                <EventTypeChart 
                  data={analyticsData?.getAnalyticsMetrics?.topEventTypes || []}
                  loading={analyticsLoading}
                />
              </div>
            </motion.div>

            {/* Platform Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <DevicePhoneMobileIcon className="w-6 h-6 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Platform Breakdown
                  </h2>
                </div>
                
                <PlatformBreakdown 
                  data={analyticsData?.getAnalyticsMetrics?.platformBreakdown || []}
                  loading={analyticsLoading}
                  onPlatformSelect={setSelectedPlatform}
                  selectedPlatform={selectedPlatform}
                />
              </div>
            </motion.div>
          </div>

          {/* Trends and Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Intent Trends Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-orange-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Intent Trends
                  </h2>
                </div>
                
                <IntentTrendChart 
                  data={trendsData?.getIntentTrends || []}
                  loading={trendsLoading}
                  timeRange={selectedTimeRange}
                />
              </div>
            </motion.div>

            {/* Session Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <ClockIcon className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Session Insights
                  </h2>
                </div>
                
                <SessionMetrics 
                  data={analyticsData?.getAnalyticsMetrics}
                  loading={analyticsLoading}
                  timeRange={selectedTimeRange}
                />
              </div>
            </motion.div>
          </div>
        </main>

        {/* Filters Panel */}
        <AnimatePresence>
          {isFiltersOpen && (
            <FiltersPanel
              isOpen={isFiltersOpen}
              onClose={() => setIsFiltersOpen(false)}
              filters={filters}
              onChange={handleFiltersChange}
            />
          )}
        </AnimatePresence>

        {/* Export Panel */}
        <AnimatePresence>
          {isExportOpen && (
            <ExportPanel
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              data={analyticsData?.getAnalyticsMetrics}
              filters={analyticsFilter}
            />
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        <AnimatePresence>
          {analyticsLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50"
            >
              <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
                <LoadingSpinner size="sm" />
                <span className="text-gray-600">Loading analytics...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};