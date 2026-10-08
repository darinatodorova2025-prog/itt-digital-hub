"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { clearAdminSessionCookie, getAdminSession, localLogin, requireRole, setAdminSessionCookie } from "@/lib/auth/session";
import { cmsMode } from "@/lib/cms/mode";
import {
  deleteMedia,
  loadAllRecords,
  saveInsight,
  saveMedia,
  savePartner,
  savePerson,
  saveProject,
  saveSettings,
  transitionInsight,
  transitionPerson,
  transitionProject,
} from "@/lib/cms/repository";
import type { PartnerRecord, PublicationState, SiteSettingsRecord } from "@/lib/cms/types";
import { insightRecordFromForm, personRecordFromForm, projectRecordFromForm } from "@/lib/cms/form-merge";
import { insightRouteKey } from "@/lib/insight-channel";
import { href } from "@/lib/paths";
import { newUploadId, setPreviewCookie } from "@/lib/preview";

async function requireStaff() {
  const session = await getAdminSession();
  if (!requireRole(session)) redirect("/admin/login");
  return session;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const mode = cmsMode();
  if (mode === "local") {
    const staff = await localLogin(email, password);
    if (!staff) redirect("/admin/login?error=" + encodeURIComponent("Невалиден имейл или парола."));
    try {
      await setAdminSessionCookie({ userId: staff.userId, email: staff.email, role: staff.role, exp: Date.now() + 1000 * 60 * 60 * 12 });
    } catch (error) {
      redirect("/admin/login?error=" + encodeURIComponent(error instanceof Error ? error.message : "Подписването на сесията не е настроено."));
    }
    redirect("/admin");
  }
  if (mode === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/cms/supabase-server");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) redirect("/admin/login?error=" + encodeURIComponent(error?.message ?? "Входът не успя."));
    const { data: staff } = await supabase.from("staff").select("user_id, email, role").eq("user_id", data.user.id).maybeSingle();
    if (!staff) {
      await supabase.auth.signOut();
      redirect("/admin/login?error=" + encodeURIComponent("Този акаунт не е в списъка на екипа."));
    }
    try {
      await setAdminSessionCookie({
        userId: staff.user_id,
        email: staff.email,
        role: staff.role,
        exp: Date.now() + 1000 * 60 * 60 * 12,
      });
    } catch (error) {
      await supabase.auth.signOut();
      redirect("/admin/login?error=" + encodeURIComponent(error instanceof Error ? error.message : "Подписването на сесията не е настроено."));
    }
    redirect("/admin");
  }
  redirect("/admin/login?error=" + encodeURIComponent("CMS не е конфигуриран."));
}

export async function logoutAction() {
  if (cmsMode() === "supabase") {
    try {
      const { createSupabaseServerClient } = await import("@/lib/cms/supabase-server");
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      /* local session still cleared */
    }
  }
  await clearAdminSessionCookie();
  redirect("/admin/login");
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}

function lines(form: FormData, key: string): string[] {
  return text(form, key)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function saveProjectAction(formData: FormData) {
  const session = await requireStaff();
  const existing = await findProject(text(formData, "id") || text(formData, "slug"));
  const record = projectRecordFromForm(formData, existing, session.userId);
  const result = await saveProject(record);
  if (!result.ok) redirect(`/admin/projects/${record.slug}?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${record.slug}?saved=1`);
}

async function findProject(idOrSlug: string) {
  const { projects } = await loadAllRecords();
  return projects.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export async function publishProjectAction(formData: FormData) {
  const session = await requireStaff();
  const slug = text(formData, "slug");
  const state = text(formData, "state") as PublicationState;
  if ((state === "published" || state === "archived") && !requireRole(session, "admin")) {
    redirect(`/admin/projects/${slug}?error=${encodeURIComponent("Only an administrator can publish or archive.")}`);
  }
  const result = await transitionProject(slug, state, session.userId);
  if (!result.ok) redirect(`/admin/projects/${slug}?error=${encodeURIComponent((result.issues ?? [result.error]).join(" "))}`);
  revalidatePath("/");
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${slug}?saved=1`);
}

export async function previewProjectAction(formData: FormData) {
  await requireStaff();
  const slug = text(formData, "slug");
  const locale = text(formData, "locale") === "bg" ? "bg" : "en";
  await setPreviewCookie({ kind: "project", slug });
  redirect(`/${locale}/projects/${slug}`);
}

export async function saveInsightAction(formData: FormData) {
  const session = await requireStaff();
  const { insights } = await loadAllRecords();
  const existing = insights.find((i) => i.slug === text(formData, "slug") || i.id === text(formData, "id"));
  const record = insightRecordFromForm(formData, existing, session.userId);
  const result = await saveInsight(record);
  if (!result.ok) redirect(`/admin/insights/${record.slug}?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/insights");
  revalidatePath("/bg");
  revalidatePath("/en");
  revalidatePath("/bg/insights");
  revalidatePath("/en/insights");
  revalidatePath("/bg/news");
  revalidatePath("/en/news");
  redirect(`/admin/insights/${record.slug}?saved=1`);
}

export async function publishInsightAction(formData: FormData) {
  const session = await requireStaff();
  const slug = text(formData, "slug");
  const state = text(formData, "state") as PublicationState;
  if ((state === "published" || state === "archived") && !requireRole(session, "admin")) {
    redirect(`/admin/insights/${slug}?error=${encodeURIComponent("Only an administrator can publish or archive.")}`);
  }
  const result = await transitionInsight(slug, state, session.userId);
  if (!result.ok) redirect(`/admin/insights/${slug}?error=${encodeURIComponent((result.issues ?? [result.error]).join(" "))}`);
  revalidatePath("/admin/insights");
  revalidatePath("/bg", "layout");
  revalidatePath("/en", "layout");
  redirect(`/admin/insights/${slug}?saved=1`);
}

export async function previewInsightAction(formData: FormData) {
  await requireStaff();
  const slug = text(formData, "slug");
  const locale = text(formData, "locale") === "bg" ? "bg" : "en";
  const { insights } = await loadAllRecords();
  const record = insights.find((i) => i.slug === slug);
  await setPreviewCookie({ kind: "insight", slug });
  redirect(href(locale, insightRouteKey(record?.type), slug));
}

export async function savePersonAction(formData: FormData) {
  const session = await requireStaff();
  const { people } = await loadAllRecords();
  const existing = people.find((p) => p.slug === text(formData, "slug") || p.id === text(formData, "id"));
  const record = personRecordFromForm(formData, existing, session.userId);
  const result = await savePerson(record);
  if (!result.ok) redirect(`/admin/people?error=${encodeURIComponent(result.error)}`);
  redirect("/admin/people?saved=1");
}

export async function publishPersonAction(formData: FormData) {
  const session = await requireStaff();
  const slug = text(formData, "slug");
  const state = text(formData, "state") as PublicationState;
  if ((state === "published" || state === "archived") && !requireRole(session, "admin")) {
    redirect(`/admin/people?error=${encodeURIComponent("Only an administrator can publish or archive.")}`);
  }
  const result = await transitionPerson(slug, state, session.userId);
  if (!result.ok) redirect(`/admin/people?error=${encodeURIComponent((result.issues ?? [result.error]).join(" "))}`);
  redirect("/admin/people?saved=1");
}

export async function savePartnerAction(formData: FormData) {
  const session = await requireStaff();
  const { partners } = await loadAllRecords();
  const requestedState = (text(formData, "publicationState") as PartnerRecord["publicationState"]) || "draft";
  if ((requestedState === "published" || requestedState === "archived") && !requireRole(session, "admin")) {
    redirect(`/admin/partners?error=${encodeURIComponent("Only an administrator can publish or archive partners.")}`);
  }
  const existing = partners.find((p) => p.slug === text(formData, "slug") || p.id === text(formData, "id"));
  const now = new Date().toISOString();
  const record: PartnerRecord = {
    id: existing?.id ?? `partner-${text(formData, "slug")}`,
    slug: text(formData, "slug"),
    nameBg: text(formData, "nameBg"),
    nameEn: text(formData, "nameEn"),
    relationship: (text(formData, "relationship") as PartnerRecord["relationship"]) || "proposed",
    noteBg: text(formData, "noteBg"),
    noteEn: text(formData, "noteEn"),
    publicationState: requestedState || existing?.publicationState || "draft",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt: existing?.publishedAt,
    createdBy: existing?.createdBy ?? session.userId,
    updatedBy: session.userId,
  };
  const result = await savePartner(record);
  if (!result.ok) redirect(`/admin/partners?error=${encodeURIComponent(result.error)}`);
  redirect("/admin/partners?saved=1");
}

export async function saveSettingsAction(formData: FormData) {
  const session = await requireStaff();
  if (!requireRole(session, "admin")) {
    redirect(`/admin/settings?error=${encodeURIComponent("Only an administrator can change global settings.")}`);
  }
  const { settings } = await loadAllRecords();
  const record: SiteSettingsRecord = {
    id: "global",
    data: {
      ...settings.data,
      nameBg: text(formData, "nameBg"),
      nameEn: text(formData, "nameEn"),
      descriptorBg: text(formData, "descriptorBg"),
      descriptorEn: text(formData, "descriptorEn"),
      anchorBg: text(formData, "anchorBg"),
      anchorEn: text(formData, "anchorEn"),
      contactNoteBg: text(formData, "contactNoteBg"),
      contactNoteEn: text(formData, "contactNoteEn"),
      featuredProjectSlug: text(formData, "featuredProjectSlug") || undefined,
      featuredInsightSlugs: lines(formData, "featuredInsightSlugs"),
      heroMediaId: text(formData, "heroMediaId") || undefined,
      institutionalMediaId: text(formData, "institutionalMediaId") || undefined,
      researchMediaId: text(formData, "researchMediaId") || undefined,
      appliedMediaId: text(formData, "appliedMediaId") || undefined,
    },
    updatedAt: new Date().toISOString(),
    updatedBy: session.userId,
  };
  const result = await saveSettings(record);
  if (!result.ok) redirect(`/admin/settings?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/");
  redirect("/admin/settings?saved=1");
}

export async function uploadMediaAction(formData: FormData) {
  const session = await requireStaff();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/media?error=" + encodeURIComponent("Choose a file."));
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!allowed.includes(file.type)) redirect("/admin/media?error=" + encodeURIComponent("Only JPEG, PNG, WebP or AVIF."));
  if (file.size > 8 * 1024 * 1024) redirect("/admin/media?error=" + encodeURIComponent("File too large (8 MB)."));
  const ext = file.type.split("/")[1] ?? "jpg";
  const id = newUploadId();
  const filename = `${id}.${ext}`;
  const mode = cmsMode();
  let publicUrl = `/uploads/cms/${filename}`;
  let storagePath: string | undefined;
  if (mode === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/cms/supabase-server");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from("media").upload(filename, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (error) redirect("/admin/media?error=" + encodeURIComponent(error.message));
    const { data } = supabase.storage.from("media").getPublicUrl(filename);
    publicUrl = data.publicUrl;
    storagePath = filename;
  } else {
    const dir = path.join(process.cwd(), "public", "uploads", "cms");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  }
  const now = new Date().toISOString();
  const result = await saveMedia({
    id,
    storagePath,
    publicUrl,
    title: text(formData, "title") || file.name,
    altBg: text(formData, "altBg"),
    altEn: text(formData, "altEn"),
    source: text(formData, "source"),
    sourceUrl: text(formData, "sourceUrl"),
    usageNote: text(formData, "usageNote"),
    temporary: formData.get("temporary") === "on",
    replacementRequired: formData.get("replacementRequired") === "on",
    mimeType: file.type,
    byteSize: file.size,
    createdAt: now,
    updatedAt: now,
    createdBy: session.userId,
    updatedBy: session.userId,
  });
  if (!result.ok) redirect("/admin/media?error=" + encodeURIComponent(result.error));
  redirect("/admin/media?saved=1");
}

export async function updateMediaAction(formData: FormData) {
  const session = await requireStaff();
  const { media } = await loadAllRecords();
  const existing = media.find((m) => m.id === text(formData, "id"));
  if (!existing) redirect("/admin/media?error=Not+found");
  await saveMedia({
    ...existing,
    title: text(formData, "title"),
    altBg: text(formData, "altBg"),
    altEn: text(formData, "altEn"),
    source: text(formData, "source"),
    sourceUrl: text(formData, "sourceUrl"),
    usageNote: text(formData, "usageNote"),
    temporary: formData.get("temporary") === "on",
    replacementRequired: formData.get("replacementRequired") === "on",
    updatedBy: session.userId,
  });
  redirect("/admin/media?saved=1");
}

export async function deleteMediaAction(formData: FormData) {
  await requireStaff();
  const result = await deleteMedia(text(formData, "id"));
  if (!result.ok) redirect("/admin/media?error=" + encodeURIComponent(result.error));
  redirect("/admin/media?saved=1");
}
