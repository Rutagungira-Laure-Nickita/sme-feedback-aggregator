import { Navigate, useParams } from "react-router-dom";

export function IntegrationsCanonicalRedirect(): JSX.Element {
  const { businessId } = useParams();
  return <Navigate to={`/business/${businessId ?? ""}/integrations`} replace />;
}
