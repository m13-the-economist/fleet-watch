"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const supabase = createClient();

  // Function to create user record after email confirmation
  const createUserRecord = async (userId: string, email: string, name: string, companyName: string) => {
    // Get or create customer
    let customerId = '4f9a7f9c-bd2f-4465-9b23-4725ef1b38f4';
    
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();
    
    if (!existingCustomer) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({ name: companyName || name, email: email })
        .select()
        .single();
      
      if (newCustomer) {
        customerId = newCustomer.id;
      }
    } else {
      customerId = existingCustomer.id;
    }
    
    // Create user record with the EXACT auth ID
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        customer_id: customerId,
        email: email,
        name: name,
        company_name: companyName,
        password_hash: 'managed_by_supabase',
        role: 'user'
      });
    
    if (userError) {
      console.error("User creation error:", userError);
    }
  };

  // Check for session after email confirmation
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userId = session.user.id;
        const userEmail = session.user.email;
        const userName = session.user.user_metadata?.name || name;
        const userCompany = session.user.user_metadata?.company_name || companyName;
        
        // Check if user record already exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", userId)
          .single();
        
        if (!existingUser && userId) {
          await createUserRecord(userId, userEmail!, userName, userCompany);
          toast.success("Account created successfully!");
        }
        router.push("/dashboard");
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        checkSession();
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name) {
      setError("Please enter your name");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            company_name: companyName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        setShowConfirmation(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-black">
        <Card className="w-full max-w-md bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#D4AF37]" />
              </div>
            </div>
            <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              We sent a confirmation link to <strong className="text-[#D4AF37]">{email}</strong>
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Click the link to verify your account, then you'll be automatically logged in.
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/signin">
              <Button className="w-full bg-[#D4AF37] hover:bg-[#E5C86B] text-black font-semibold">
                Go to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-black">
      <Card className="w-full max-w-md bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Create Account</CardTitle>
          <p className="text-sm text-gray-500 mt-2">Start monitoring your fleet</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="name" className="text-gray-300">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-gray-600 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-gray-600 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                required
              />
            </div>
            <div>
              <Label htmlFor="company" className="text-gray-300">Company Name <span className="text-gray-500 text-xs">(optional)</span></Label>
              <Input
                id="company"
                type="text"
                placeholder="Your Company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-gray-600 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-gray-600 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-gray-600 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#D4AF37] hover:bg-[#E5C86B] text-black font-semibold h-11"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/signin" className="text-[#D4AF37] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
