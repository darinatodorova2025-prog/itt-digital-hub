import posthog from "posthog-js";
import { analyticsBlockedPath, appEnvironment, POSTHOG_PROXY_PATH, POSTHOG_UI_HOST, posthogProjectToken } from "@/lib/analytics/config";
import { scrubBrowserProperties } from "@/lib/analytics/privacy";

const token = posthogProjectToken();

if (token && appEnvironment() !== "test") {
  posthog.init(token, {
    api_host: POSTHOG_PROXY_PATH,
    ui_host: POSTHOG_UI_HOST,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_exceptions: false,
    disable_session_recording: true,
    advanced_disable_feature_flags: true,
    autocapture: {
      dom_event_allowlist: ["click", "submit"],
      element_allowlist: ["a", "button", "form"],
      url_ignorelist: [/\/admin/, /\/mahni-dosadnoto/],
    },
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: ".ph-mask",
      blockSelector: ".ph-no-capture",
      recordHeaders: false,
      recordBody: false,
      maskCapturedNetworkRequestFn: (request) => {
        const name = typeof request.name === "string" ? request.name : "";
        if (/openai\.com|openrouter\.ai|googleapis\.com|generativelanguage|supabase\.co|resend\.com/i.test(name)) {
          return null;
        }
        return { ...request, requestBody: null, responseBody: null };
      },
    },
    tracing_headers: ["ittdigitalhub.org", "www.ittdigitalhub.org", "localhost", "127.0.0.1"],
    before_send: (event) => {
      if (!event) return event;
      const environment = appEnvironment();
      if (environment === "development" && process.env.NEXT_PUBLIC_POSTHOG_CAPTURE_DEV !== "1") return null;
      const path = event.properties?.$pathname ?? event.properties?.$current_url;
      if (typeof path === "string" && analyticsBlockedPath(path)) return null;
      scrubBrowserProperties(event.properties);
      if (event.properties) {
        event.properties.environment = environment;
        event.properties.site = "ittdigitalhub.org";
      }
      return event;
    },
  });
}
