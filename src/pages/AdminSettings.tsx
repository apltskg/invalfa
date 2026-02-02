import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, User, Search, UserPlus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: "admin" | "staff" | null;
}

export default function AdminSettings() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ email: "", password: "", fullName: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch profiles with their roles
    const { data: profiles, isLoading, refetch } = useQuery({
        queryKey: ["admin-profiles"],
        queryFn: async () => {
            // First get profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("*");

            if (profilesError) throw profilesError;

            // Then get roles
            const { data: rolesData, error: rolesError } = await supabase
                .from("user_roles")
                .select("*");

            if (rolesError) throw rolesError;

            // Merge them
            return profilesData.map(profile => ({
                ...profile,
                role: rolesData.find(r => r.user_id === profile.id)?.role || "staff"
            })) as Profile[];
        }
    });

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.password) {
            toast.error("Email και κωδικός είναι υποχρεωτικά");
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-users', {
                body: {
                    action: 'create',
                    email: newUser.email,
                    password: newUser.password,
                    fullName: newUser.fullName
                }
            });

            if (error || data?.error) throw new Error(error?.message || data?.error);

            toast.success("Ο χρήστης δημιουργήθηκε επιτυχώς");
            setIsAddUserOpen(false);
            setNewUser({ email: "", password: "", fullName: "" });
            refetch();
        } catch (error: any) {
            console.error("Error creating user:", error);
            toast.error("Αποτυχία δημιουργίας χρήστη. Παρακαλώ δοκιμάστε ξανά.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον χρήστη; Η ενέργεια είναι μη αναστρέψιμη.")) return;

        try {
            const { data, error } = await supabase.functions.invoke('manage-users', {
                body: { action: 'delete', userId }
            });

            if (error || data?.error) throw new Error(error?.message || data?.error);

            toast.success("Ο χρήστης διαγράφηκε επιτυχώς");
            refetch();
        } catch (error: any) {
            console.error("Error deleting user:", error);
            toast.error("Αποτυχία διαγραφής χρήστη. Παρακαλώ δοκιμάστε ξανά.");
        }
    };

    const handleRoleChange = async (userId: string, newRole: "admin" | "staff") => {
        try {
            // Check if role entry exists
            const { data: existingRole } = await supabase
                .from("user_roles")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

            let error;
            if (existingRole) {
                const result = await supabase
                    .from("user_roles")
                    .update({ role: newRole })
                    .eq("user_id", userId);
                error = result.error;
            } else {
                const result = await supabase
                    .from("user_roles")
                    .insert([{ user_id: userId, role: newRole }]);
                error = result.error;
            }

            if (error) throw error;

            toast.success("Ο ρόλος ενημερώθηκε επιτυχώς");
            refetch();
        } catch (error: any) {
            console.error("Error updating role:", error);
            toast.error("Αποτυχία ενημέρωσης ρόλου. Παρακαλώ δοκιμάστε ξανά.");
        }
    };

    const filteredProfiles = profiles?.filter(profile =>
        (profile.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (profile.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Διαχείριση Χρηστών</h1>
                    <p className="text-muted-foreground">Διαχειριστείτε τους χρήστες και τα δικαιώματά τους.</p>
                </div>
                <Button onClick={() => setIsAddUserOpen(true)} className="gap-2 rounded-xl">
                    <UserPlus className="h-4 w-4" />
                    Προσθήκη Χρήστη
                </Button>
            </div>

            <Card className="rounded-3xl border-none shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Χρήστες Συστήματος</CardTitle>
                            <CardDescription>
                                Συνολικά {profiles?.length || 0} εγγεγραμμένοι χρήστες
                            </CardDescription>
                        </div>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Αναζήτηση με email ή όνομα..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 rounded-xl"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredProfiles?.map((profile) => (
                            <div
                                key={profile.id}
                                className="flex items-center justify-between p-4 rounded-2xl border bg-card/50 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{profile.full_name || "Χωρίς Όνομα"}</p>
                                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {profile.role === 'admin' ? (
                                            <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">Admin</Badge>
                                        ) : (
                                            <Badge variant="secondary">Staff</Badge>
                                        )}
                                    </div>

                                    <Select
                                        defaultValue={profile.role || "staff"}
                                        onValueChange={(value) => handleRoleChange(profile.id, value as "admin" | "staff")}
                                    >
                                        <SelectTrigger className="w-[140px] rounded-xl h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-3 w-3" />
                                                    Admin
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                        onClick={() => handleDeleteUser(profile.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {filteredProfiles?.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                Δεν βρέθηκαν χρήστες.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent className="rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Προσθήκη Νέου Χρήστη</DialogTitle>
                        <DialogDescription>
                            Δημιουργήστε έναν νέο λογαριασμό για μέλος του προσωπικού.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Όνοματεπώνυμο</label>
                            <Input
                                value={newUser.fullName}
                                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                                placeholder="π.χ. Γιάννης Παπαδόπουλος"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="name@example.com"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Κωδικός Πρόσβασης</label>
                            <Input
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="******"
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddUserOpen(false)} className="rounded-xl">Ακύρωση</Button>
                        <Button onClick={handleCreateUser} disabled={isSubmitting} className="rounded-xl">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Δημιουργία"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
