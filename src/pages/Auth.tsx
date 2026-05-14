import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Droplets, Loader2 } from "lucide-react";

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  role: z.enum(["donor", "hospital_staff"]),
});
const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const initialRole = (params.get("role") as "donor" | "hospital_staff" | null) ?? "donor";
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "hospital_staff" ? "/hospital" : "/donor", { replace: true });
    }
  }, [user, role, loading, navigate]);

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { full_name: "", email: "", password: "", role: initialRole },
  });
  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: values.full_name, role: values.role },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created!");
    // After auth state updates, ProtectedRoute will route to onboarding via dashboard guards.
  };

  const onSignIn = async (values: z.infer<typeof signInSchema>) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-accent shadow-glow">
            <Droplets className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold">BloodLink</span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-elevated">
          <Tabs defaultValue={initialMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 space-y-4">
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" {...signInForm.register("email")} />
                  {signInForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signInForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-password">Password</Label>
                  <Input id="si-password" type="password" {...signInForm.register("password")} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Label>I am a</Label>
                  <RadioGroup
                    defaultValue={initialRole}
                    onValueChange={(v) => signUpForm.setValue("role", v as "donor" | "hospital_staff")}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label htmlFor="r-donor" className="flex cursor-pointer flex-col items-start gap-1 rounded-md border border-border p-3 hover:border-primary [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary-soft">
                      <RadioGroupItem id="r-donor" value="donor" className="sr-only" />
                      <span className="font-medium">Donor</span>
                      <span className="text-xs text-muted-foreground">I want to give blood</span>
                    </Label>
                    <Label htmlFor="r-staff" className="flex cursor-pointer flex-col items-start gap-1 rounded-md border border-border p-3 hover:border-primary [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary-soft">
                      <RadioGroupItem id="r-staff" value="hospital_staff" className="sr-only" />
                      <span className="font-medium">Hospital staff</span>
                      <span className="text-xs text-muted-foreground">I manage requests</span>
                    </Label>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" {...signUpForm.register("full_name")} />
                  {signUpForm.formState.errors.full_name && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.full_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" {...signUpForm.register("email")} />
                  {signUpForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Password</Label>
                  <Input id="su-password" type="password" {...signUpForm.register("password")} />
                  {signUpForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
