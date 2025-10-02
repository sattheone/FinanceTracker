import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { User, AuthState } from '../types/user';
import FirebaseService from '../services/firebaseService';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || '',
          dateOfBirth: '',
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
          onboardingCompleted: false,
        };

        // Try to get additional user data from Firestore
        try {
          const userProfile = await FirebaseService.getUserProfile(firebaseUser.uid);
          if (userProfile) {
            user.name = userProfile.personalInfo.name || user.name;
            user.dateOfBirth = userProfile.personalInfo.dateOfBirth || '';
            
            // Check if user has completed onboarding or has existing data
            const hasExistingData = await FirebaseService.hasUserData(firebaseUser.uid);
            user.onboardingCompleted = userProfile.onboardingStep >= 7 || hasExistingData;
          }
        } catch (error) {
          console.log('No user profile found, using Firebase Auth data');
          // For existing users without profile, check if they have any data
          try {
            const hasExistingData = await FirebaseService.hasUserData(firebaseUser.uid);
            user.onboardingCompleted = hasExistingData;
          } catch {
            // New user, needs onboarding
            user.onboardingCompleted = false;
          }
        }

        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // User is signed out
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: name
      });

      // Create user profile in Firestore
      const defaultProfile = {
        personalInfo: {
          name,
          email,
          dateOfBirth: '',
          spouseName: '',
          spouseDateOfBirth: '',
          children: [],
        },
        financialInfo: {
          monthlyIncome: 0,
          monthlyExpenses: 0,
          retirementAge: 60,
          currentAge: 30,
        },
        onboardingStep: 0,
      };

      await FirebaseService.createUserProfile(userCredential.user.uid, defaultProfile);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (user: User) => {
    try {
      if (auth.currentUser) {
        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, {
          displayName: user.name
        });

        // Update user profile in Firestore
        const userProfile = await FirebaseService.getUserProfile(user.id);
        if (userProfile) {
          const updatedProfile = {
            ...userProfile,
            personalInfo: {
              ...userProfile.personalInfo,
              name: user.name,
              email: user.email,
              dateOfBirth: user.dateOfBirth,
            }
          };
          await FirebaseService.updateUserProfile(user.id, updatedProfile);
        }

        setAuthState(prev => ({
          ...prev,
          user,
        }));
      }
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};