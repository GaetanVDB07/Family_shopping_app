import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buildFamilyMemberNameMap } from "@/lib/family-member-names";

interface FamilyDetailsMembers {
  members: Array<{
    userId: string;
    userName: string | null;
    userEmail: string;
  }>;
}

const EMPTY_MEMBER_NAME_MAP = new Map<string, string>();

export function useFamilyMemberNames(familyId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["/api/family/details", familyId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/family/details/${familyId}`);
      return (await response.json()) as FamilyDetailsMembers;
    },
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
    select: (data) => buildFamilyMemberNameMap(data.members),
  });

  return {
    memberNames: query.data ?? EMPTY_MEMBER_NAME_MAP,
    isReady: query.isSuccess,
  };
}
