import { createContext, useContext, useEffect, useState } from "react";
import type { IUser } from "../assets/assets";
import api from "../configs/Api";
import toast from "react-hot-toast";

interface AuthContextProps {
    isLoggedIn: boolean;
    setIsLoggedIn: (isLoggedIn: boolean) => void;
    user: IUser | null;
    setUser: (user: IUser | null) => void;
    login: (user: {email: string; password: string}) => Promise<void>;
    signUp: (user:  {name: string; email: string; password: string}) => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (token: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextProps>({
    isLoggedIn: false,
    setIsLoggedIn: ()=> {},
    user: null,
    setUser: ()=> {},
    login: async ()=> {},
    signUp: async ()=> {},
    logout: async ()=> {},
    forgotPassword: async ()=> {},
    resetPassword: async () => false,
})

export const AuthProvider = ({children}: {children: React.ReactNode}) => {

    const [user,setUser] = useState<IUser | null>(null)
    const [isLoggedIn,setIsLoggedIn] = useState<boolean>(false)

    const signUp = async ({name, email, password}: 
        {name: string; email: string; password: string})=> {
             try {
                const {data} = await api.post('/api/auth/register', {name, email, password});
                if(data.user){
                    setUser(data.user as IUser)
                    setIsLoggedIn(true)
                }
                toast.success(data.message)
             } catch (error: any) {
                toast.error(error.response?.data?.message || error.message);
             }
    }

     const login = async ({email, password}: 
        {email: string; password: string})=> {
         try {
                const {data} = await api.post('/api/auth/login', {email, password});
                if(data.user){
                    setUser(data.user as IUser)
                    setIsLoggedIn(true)
                }
                toast.success(data.message)
             } catch (error: any) {
                toast.error(error.response?.data?.message || error.message);
             }
    }

     const logout = async ()=> {
         try {
                const {data} = await api.post('/api/auth/logout');
                setUser(null);
                setIsLoggedIn(false)
                toast.success(data.message)
             } catch (error) {
                console.log(error);
             }
    }

    const forgotPassword = async (email: string) => {
        try {
            const { data } = await api.post('/api/auth/forgot-password', { email });
            toast.success(data.message);
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const resetPassword = async (token: string, password: string): Promise<boolean> => {
        try {
            const { data } = await api.post('/api/auth/reset-password', { token, password });
            toast.success(data.message);
            return true;
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
            return false;
        }
    };

     const fetchUser = async ()=> {
         try {
                const {data} = await api.get('/api/auth/verify');
                if(data.user){
                    setUser(data.user as IUser)
                    setIsLoggedIn(true)
                }
             } catch (error) {
                console.log(error);
             }
    }

    useEffect(()=> {
        (async ()=> {
            await fetchUser();
        })();
    },[])

    const value = {
          user,setUser,
          isLoggedIn,setIsLoggedIn,
          signUp,login,logout,
          forgotPassword,resetPassword
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = ()=> useContext(AuthContext);