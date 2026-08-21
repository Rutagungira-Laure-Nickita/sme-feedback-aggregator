import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { fetchBranches, fetchBusiness, fetchMyBusinesses } from "./api/businessApi.js";
import { EmptyState } from "./components.js";
import { FeedbackInboxPage } from "./FeedbackInboxPage.js";

export function FeedbackInboxWrapper(): JSX.Element {
  const { businessId = "" } = useParams();

  const businessesQuery = useQuery({
    queryKey: ["businesses", "mine"],
    queryFn: () => fetchMyBusinesses({ pageSize: 100 })
  });

  const businessQuery = useQuery({
    queryKey: ["businesses", businessId],
    queryFn: () => fetchBusiness(businessId),
    enabled: Boolean(businessId)
  });

  const branchesQuery = useQuery({
    queryKey: ["businesses", businessId, "branches"],
    queryFn: () => fetchBranches(businessId),
    enabled: Boolean(businessId)
  });

  if (businessesQuery.isLoading || businessQuery.isLoading || branchesQuery.isLoading) {
    return (
      <main className="min-h-screen bg-app-background p-4 text-app-text sm:p-6 lg:p-8">
        <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-[1380px] rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)] sm:min-h-[calc(100vh-3rem)]">
          <div className="p-10">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 rounded bg-app-surface-muted" />
              <div className="h-4 w-96 rounded bg-app-surface-muted" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-app-surface-muted" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const businesses = businessesQuery.data?.businesses ?? [];
  const businessData = businessQuery.data;
  const branches = branchesQuery.data?.branches ?? [];

  if (!businessData) {
    return (
      <main className="min-h-screen bg-app-background p-4 text-app-text sm:p-6 lg:p-8">
        <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-[1380px] rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)] sm:min-h-[calc(100vh-3rem)]">
          <div className="p-10">
            <EmptyState
              title="Business not found"
              description={
                businessQuery.error
                  ? normalizeApiError(businessQuery.error).message
                  : "This business could not be loaded."
              }
            />
          </div>
        </section>
      </main>
    );
  }

  const activeBusiness =
    businesses.find((b: { id: string }) => b.id === businessId) ?? businesses[0];

  if (!activeBusiness) {
    return (
      <main className="min-h-screen bg-app-background p-4 text-app-text sm:p-6 lg:p-8">
        <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-[1380px] rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)] sm:min-h-[calc(100vh-3rem)]">
          <div className="p-10">
            <EmptyState
              title="No business access"
              description="You don't have access to this business."
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <FeedbackInboxPage
      branches={branches}
      businessContext={{
        businessId,
        businesses,
        activeBusiness,
        business: {
          id: businessData.business.id,
          status: businessData.business.status
        },
        permissions: businessData.permissions,
        membership: businessData.membership
      }}
    />
  );
}
