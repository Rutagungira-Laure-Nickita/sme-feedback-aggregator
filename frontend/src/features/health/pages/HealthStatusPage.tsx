import { Activity, Database, Server, ShieldCheck } from "lucide-react";
import { StatusLayout } from "../../../app/layouts/StatusLayout.js";
import { HealthCard } from "../components/HealthCard.js";
import { useApiHealthQuery, useDatabaseHealthQuery } from "../hooks/useHealthQueries.js";

export function HealthStatusPage(): JSX.Element {
  const apiHealth = useApiHealthQuery();
  const databaseHealth = useDatabaseHealthQuery();

  return (
    <StatusLayout>
      <header className="flex flex-1 flex-col justify-center py-10 sm:py-14">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Platform availability
          </div>
          <h1 className="text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
            SME Multi-Channel Customer Feedback Aggregator
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Foundation status for the local React frontend, Express API, and XAMPP-backed
            MySQL database connection.
          </p>
        </div>
      </header>

      <section className="grid gap-5 pb-10 lg:grid-cols-3">
        <HealthCard
          title="Frontend"
          description="React, TypeScript, Vite, Tailwind CSS, Router, and TanStack Query are running this status surface."
          icon={Activity}
          isLoading={false}
          isSuccess={true}
          error={null}
          details={[
            { label: "Runtime", value: "React SPA" },
            { label: "Phase", value: "Foundation" }
          ]}
        />
        <HealthCard
          title="Backend API"
          description="Calls GET /api/health through the configured Axios client."
          icon={Server}
          isLoading={apiHealth.isLoading}
          isSuccess={apiHealth.isSuccess}
          error={apiHealth.error}
          details={[
            { label: "Service", value: apiHealth.data?.service ?? "Unavailable" },
            { label: "Environment", value: apiHealth.data?.environment ?? "Unknown" },
            { label: "Timestamp", value: apiHealth.data?.timestamp ?? "Pending" }
          ]}
        />
        <HealthCard
          title="Database"
          description="Calls GET /api/health/database, which verifies Prisma can reach MySQL with SELECT 1."
          icon={Database}
          isLoading={databaseHealth.isLoading}
          isSuccess={databaseHealth.isSuccess}
          error={databaseHealth.error}
          details={[
            { label: "Provider", value: databaseHealth.data?.database ?? "MySQL" },
            { label: "Status", value: databaseHealth.data?.status ?? "Unknown" },
            { label: "Timestamp", value: databaseHealth.data?.timestamp ?? "Pending" }
          ]}
        />
      </section>
    </StatusLayout>
  );
}
