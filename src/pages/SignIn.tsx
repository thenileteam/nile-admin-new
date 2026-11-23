import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { signIn } from "@/api/auth";
import { errorMessage } from "@/api/client";
import { useAuth } from "@/auth/store";
import { Button, Field, Input, PasswordInput } from "@/components/ui";

interface LocationState {
  from?: string;
}

export const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAuth((state) => state.status);
  const setSession = useAuth((state) => state.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const session = await signIn(email, password);
      if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
        setError("This account does not have admin access.");
        return;
      }
      setSession(session);
      toast.success(`Welcome back, ${session.user.firstName || "admin"}`);
      const from = (location.state as LocationState | null)?.from;
      navigate(from && from !== "/sign-in" ? from : "/", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-[#f5f8f5] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/nilelogo-green.svg" alt="Nile" className="mx-auto h-12 w-auto" />
          <p className="mt-4 text-sm font-medium text-brand-700">Admin console</p>
          <p className="mt-1 text-sm text-ink-600">Sign in with your admin account.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@nile.ng"
            />
          </Field>

          <Field label="Password">
            <PasswordInput
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={submitting} disabled={!email || !password}>
            Sign in
          </Button>

          <p className="text-center text-xs text-ink-400">
            Sessions expire after 10 days. You will be signed out after 30 minutes of inactivity.
          </p>
        </form>
      </div>
    </div>
  );
};
