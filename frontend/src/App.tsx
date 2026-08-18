import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./app/providers/AppProviders.js";
import { router } from "./app/router/router.js";

export function App(): JSX.Element {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
