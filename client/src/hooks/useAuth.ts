import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { socketManager } from '@/lib/socket';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api', 'auth', 'me'],
    queryFn: () => authApi.me(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(['/api', 'auth', 'me'], user);
      // Connect to socket when user logs in
      socketManager.connect(user.id);
    },
    onError: (error) => {
      console.log('Login failed:', error.message);
    }
  });

  const registerMutation = useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      authApi.register(email, password, name),
    onSuccess: (user) => {
      queryClient.setQueryData(['/api', 'auth', 'me'], user);
      socketManager.connect(user.id);
    },
    onError: (error) => {
      console.log('Registration failed:', error.message);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(['/api', 'auth', 'me'], null);
      queryClient.clear();
      socketManager.disconnect();
    },
    onError: (error) => {
      console.log('Logout failed:', error.message);
    }
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}
