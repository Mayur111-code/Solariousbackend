import { permanentRedirect } from "next/navigation";

/**
 * The manufacturing page was withdrawn from the public navigation.
 *
 * The route is kept alive as a permanent redirect so existing inbound links,
 * search results and printed QR codes do not break. All manufacturing content,
 * records, images and the admin editor remain untouched — production and
 * quality information is published on /quality and the homepage.
 */
export default function Page() {
  permanentRedirect("/quality");
}
