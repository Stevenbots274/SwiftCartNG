import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-12 pb-20 md:pb-0">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-xl md:text-2xl font-bold">Get the best deals in your inbox</h3>
            <p className="text-sm text-white/70 mt-1">Weekly flash sales, new drops, and coupons — Naija delivery only.</p>
          </div>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              placeholder="your@email.com"
              className="flex-1 h-11 px-4 rounded-full bg-white/10 border border-white/20 text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-semibold mb-3">Customer Service</h4>
          <ul className="space-y-2 text-white/70">
            <li>Help Center</li>
            <li>Contact Us</li>
            <li>Track Order</li>
            <li>Returns & Refunds</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-white/70">
            <li>About SwiftCartNG</li>
            <li><Link to="/seller">Sell on SwiftCart</Link></li>
            <li>Careers</li>
            <li>Blog</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Policies</h4>
          <ul className="space-y-2 text-white/70">
            <li>Terms of Use</li>
            <li>Privacy Policy</li>
            <li>Shipping Policy</li>
            <li>Cookie Policy</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Follow Us</h4>
          <div className="flex gap-3">
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center"><Facebook className="h-4 w-4" /></span>
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center"><Instagram className="h-4 w-4" /></span>
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center"><Twitter className="h-4 w-4" /></span>
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center"><Youtube className="h-4 w-4" /></span>
          </div>
          <p className="mt-4 text-xs text-white/60">We accept: Paystack, Card, Bank Transfer, USSD</p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-white/60 flex justify-between">
          <span>© {new Date().getFullYear()} SwiftCartNG. All rights reserved.</span>
          <span>Made in Nigeria 🇳🇬</span>
        </div>
      </div>
    </footer>
  );
}
