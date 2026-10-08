import { cmsMode, hostedDemoStore } from "@/lib/cms/mode";
import { loginAction } from "../actions";
import { Mark } from "@/components/layout/Logo";

export default function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <LoginForm searchParams={searchParams} />;
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const mode = cmsMode();
  return (
    <main className="admin-main" style={{ maxWidth: 28 * 16, margin: "10vh auto" }}>
      <Mark size={58} />
      <h1 style={{ fontFamily: "var(--font-source-serif)", fontSize: "2rem", margin: "1rem 0 0.5rem" }}>Махни досадното</h1>
      <p className="admin-muted">Контролна зала за събитието.</p>
      {mode === "seed" ? (
        <p className="admin-card" style={{ marginTop: "1.5rem" }}>
          Няма настроени данни за вход. За локална работа задайте <code>CIT_ADMIN_DEV_PASSWORD</code> и рестартирайте. За хоствана
          автентикация задайте <code>NEXT_PUBLIC_SUPABASE_URL</code> и <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
      ) : null}
      {hostedDemoStore() ? (
        <p className="admin-card" style={{ marginTop: "1.5rem" }}>
          Хоствано демо, докато Supabase не е свързан. Записите на това внедряване са временни. Ползвайте демо акаунтите по-долу.
        </p>
      ) : null}
      <form action={loginAction} className="admin-form admin-card" style={{ marginTop: "1.5rem" }}>
        {error ? <p role="alert">{decodeURIComponent(error)}</p> : null}
        <label>
          Имейл
          <input type="email" name="email" autoComplete="username" required />
        </label>
        <label>
          Парола
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className="admin-btn" disabled={mode === "seed"}>
          Вход
        </button>
        {mode === "local" ? (
          <p className="admin-muted">
            Потребители: <code>admin@itt.local</code> (пълен достъп) или <code>editor@itt.local</code> (редактор).{" "}
            {hostedDemoStore() ? (
              <>
                Парола: <code>{process.env.CIT_ADMIN_DEV_PASSWORD}</code>
              </>
            ) : (
              <>
                Парола: стойността на <code>CIT_ADMIN_DEV_PASSWORD</code> в <code>.env.local</code>.
              </>
            )}
          </p>
        ) : null}
        {mode === "supabase" ? (
          <p className="admin-muted">
            Акаунтите на екипа са в Supabase Auth. Вход имат само имейлите от <code>staff</code>.
          </p>
        ) : null}
      </form>
    </main>
  );
}
