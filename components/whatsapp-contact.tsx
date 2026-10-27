import { MessageCircle } from "lucide-react";
import { WHATSAPP_LABEL, WHATSAPP_URL } from "@/lib/contact";

/**
 * One accessible WhatsApp entry point, reused by the floating action, contact
 * details, quote assistance, the homepage CTA and the footer.
 */
export default function WhatsAppLink({
  className = "",
  children = "Chat on WhatsApp",
  iconOnly = false,
  ariaLabel = WHATSAPP_LABEL,
}: {
  className?: string;
  children?: React.ReactNode;
  iconOnly?: boolean;
  ariaLabel?: string;
}) {
  return (
    <a
      className={`whatsapp-link ${className}`.trim()}
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <MessageCircle size={18} aria-hidden="true" />
      {!iconOnly && <span className="whatsapp-label">{children}</span>}
    </a>
  );
}
