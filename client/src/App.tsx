import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Home } from "@/pages/Home";
import { FragmentDetail } from "@/pages/FragmentDetail";
import { FragmentEdit } from "@/pages/FragmentEdit";
import { FragmentCreate } from "@/pages/FragmentCreate";

function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={Home} />
      <Route path="/fragment/new" component={FragmentCreate} />
      <Route path="/fragment/:id" component={FragmentDetail} />
      <Route path="/fragment/:id/edit" component={FragmentEdit} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
