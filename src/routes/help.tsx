import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";

export const Route = createFileRoute("/help")({ component: HelpPage });

function HelpPage() {
  const faqs = [
    { q: "How long does delivery take?", a: "Standard delivery is 2-4 days within Lagos/Abuja, 3-7 days for other states. Express is 24 hours in Lagos." },
    { q: "What payment methods do you accept?", a: "We accept all major cards, bank transfers, USSD and bank apps through Paystack." },
    { q: "Can I return a product?", a: "Yes, you can return items within 7 days of delivery. Items must be unused and in original packaging." },
    { q: "How do I become a seller?", a: "Go to your account page and click 'Become a Seller' to submit your application." },
  ];
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-secondary">Help & FAQ</h1>
      </div>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details key={i} className="rounded-xl border bg-card p-4">
            <summary className="font-semibold cursor-pointer">{f.q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
