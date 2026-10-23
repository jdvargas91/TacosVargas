import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

type Invite = {
  id: string;
  email: string;
  role: "vendedor" | "admin";
  status: "pending" | "accepted" | "revoked";
  created_at: string;
};

type Member = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
};

const inviteStatusLabel: Record<Invite["status"], string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  revoked: "Revocada",
};

const roleLabel: Record<"vendedor" | "admin" | "cliente", string> = {
  vendedor: "Vendedor",
  admin: "Administrador",
  cliente: "Cliente",
};

const inviteRoleOptions = [
  { value: "vendedor", label: "Vendedor" },
  { value: "admin", label: "Administrador" },
];

const memberRoleOptions = [
  { value: "vendedor", label: "Vendedor" },
  { value: "admin", label: "Administrador" },
];

export function EquipoPanel() {
  const toast = useToast();
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"vendedor" | "admin">("vendedor");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const [invitesRes, membersRes] = await Promise.all([
      supabase
        .from("team_invites")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, email, display_name, role").in("role", ["admin", "vendedor"]),
    ]);
    if (invitesRes.error) setError(invitesRes.error.message);
    else setInvites((invitesRes.data as Invite[]) ?? []);
    if (membersRes.error) setError(membersRes.error.message);
    else setMembers((membersRes.data as Member[]) ?? []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function invite() {
    setError(null);
    setMessage(null);
    if (!supabase) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Escribe un email válido.");
      toast.error("Invitación no enviada", "Escribe un email válido.");
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const { error: insertError } = await supabase.from("team_invites").insert({
      email: trimmed,
      role,
      invited_by: session.session?.user.id ?? null,
      status: "pending",
    });
    if (insertError) {
      setError(insertError.message);
      toast.error("Invitación no enviada", insertError.message);
      return;
    }
    setEmail("");
    const ok = `Invitación enviada a ${trimmed}. Debe entrar con Google usando ese correo.`;
    setMessage(ok);
    toast.success("Invitación creada", ok);
    void refresh();
  }

  async function removeInvite(id: string, inviteEmail: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("team_invites").delete().eq("id", id);
    if (deleteError) {
      toast.error("Invitación no eliminada", deleteError.message);
      return;
    }
    toast.info("Invitación eliminada", `Se borró la invitación de ${inviteEmail}.`);
    void refresh();
  }

  async function removeMember(userId: string, name: string) {
    if (!supabase) return;
    if (userId === user?.id) {
      toast.error("No puedes eliminarte", "Pídele a otro administrador que quite tu acceso.");
      return;
    }
    const { error: deleteError } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (deleteError) {
      setError(deleteError.message);
      toast.error("Miembro no eliminado", deleteError.message);
      return;
    }
    toast.success("Miembro eliminado", `${name} ya no forma parte del equipo.`);
    void refresh();
  }

  async function changeRole(userId: string, next: UserRole) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: next, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (updateError) {
      setError(updateError.message);
      toast.error("Rol no actualizado", updateError.message);
    } else {
      toast.success("Rol actualizado", `Nuevo rol: ${next}.`);
      void refresh();
    }
  }

  return (
    <div className="mt-2 space-y-10">
      {error ? <p className="text-ember">{error}</p> : null}
      {message ? <p className="text-clay">{message}</p> : null}

      <section className="card-shadow rounded-[10px] border border-ink/8 bg-smoke p-5 md:p-6">
        <h2 className="font-display text-2xl text-ink">Invitar al equipo</h2>
        <p className="mt-2 text-sm text-clay">
          El miembro entra con Google usando este correo. Al iniciar sesión recibe el rol asignado.
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-end gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@gmail.com"
            className="h-11 min-w-64 flex-1 rounded-[10px] border border-ink/15 bg-white px-3 text-ink"
          />
          <Select
            className="w-44"
            value={role}
            onValueChange={(v) => setRole(v as "vendedor" | "admin")}
            options={inviteRoleOptions}
            aria-label="Rol de la invitación"
          />
          <button type="button" onClick={() => void invite()} className="btn-accent h-11 w-full px-5 sm:w-auto">
            <UserPlus size={16} aria-hidden />
            Invitar
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-ink">Miembros</h2>
        <ul className="mt-4 space-y-3">
          {members.map((member) => (
            <li
              key={member.user_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-ink/10 bg-smoke px-4 py-3"
            >
              <div>
                <p className="font-medium text-ink">{member.display_name ?? member.email ?? member.user_id}</p>
                <p className="text-sm text-clay">{member.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  className="w-56"
                  value={member.role}
                  onValueChange={(v) => void changeRole(member.user_id, v as UserRole)}
                  options={memberRoleOptions}
                  aria-label={`Rol de ${member.display_name ?? member.email ?? "miembro"}`}
                />
                {member.user_id === user?.id ? null : (
                  <button
                    type="button"
                    onClick={() =>
                      void removeMember(member.user_id, member.display_name ?? member.email ?? "El miembro")
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-terracotta/35 px-4 text-sm font-medium text-terracotta"
                  >
                    <Trash2 size={16} aria-hidden />
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
          {members.length === 0 ? <p className="text-clay">Aún no hay miembros de equipo.</p> : null}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl text-ink">Invitaciones</h2>
        <p className="mt-1 text-sm text-clay">Solo se muestran las invitaciones pendientes de aceptar.</p>
        <ul className="mt-4 space-y-3">
          {invites.map((inviteRow) => (
            <li
              key={inviteRow.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-ink/10 bg-smoke px-4 py-3"
            >
              <div>
                <p className="font-medium text-ink">{inviteRow.email}</p>
                <p className="text-sm text-clay">
                  {roleLabel[inviteRow.role]} · {inviteStatusLabel[inviteRow.status]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removeInvite(inviteRow.id, inviteRow.email)}
                className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-terracotta/35 px-4 text-sm font-medium text-terracotta"
              >
                <Trash2 size={16} aria-hidden />
                Eliminar
              </button>
            </li>
          ))}
          {invites.length === 0 ? <p className="text-clay">No hay invitaciones pendientes.</p> : null}
        </ul>
      </section>
    </div>
  );
}
