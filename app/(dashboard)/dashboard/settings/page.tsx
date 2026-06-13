"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  User,
  Lock,
  Bell,
  AlertTriangle,
  Plus,
  X,
  Trash2,
  Pencil,
  LogOut,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company_name: string | null;
}

interface TelegramSubscription {
  id: string;
  chat_id: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const isMobile = !useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [telegramSubscriptions, setTelegramSubscriptions] = useState<TelegramSubscription[]>([]);
  
  // Modal states
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  
  // Form states
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchTelegramSubscriptions();
  }, []);

  async function fetchUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (userData) {
        setProfile({
          ...userData,
          email: user.email || "",
          full_name: userData.full_name || "",
        });
        setEditName(userData.full_name || "");
        setEditCompany(userData.company_name || "");
      } else {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: user.id, full_name: "", company_name: null });
        
        if (!insertError) {
          fetchUserData();
        }
      }
    }
    setLoading(false);
  }

  async function fetchTelegramSubscriptions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("telegram_subscriptions")
        .select("*")
        .eq("profile_id", user.id);
      if (data) setTelegramSubscriptions(data);
    }
  }

  async function saveName() {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName })
        .eq("id", user.id);
      if (error) toast.error("Failed to update name");
      else {
        toast.success("Name updated");
        setProfile({ ...profile!, full_name: editName });
        setNameModalOpen(false);
      }
    }
    setSaving(false);
  }

  async function saveCompany() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ company_name: editCompany || null })
        .eq("id", user.id);
      if (error) toast.error("Failed to update company");
      else {
        toast.success("Company updated");
        setProfile({ ...profile!, company_name: editCompany });
        setCompanyModalOpen(false);
      }
    }
    setSaving(false);
  }

  async function sendPasswordResetEmail() {
    if (editPassword !== editConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (editPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setSendingEmail(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setPasswordModalOpen(false);
        setEditPassword("");
        setEditConfirmPassword("");
      }
    }
    setSendingEmail(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  async function addTelegramSubscription() {
    if (!telegramChatId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from("telegram_subscriptions")
      .insert({ chat_id: telegramChatId, profile_id: user.id });
    if (error) toast.error(error.message);
    else {
      toast.success("Telegram chat ID added");
      setTelegramChatId("");
      fetchTelegramSubscriptions();
    }
  }

  async function removeTelegramSubscription(id: string) {
    const { error } = await supabase
      .from("telegram_subscriptions")
      .delete()
      .eq("id", id);
    if (error) toast.error("Failed to remove");
    else {
      toast.success("Removed");
      fetchTelegramSubscriptions();
    }
  }

  async function deleteAccount() {
    const confirmed = confirm("Are you sure? This will permanently delete your account.");
    if (!confirmed) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.admin.deleteUser(user.id);
      toast.success("Account deleted");
      router.push("/signup");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Sign Out Confirmation Modal */}
        <Dialog open={signOutModalOpen} onOpenChange={setSignOutModalOpen}>
          <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Sign Out</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to sign out? You will need to sign in again to access your fleet data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSignOutModalOpen(false)}
                className="border-[#2A2A2A] text-gray-400 flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSignOut}
                className="bg-[#EF4444] hover:bg-[#DC2626] text-white flex-1"
              >
                Sign Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mb-5">
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-[#6B7280]">Manage your account</p>
        </div>

        {/* Profile Section */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-sm font-semibold text-white">Profile</h2>
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <Label className="text-xs text-gray-400">Full Name</Label>
              <button onClick={() => setNameModalOpen(true)} className="text-gray-500 hover:text-[#D4AF37]">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
            <p className="text-sm text-white">{profile?.full_name || "Not set"}</p>
          </div>

          <div className="mb-3">
            <Label className="text-xs text-gray-400 mb-1 block">Email</Label>
            <p className="text-sm text-gray-400">{profile?.email}</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-xs text-gray-400">Company (optional)</Label>
              <button onClick={() => setCompanyModalOpen(true)} className="text-gray-500 hover:text-[#D4AF37]">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
            <p className="text-sm text-white">{profile?.company_name || "Not set"}</p>
          </div>
        </Card>

        {/* Security Section */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-sm font-semibold text-white">Security</h2>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-xs text-gray-400">Password</Label>
              <button onClick={() => setPasswordModalOpen(true)} className="text-gray-500 hover:text-[#D4AF37]">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
            <p className="text-sm text-gray-400">••••••••</p>
          </div>
        </Card>

        {/* Telegram Section */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-sm font-semibold text-white">Telegram Alerts</h2>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">
            Message <span className="text-[#D4AF37]">@FleetWatchAlertBot</span> to get your Chat ID
          </p>
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Enter Chat ID"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="flex-1 text-sm bg-[#1A1A1A] border-[#2A2A2A] text-white h-9"
            />
            <Button onClick={addTelegramSubscription} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-9 px-3">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-1.5">
            {telegramSubscriptions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No subscriptions</p>
            ) : (
              telegramSubscriptions.map((sub) => (
                <div key={sub.id} className="flex justify-between items-center p-2 bg-[#1A1A1A] rounded-lg">
                  <span className="text-white text-xs font-mono">{sub.chat_id}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeTelegramSubscription(sub.id)} className="h-6 w-6 text-gray-500 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Sign Out Section - Mobile */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <LogOut className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">Sign Out</h2>
          </div>
          <p className="text-[10px] text-gray-400 mb-3">Sign out of your account.</p>
          <Button 
            onClick={() => setSignOutModalOpen(true)} 
            variant="outline" 
            size="sm" 
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 text-sm"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Sign Out
          </Button>
        </Card>

        {/* Danger Section */}
        <Card className="bg-[#0A0A0A] border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">Delete Account</h2>
          </div>
          <p className="text-[10px] text-gray-400 mb-3">Permanently delete your account and all data.</p>
          <Button onClick={deleteAccount} variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 h-8 text-sm w-full">
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete Account
          </Button>
        </Card>

        {/* Modals (same as before) */}
        <Dialog open={nameModalOpen} onOpenChange={setNameModalOpen}>
          <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white">
            <DialogHeader>
              <DialogTitle>Edit Name</DialogTitle>
              <DialogDescription className="text-gray-400">Change your display name</DialogDescription>
            </DialogHeader>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-[#1A1A1A] border-[#2A2A2A] text-white" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNameModalOpen(false)} className="border-[#2A2A2A] text-gray-400">Cancel</Button>
              <Button onClick={saveName} disabled={saving} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={companyModalOpen} onOpenChange={setCompanyModalOpen}>
          <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white">
            <DialogHeader>
              <DialogTitle>Edit Company</DialogTitle>
              <DialogDescription className="text-gray-400">Change your company name (optional)</DialogDescription>
            </DialogHeader>
            <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} className="bg-[#1A1A1A] border-[#2A2A2A] text-white" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompanyModalOpen(false)} className="border-[#2A2A2A] text-gray-400">Cancel</Button>
              <Button onClick={saveCompany} disabled={saving} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
          <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription className="text-gray-400">We'll send a confirmation email to verify your identity</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input type="password" placeholder="New password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="bg-[#1A1A1A] border-[#2A2A2A] text-white" />
              <Input type="password" placeholder="Confirm new password" value={editConfirmPassword} onChange={(e) => setEditConfirmPassword(e.target.value)} className="bg-[#1A1A1A] border-[#2A2A2A] text-white" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordModalOpen(false)} className="border-[#2A2A2A] text-gray-400">Cancel</Button>
              <Button onClick={sendPasswordResetEmail} disabled={sendingEmail} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black">Send Reset Email</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-[#6B7280] mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-[#D4AF37]" />
          Profile Information
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center">
              <Label className="text-gray-300">Full Name</Label>
              <button onClick={() => setNameModalOpen(true)} className="text-gray-500 hover:text-[#D4AF37] text-sm flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            </div>
            <p className="text-white mt-1">{profile?.full_name || "Not set"}</p>
          </div>

          <div>
            <Label className="text-gray-300">Email</Label>
            <p className="text-gray-400 mt-1">{profile?.email}</p>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label className="text-gray-300">Company Name <span className="text-gray-500">(optional)</span></Label>
              <button onClick={() => setCompanyModalOpen(true)} className="text-gray-500 hover:text-[#D4AF37] text-sm flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            </div>
            <p className="text-white mt-1">{profile?.company_name || "Not set"}</p>
          </div>
        </div>
      </Card>

      {/* Security Card */}
      <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#D4AF37]" />
          Security
        </h2>
        <div>
          <div className="flex justify-between items-center">
            <Label className="text-gray-300">Password</Label>
            <button onClick={() => setPasswordModalOpen(true)} className="text-gray-500 hover:text-[#D4AF37] text-sm flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              Change
            </button>
          </div>
          <p className="text-gray-400 mt-1">••••••••</p>
        </div>
      </Card>

      {/* Telegram Card */}
      <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#D4AF37]" />
          Telegram Alerts
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Message <span className="text-[#D4AF37]">@FleetWatchAlertBot</span> on Telegram to get your Chat ID, then add it below.
        </p>
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Enter Telegram Chat ID"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            className="flex-1 bg-[#1A1A1A] border-[#2A2A2A] text-white"
          />
          <Button onClick={addTelegramSubscription} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {telegramSubscriptions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No Telegram subscriptions yet</p>
          ) : (
            telegramSubscriptions.map((sub) => (
              <div key={sub.id} className="flex justify-between items-center p-3 bg-[#1A1A1A] rounded-lg">
                <span className="text-white font-mono">{sub.chat_id}</span>
                <Button variant="ghost" size="icon" onClick={() => removeTelegramSubscription(sub.id)} className="text-gray-500 hover:text-red-500">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Danger Card */}
      <Card className="bg-[#0A0A0A] border-red-500/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Delete Account
        </h2>
        <p className="text-sm text-gray-400 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
        <Button onClick={deleteAccount} variant="destructive" className="bg-red-600 hover:bg-red-700">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </Card>

      {/* Name Modal */}
      <Dialog open={nameModalOpen} onOpenChange={setNameModalOpen}>
        <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle>Edit Name</DialogTitle>
            <DialogDescription className="text-gray-400">Change your display name</DialogDescription>
          </DialogHeader>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-[#1A1A1A] border-[#2A2A2A] text-white" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameModalOpen(false)} className="border-[#2A2A2A] text-gray-400">Cancel</Button>
            <Button onClick={saveName} disabled={saving} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Modal */}
      <Dialog open={companyModalOpen} onOpenChange={setCompanyModalOpen}>
        <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription className="text-gray-400">Change your company name (optional)</DialogDescription>
          </DialogHeader>
          <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} className="bg-[#1A1A1A] border-[#2A2A2A] text-white" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyModalOpen(false)} className="border-[#2A2A2A] text-gray-400">Cancel</Button>
            <Button onClick={saveCompany} disabled={saving} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription className="text-gray-400">We'll send a confirmation email to verify your identity</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="password" placeholder="New password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="bg-[#1A1A1A] border-[#2A2A2A] text-white" />
            <Input type="password" placeholder="Confirm new password" value={editConfirmPassword} onChange={(e) => setEditConfirmPassword(e.target.value)} className="bg-[#1A1A1A] border-[#2A2A2A] text-white" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordModalOpen(false)} className="border-[#2A2A2A] text-gray-400">Cancel</Button>
            <Button onClick={sendPasswordResetEmail} disabled={sendingEmail} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black">Send Reset Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
