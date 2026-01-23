import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Dimensions,
} from "react-native";
import Body from "@teambuildr/react-native-body-highlighter";
import { LineChart } from "react-native-chart-kit";
import { Label } from "@/components/Label";
import { SafeAreaView } from "@/components/SafeAreaView";
import { analyticsService } from "@/services/analytics";
import {
  TotalIntensityResponse,
  IntensityOverTimeResponse,
} from "@/types/analytics";
import {
  convertToBodyHighlighterData,
  BodyPartData,
  BodySide,
} from "@/utils/muscleMapping";

type DateRange = "7d" | "30d";

function getDateRangeParams(range: DateRange): {
  start_date?: string;
  end_date?: string;
} {
  const now = new Date();
  const endDate = now.toISOString();

  switch (range) {
    case "7d": {
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start_date: startDate.toISOString(), end_date: endDate };
    }
    case "30d": {
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start_date: startDate.toISOString(), end_date: endDate };
    }
    default:
      return {};
  }
}

// Aggregate intensity data by date
function aggregateByDate(
  data: IntensityOverTimeResponse[]
): { date: string; intensity: number }[] {
  const grouped: Record<string, number> = {};

  for (const item of data) {
    const date = new Date(item.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    grouped[date] = (grouped[date] || 0) + item.intensity;
  }

  // Sort by date and return
  return Object.entries(grouped)
    .map(([date, intensity]) => ({ date, intensity }))
    .sort((a, b) => {
      // Parse dates for proper sorting
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
}

const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [side, setSide] = useState<BodySide>("front");
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rawData, setRawData] = useState<TotalIntensityResponse[]>([]);
  const [bodyData, setBodyData] = useState<BodyPartData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<
    IntensityOverTimeResponse[]
  >([]);

  const fetchData = useCallback(async () => {
    try {
      const params = getDateRangeParams(dateRange);
      const [totalData, overTimeData] = await Promise.all([
        analyticsService.getTotalIntensity(params),
        analyticsService.getIntensityOverTime(params),
      ]);
      setRawData(totalData);
      setTimeSeriesData(overTimeData);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setRawData([]);
      setTimeSeriesData([]);
    }
  }, [dateRange]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    const converted = convertToBodyHighlighterData(rawData, side);
    setBodyData(converted);
  }, [rawData, side]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const dateRangeOptions: { key: DateRange; label: string }[] = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
  ];

  // Prepare chart data
  const aggregatedData = aggregateByDate(timeSeriesData);
  const chartData = {
    labels:
      aggregatedData.length > 0
        ? aggregatedData.map((d) => d.date)
        : ["No data"],
    datasets: [
      {
        data:
          aggregatedData.length > 0
            ? aggregatedData.map((d) => d.intensity/10)
            : [0],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: isDark ? "#18181b" : "#ffffff",
    backgroundGradientFrom: isDark ? "#18181b" : "#ffffff",
    backgroundGradientTo: isDark ? "#18181b" : "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDark
        ? `rgba(161, 161, 170, ${opacity})`
        : `rgba(113, 113, 122, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#3b82f6",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: isDark ? "#27272a" : "#e4e4e7",
    },
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Body Highlighter */}
        <View className="items-center py-4">
          {loading ? (
            <View className="h-96 justify-center items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Label variant="body" color="secondary" styleClass="mt-4">
                Loading analytics...
              </Label>
            </View>
          ) : (
            <Body
              data={bodyData as any}
              gender="male"
              side={side}
              scale={1.5}
              colors={["#93c5fd", "#3b82f6", "#1d4ed8"]}
              frontOnly={false}
              backOnly={false}
              onBodyPartPress={() => {}}
            />
          )}
        </View>

        {/* Side Toggle */}
        <View className="flex-row justify-center px-4 py-2 gap-4">
          <TouchableOpacity
            onPress={() => setSide("front")}
            className={`py-2 px-6 rounded-full ${
              side === "front"
                ? "bg-blue-500"
                : isDark
                ? "bg-zinc-800"
                : "bg-zinc-200"
            }`}
          >
            <Label
              variant="body"
              weight={side === "front" ? "semibold" : "regular"}
              styleClass={side === "front" ? "text-white" : ""}
            >
              Front
            </Label>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSide("back")}
            className={`py-2 px-6 rounded-full ${
              side === "back"
                ? "bg-blue-500"
                : isDark
                ? "bg-zinc-800"
                : "bg-zinc-200"
            }`}
          >
            <Label
              variant="body"
              weight={side === "back" ? "semibold" : "regular"}
              styleClass={side === "back" ? "text-white" : ""}
            >
              Back
            </Label>
          </TouchableOpacity>
        </View>

        {/* Date Range Selector */}
        <View className="flex-row px-4 py-3 gap-2">
          {dateRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => setDateRange(option.key)}
              className={`flex-1 py-2 px-3 rounded-lg border ${
                dateRange === option.key
                  ? "bg-blue-500 border-blue-500"
                  : isDark
                  ? "bg-zinc-800 border-zinc-700"
                  : "bg-zinc-100 border-zinc-200"
              }`}
            >
              <Label
                variant="caption"
                weight={dateRange === option.key ? "semibold" : "regular"}
                styleClass={`text-center ${
                  dateRange === option.key ? "text-white" : ""
                }`}
              >
                {option.label}
              </Label>
            </TouchableOpacity>
          ))}
        </View>

        {/* Volume Over Time Chart */}
        {!loading && timeSeriesData.length > 0 && (
          <View className="px-4 pt-6">
            <Label variant="body" weight="semibold" styleClass="mb-3">
              Volume Over Time
            </Label>
            <View
              className={`overflow-hidden`}
            >
              <LineChart
                data={chartData}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={false}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                fromZero={true}
              />
            </View>
          </View>
        )}

        {/* Muscle Usage Percentage
        {!loading && rawData.length > 0 && (
          <View className="px-4 pt-6">
            <Label variant="body" weight="semibold" styleClass="mb-3">
              Muscle Usage Percentage
            </Label>
            <View
              className={`rounded-xl overflow-hidden ${
                isDark ? "bg-zinc-800" : "bg-zinc-50"
              }`}
            >
              {rawData
                .sort((a, b) => b.total_intensity - a.total_intensity)
                .slice(0, 8) // Show top 8 muscles
                .map((item, index) => {
                  const maxIntensity = Math.max(
                    ...rawData.map((r) => r.total_intensity)
                  );
                  const percentage =
                    (item.total_intensity / maxIntensity) * 100;

                  return (
                    <View
                      key={item.muscle}
                      className={`px-4 py-3 ${
                        index < Math.min(rawData.length, 8) - 1
                          ? isDark
                            ? "border-b border-zinc-700"
                            : "border-b border-zinc-200"
                          : ""
                      }`}
                    >
                      <View className="flex-row justify-between items-center mb-1">
                        <Label variant="body">{item.muscle}</Label>
                        <Label variant="caption" color="secondary">
                          {item.total_intensity.toFixed(1)}
                        </Label>
                      </View>
                      <View
                        className={`h-2 rounded-full ${
                          isDark ? "bg-zinc-700" : "bg-zinc-200"
                        }`}
                      >
                        <View
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )} */}

        {/* Empty State */}
        {!loading && rawData.length === 0 && (
          <View className="items-center py-8 px-4">
            <Label variant="body" color="secondary" styleClass="text-center">
              No workout data yet. Complete some workouts to see your muscle
              intensity analytics!
            </Label>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
