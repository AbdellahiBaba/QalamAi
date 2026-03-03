import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

interface FeatureState {
  featureKey: string;
  name: string;
  description: string | null;
  enabled: boolean;
  disabledMessage: string | null;
}

export function useFeatures() {
  const { data: features = [], isLoading } = useQuery<FeatureState[]>({
    queryKey: ["/api/features"],
    staleTime: 60000,
  });

  const isEnabled = useCallback((key: string) => {
    const feature = features.find(f => f.featureKey === key);
    if (!feature) return true;
    return feature.enabled;
  }, [features]);

  const getDisabledMessage = useCallback((key: string) => {
    const feature = features.find(f => f.featureKey === key);
    return feature?.disabledMessage || "هذه الميزة قيد التطوير وستكون متاحة قريباً";
  }, [features]);

  return { features, isLoading, isEnabled, getDisabledMessage };
}
