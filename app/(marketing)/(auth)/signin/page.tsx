"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-black">
      <Card className="w-full max-w-md bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
          <p className="text-sm text-gray-500 mt-2">Sign in to your Fleet Watch account</p>
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
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="manager@fleetcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-gray-600 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                required
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
            <Button
              type="submit"
              className="w-full bg-[#D4AF37] hover:bg-[#E5C86B] text-black font-semibold h-11"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <Link href="/signup" className="text-[#D4AF37] hover:underline font-medium">
                Create account
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
