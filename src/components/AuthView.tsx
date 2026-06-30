import React, { useState } from "react";
import { Target, Lock, Mail, ArrowRight, Chrome, CheckSquare, Square, User as UserIcon } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

interface AuthViewProps {
  onLogin: () => void;
}

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

type AuthValues = z.infer<typeof authSchema>;

export function AuthView({ onLogin }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit = async (data: AuthValues) => {
    setError("");
    setSuccess("");

    if (!isLogin && !acceptedTerms && !isForgotPassword) {
      setError("Please accept the Terms and Conditions to create an account.");
      return;
    }

    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setSuccess("Password reset email sent! Check your inbox.");
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        // The onAuthStateChange in App.tsx will handle the session redirect
      } else {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.name,
            },
          },
        });
        if (error) throw error;
        setSuccess("Account created successfully! You can now log in.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    if (!isLogin && !acceptedTerms && !isForgotPassword) {
      setError("Please accept the Terms and Conditions to create an account.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Google Auth failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 selection:bg-brand-accent-dim selection:text-brand-accent relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-accent rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10"></div>

      <div className="w-full max-w-md bg-[#181a22]/80 backdrop-blur-xl rounded-[24px] border border-brand-border/50 p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#22252E] rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-[#2A2D3A]">
            <Target className="w-8 h-8 text-brand-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
            {isForgotPassword
              ? "Reset Password"
              : isLogin
              ? "Welcome back"
              : "Create an account"}
          </h1>
          <p className="text-[#8E92A4] text-sm text-center max-w-[280px]">
            {isForgotPassword
              ? "Enter your email to receive a reset link."
              : isLogin
              ? "Enter your details to access your account."
              : "Join SPORTHUB and connect with the community."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium text-center">
            {success}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-text-secondary text-xs font-semibold uppercase tracking-wider">
                      Full Name
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <UserIcon className="w-5 h-5 text-[#5A5D6B] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand-accent transition-colors" />
                        <Input
                          placeholder="John Doe"
                          className="w-full bg-[#22252E] border-none text-brand-text-primary rounded-xl pl-12 pr-4 h-12 focus-visible:ring-1 focus-visible:ring-brand-accent transition-all placeholder:text-[#5A5D6B]"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-brand-text-secondary text-xs font-semibold uppercase tracking-wider">
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Mail className="w-5 h-5 text-[#5A5D6B] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand-accent transition-colors" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className="w-full bg-[#22252E] border-none text-brand-text-primary rounded-xl pl-12 pr-4 h-12 focus-visible:ring-1 focus-visible:ring-brand-accent transition-all placeholder:text-[#5A5D6B]"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            {!isForgotPassword && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-text-secondary text-xs font-semibold uppercase tracking-wider flex justify-between">
                      <span>Password</span>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            setError("");
                            setSuccess("");
                          }}
                          className="text-brand-accent hover:underline lowercase normal-case tracking-normal"
                        >
                          Forgot password?
                        </button>
                      )}
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="w-5 h-5 text-[#5A5D6B] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand-accent transition-colors" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-[#22252E] border-none text-brand-text-primary rounded-xl pl-12 pr-4 h-12 focus-visible:ring-1 focus-visible:ring-brand-accent transition-all placeholder:text-[#5A5D6B]"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            )}

            {!isLogin && !isForgotPassword && (
              <div
                className="flex items-center gap-3 mt-6 cursor-pointer group"
                onClick={() => setAcceptedTerms(!acceptedTerms)}
              >
                <div className="text-brand-accent transition-transform group-active:scale-95">
                  {acceptedTerms ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5 text-[#5A5D6B] group-hover:text-brand-accent" />
                  )}
                </div>
                <span className="text-sm text-[#8E92A4] group-hover:text-brand-text-primary transition-colors select-none">
                  I accept the{" "}
                  <a href="#" className="text-brand-accent hover:underline">
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-brand-accent hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-accent text-[#1e1e1e] hover:bg-brand-accent-hover font-bold rounded-xl h-12 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#1e1e1e] border-t-transparent rounded-full animate-spin"></div>
              ) : isForgotPassword ? (
                "Send Reset Link"
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
              {!loading && !isForgotPassword && (
                <ArrowRight className="w-5 h-5" />
              )}
            </Button>
          </form>
        </Form>

        {!isForgotPassword && (
          <>
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-brand-border"></div>
              <span className="text-xs font-medium text-[#5A5D6B] uppercase tracking-wider">
                Or continue with
              </span>
              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-brand-border"></div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleGoogleAuth}
              className="w-full bg-transparent border-brand-border text-brand-text-primary hover:bg-[#22252E] rounded-xl h-12 font-medium transition-all active:scale-[0.98] mb-8 disabled:opacity-50"
            >
              <Chrome className="w-5 h-5 mr-3" />
              Google
            </Button>
          </>
        )}

        <p className="text-center text-sm text-[#8E92A4]">
          {isForgotPassword ? (
            <button
              onClick={() => {
                setIsForgotPassword(false);
                setError("");
                setSuccess("");
              }}
              className="font-semibold text-brand-text-primary hover:text-brand-accent transition-colors underline decoration-brand-border hover:decoration-brand-accent underline-offset-4"
            >
              Back to login
            </button>
          ) : isLogin ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError("");
                  form.reset();
                }}
                className="font-semibold text-brand-text-primary hover:text-brand-accent transition-colors underline decoration-brand-border hover:decoration-brand-accent underline-offset-4"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError("");
                  form.reset();
                }}
                className="font-semibold text-brand-text-primary hover:text-brand-accent transition-colors underline decoration-brand-border hover:decoration-brand-accent underline-offset-4"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
