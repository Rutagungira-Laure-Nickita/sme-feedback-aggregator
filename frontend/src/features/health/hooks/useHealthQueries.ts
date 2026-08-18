import { useQuery } from "@tanstack/react-query";
import { fetchApiHealth, fetchDatabaseHealth } from "../api/healthApi.js";

export function useApiHealthQuery() {
  return useQuery({
    queryKey: ["health", "api"],
    queryFn: fetchApiHealth
  });
}

export function useDatabaseHealthQuery() {
  return useQuery({
    queryKey: ["health", "database"],
    queryFn: fetchDatabaseHealth
  });
}
