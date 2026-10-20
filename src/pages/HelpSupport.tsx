import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { LifeBuoy, BookOpen, MessageSquare, Mail } from "lucide-react";
import { SupportTicketSystem } from "@/components/support/SupportTicketSystem";
import KnowledgeBase from "@/components/support/KnowledgeBase";

/**
 * Patient-facing Help & Support (audit fix, 2026-10-20).
 *
 * The support ticket system and knowledge base already existed and were
 * fully wired — but they only rendered inside the staff support workflow,
 * so patients had no route to either; their only "Help" entry led to the
 * static /contact page. This page gives every signed-in user:
 *   - Help Articles: the published knowledge base (search + categories)
 *   - My Tickets: SupportTicketSystem in its default mode, which scopes
 *     every query to the signed-in user's own tickets (staff actions only
 *     render for support/admin roles)
 * Other contact options stay on /contact, linked below.
 */
export default function HelpSupport() {
  return (
    <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
      <div className="doc-page-header px-4 sm:px-6 py-5 shadow-sm">
        <div className="max-w-content mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Help & Support</h1>
            <p className="text-sm text-graphite-600 dark:text-slate-300 font-medium tracking-wide">
              Search help articles or talk to our support team
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <Tabs defaultValue="articles">
          <TabsList>
            <TabsTrigger value="articles">
              <BookOpen className="h-4 w-4 mr-1.5" /> Help Articles
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <MessageSquare className="h-4 w-4 mr-1.5" /> My Tickets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="mt-4">
            <KnowledgeBase />
          </TabsContent>

          <TabsContent value="tickets" className="mt-4">
            <SupportTicketSystem />
          </TabsContent>
        </Tabs>

        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <Mail className="h-5 w-5 text-primary-500 shrink-0" />
            <p className="text-sm flex-1 min-w-[220px]">
              Prefer email or phone? See all the ways to reach the Doc'O Clock team on our contact page.
            </p>
            <Link
              to="/contact"
              className="px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-xl border border-graphite-300 dark:border-slate-700 text-xs font-extrabold hover:bg-canvas dark:hover:bg-slate-800 transition-colors"
            >
              Contact Us
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
