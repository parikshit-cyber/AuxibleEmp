import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BrandMark, Equalizer } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, ShieldCheck, Radio } from "lucide-react";

const HERO =
  "https://images.unsplash.com/photo-1561314105-e6ac04c2984a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHxjbHViJTIwc291bmQlMjBzeXN0ZW18ZW58MHx8fHwxNzgwNTQzNTQwfDA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.token, data.user);
      navigate(data.user.role === "employee" ? "/app" : "/admin", { replace: true });
    } catch (err) {
      setError(apiError(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#0A0A0A] text-white">
      {/* Visual side */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden ambient">
        <div className="absolute inset-0">
          <img src={HERO} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent" />
          <div className="absolute inset-0 grain opacity-40" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center gap-3"
        >
          <BrandMark />
          <div>
            <p className="font-heading text-lg font-extrabold tracking-tight leading-none">AUXIBLE INDIA</p>
            <p className="text-[11px] text-white/40 tracking-[0.25em] uppercase mt-1">Audio Command Center</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative space-y-6"
        >
          <div className="flex items-center gap-3 text-[#D4AF37]">
            <Equalizer />
            <span className="overline">Live Field Operations</span>
          </div>
          <h1 className="font-heading text-5xl xl:text-6xl font-black tracking-tight leading-[1.02]">
            Sound that
            <br />
            <span className="gradient-text">moves the room.</span>
          </h1>
          <p className="text-white/55 max-w-md leading-relaxed">
            Track every employee, every site visit — clubs, bars, restaurants, theatres & home cinemas.
            Live location, device telemetry, attendance and analytics in one obsidian command center.
          </p>
          <div className="flex gap-6 pt-2 text-sm text-white/60">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#D4AF37]" /> Live GPS</span>
            <span className="flex items-center gap-2"><Radio className="h-4 w-4 text-[#D4AF37]" /> Real-time</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> Secure</span>
          </div>
        </motion.div>
        <p className="relative text-xs text-white/25">© 2026 Auxible India · Music Systems Setup</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#0A0A0A] relative ambient">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm relative"
          data-testid="login-page"
        >
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <BrandMark />
            <p className="font-heading text-lg font-extrabold">AUXIBLE INDIA</p>
          </div>
          <p className="overline text-[#D4AF37] mb-2">Sign in</p>
          <h2 className="font-heading text-4xl font-extrabold tracking-tight mb-1">Welcome back</h2>
          <p className="text-white/45 text-sm mb-8">Access your command center.</p>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="login-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@auxibleindia.com"
                className="bg-[#0A0A0A] border-white/10 h-11 focus-visible:ring-[#D4AF37]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-[#0A0A0A] border-white/10 h-11 focus-visible:ring-[#D4AF37]"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-[#FF3B30] bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-lg px-3 py-2" data-testid="login-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full bg-[#D4AF37] hover:bg-[#F0C74A] text-black font-semibold transition-colors h-11 glow-gold"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter Command Center"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
