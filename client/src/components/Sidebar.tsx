import { useLocation } from 'wouter';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Bell, 
  Pill, 
  Users, 
  MapPin, 
  Book, 
  Images, 
  List, 
  Gamepad2, 
  Camera, 
  AlertTriangle,
  Brain,
  User,
  TrendingUp,
  MessageCircle
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Reminders', href: '/reminders', icon: Bell },
  { name: 'Medications', href: '/medications', icon: Pill },
  { name: 'People Cards', href: '/contacts', icon: Users },
  { name: 'Locations', href: '/locations', icon: MapPin },
  { name: 'Journal', href: '/journal', icon: Book },
  { name: 'Memory Wall', href: '/memory', icon: Images },
  { name: 'Routines', href: '/routines', icon: List },
  { name: 'Memory Games', href: '/games', icon: Gamepad2 },
  { name: 'Identify', href: '/identify', icon: Camera },
  { name: 'Performance', href: '/performance', icon: TrendingUp },
  { name: 'Assistant', href: '/chatbot', icon: MessageCircle },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuthContext();

  const handleLogout = async () => {
    try {
      await logout();       // wait for logout to complete
      setLocation('/');     // redirect to root, which will show login when not authenticated
    } catch (err) {
      console.error('Logout failed:', err);
      // Even if logout fails, redirect to login page
      setLocation('/');
    }
  };

  return (
    <aside className="w-80 bg-card shadow-lg border-r border-border flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Brain className="text-xl text-primary-foreground" data-testid="logo-icon" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="app-title">Memocare</h1>
            <p className="text-sm text-muted-foreground">Care Assistant</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Button
              key={item.name}
              variant={isActive ? 'default' : 'ghost'}
              className={`w-full flex items-center justify-start space-x-4 p-4 text-left text-lg h-auto ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-muted hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => setLocation(item.href)}
              data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
            >
              <Icon className="text-2xl" />
              <span className="font-medium">{item.name}</span>
            </Button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full flex items-center justify-start space-x-4 p-4 text-left text-lg h-auto bg-destructive text-destructive-foreground shadow-md emergency-pulse"
          onClick={() => setLocation('/emergency')}
          data-testid="nav-emergency"
        >
          <AlertTriangle className="text-2xl" />
          <span className="font-medium">Emergency</span>
        </Button>
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 p-2">
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
            <User className="text-secondary-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground" data-testid="user-name">
              {user?.name || 'User'}
            </p>
            <button
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
