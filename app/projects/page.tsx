import { permanentRedirect } from "next/navigation";

/**
 * The projects page was withdrawn from the public navigation.
 *
 * Project photography continues to be published through the admin-managed
 * gallery, so the old route redirects there permanently instead of returning a
 * 404. No project images or records are deleted.
 */
export default function Page() {
  permanentRedirect("/gallery");
}
