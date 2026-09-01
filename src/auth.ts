import { useEffect, useState } from 'react';
import { client, isConfigured, supabase } from './supabase';
import type { Profile } from './types';

export interface AuthState {
  loading: boolean;
  session: boolean;
  profile: Profile | null;
  noAccess: boolean;
  error: string;
}

/** Tracks the Supabase session and resolves it to this person's workspace profile. */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ loading: true, session: false, profile: null, noAccess: false, error: '' });

  const resolveProfile = async () => {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setState({ loading: false, session: false, profile: null, noAccess: false, error: '' }); return; }
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userData.user.id).eq('active', true).maybeSingle();
    if (error) { setState({ loading: false, session: true, profile: null, noAccess: false, error: error.message }); return; }
    if (!data) { setState({ loading: false, session: true, profile: null, noAccess: true, error: '' }); return; }
    setState({ loading: false, session: true, profile: data as Profile, noAccess: false, error: '' });
  };

  useEffect(() => {
    if (!isConfigured || !supabase) { setState(s => ({ ...s, loading: false })); return; }
    resolveProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => resolveProfile());
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await client().auth.signUp({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  };

  const signOut = () => client().auth.signOut();

  return { ...state, signIn, signUp, signOut, refresh: resolveProfile };
}
