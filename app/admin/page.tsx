import { redirect } from "next/navigation";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/src/lib/supabase/server";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export default async function AdminPage() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <main className="app-shell">
        <section className="panel">
          <p className="eyebrow">Admin</p>
          <h2>Supabase not configured</h2>
          <p className="hero-copy">
            Set Supabase environment variables to enable sign-in reporting.
          </p>
        </section>
      </main>
    );
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/");
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return (
      <main className="app-shell">
        <section className="panel">
          <p className="eyebrow">Admin</p>
          <h2>Access denied</h2>
          <p className="hero-copy">
            Add your email to <code>ADMIN_EMAILS</code> to access user activity.
          </p>
        </section>
      </main>
    );
  }

  const adminClient = getSupabaseAdminClient();
  const { data: profiles, count } = await adminClient
    .from("profiles")
    .select("email,full_name,last_sign_in_at,created_at", { count: "exact" })
    .order("last_sign_in_at", { ascending: false })
    .limit(200);

  return (
    <main className="app-shell">
      <section className="panel">
        <p className="eyebrow">Admin</p>
        <h2>Sign-in activity</h2>
        <p className="hero-copy">{count ?? 0} total users have signed in.</p>
      </section>

      <section className="panel">
        <div className="table-scroll">
          <table className="task-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>First seen</th>
                <th>Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => (
                <tr key={profile.email}>
                  <td>{profile.email}</td>
                  <td>{profile.full_name ?? "-"}</td>
                  <td>{new Date(profile.created_at).toLocaleString()}</td>
                  <td>{new Date(profile.last_sign_in_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
