import { QueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buildFamilyMemberNameMap } from "@/lib/family-member-names";

interface FamilyMemberNamesResponse {
  members: Array<{
    userId: string;
    userName: string | null;
    userEmail: string;
  }>;
}

const EMPTY_MEMBER_NAME_MAP = new Map<string, string>();

export function familyMemberNamesQueryOptions(familyId: string) {
  return {
    queryKey: ["/api/family", familyId, "member-names"] as const,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/family/${familyId}/member-names`);
      return (await response.json()) as FamilyMemberNamesResponse;
    },
    staleTime: 5 * 60 * 1000,
    select: (data: FamilyMemberNamesResponse) => buildFamilyMemberNameMap(data.members),
  };
}

export function prefetchFamilyMemberNames(queryClient: QueryClient, familyId: string) {
  return queryClient.prefetchQuery({
    ...familyMemberNamesQueryOptions(familyId),
  });
}

export function useFamilyMemberNames(familyId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["/api/family", familyId ?? null, "member-names"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/family/${familyId}/member-names`);
      return (await response.json()) as FamilyMemberNamesResponse;
    },
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
    select: (data: FamilyMemberNamesResponse) => buildFamilyMemberNameMap(data.members),
  });

  return {
    memberNames: query.data ?? EMPTY_MEMBER_NAME_MAP,
    isReady: query.isSuccess,
  };
}
