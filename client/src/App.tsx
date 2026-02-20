import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { useAuthContext } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Reminders from "@/pages/Reminders";
import Medications from "@/pages/Medications";
import Contacts from "@/pages/Contacts";
import Locations from "@/pages/Locations";
import Journal from "@/pages/Journal";
import MemoryWall from "@/pages/MemoryWall";
import Games from "@/pages/Games";
import Routines from "@/pages/Routines";
import Identify from "@/pages/Identify";
import Emergency from "@/pages/Emergency";
import PerformanceAnalysis from "@/pages/PerformanceAnalysis";
import Chatbot from "@/pages/Chatbot";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/reminders" component={Reminders} />
        <Route path="/medications" component={Medications} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/locations" component={Locations} />
        <Route path="/journal" component={Journal} />
        <Route path="/memory" component={MemoryWall} />
        <Route path="/routines" component={Routines} />
        <Route path="/games" component={Games} />
        <Route path="/identify" component={Identify} />
        <Route path="/performance" component={PerformanceAnalysis} />
        <Route path="/chatbot" component={Chatbot} />
        <Route path="/emergency" component={Emergency} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AuthenticatedApp />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
