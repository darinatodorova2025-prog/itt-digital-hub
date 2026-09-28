import { describe, expect, it } from "vitest";
import {
  MahniStoreConfigurationError,
  clearMahniStoreCache,
  resolveMahniStoreBackend,
  useMemoryMahniStore,
} from "@/mahni-dosadnoto/store/resolve";
import { MemoryMahniStore, resetMemoryStoreForTests } from "@/mahni-dosadnoto/store/memory";
import { SupabaseMahniStore } from "@/mahni-dosadnoto/store/supabase/store";

describe("mahni store backend selection", () => {
  it("requires supabase on Vercel preview when service role missing", () => {
    expect(() =>
      resolveMahniStoreBackend({
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      }),
    ).toThrow(MahniStoreConfigurationError);
  });

  it("uses supabase on preview when service role is configured", () => {
    expect(
      resolveMahniStoreBackend({
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
      }),
    ).toBe("supabase");
  });

  it("forbids MAHNI_STORE=memory on preview", () => {
    expect(() =>
      resolveMahniStoreBackend({
        VERCEL_ENV: "preview",
        MAHNI_STORE: "memory",
      }),
    ).toThrow(MahniStoreConfigurationError);
  });

  it("allows explicit memory in local test env", () => {
    expect(
      resolveMahniStoreBackend({
        NODE_ENV: "test",
        MAHNI_STORE: "memory",
      }),
    ).toBe("memory");
  });
});

describe("mahni session persistence model", () => {
  it("does not share sessions between separate memory store instances", async () => {
    const a = new MemoryMahniStore();
    await a.ensureCampaign();
    await a.transitionPhase("COLLECTING");
    await a.registerParticipant(
      {
        firstName: "A",
        lastName: "B",
        organization: "Org",
        role: "R",
        email: "iso@test.example",
        marketingConsent: false,
      },
      "cross-instance-token",
    );

    const b = new MemoryMahniStore();
    const resolved = await b.resolveParticipant("cross-instance-token");
    expect(resolved).toBeNull();
  });

  it("uses separate Supabase store instances without in-memory participant cache", () => {
    const one = new SupabaseMahniStore();
    const two = new SupabaseMahniStore();
    expect(one).not.toBe(two);
  });
});

describe("mahni production memory guard", () => {
  it("does not silently select memory on internet-facing deployments", () => {
    clearMahniStoreCache();
    expect(() =>
      resolveMahniStoreBackend({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      }),
    ).toThrow(MahniStoreConfigurationError);
  });

  it("allows tests to inject memory store explicitly", async () => {
    clearMahniStoreCache();
    const memory = resetMemoryStoreForTests();
    useMemoryMahniStore(memory);
    await memory.ensureCampaign();
    clearMahniStoreCache();
  });
});
