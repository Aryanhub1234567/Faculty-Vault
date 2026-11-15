"use client";

import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { CategoryView } from "@/components/records/category-view";
import { FileText } from "lucide-react";

export default function ResearchArticlesPage() {
  return (
    <AppLayout>
      <CategoryView
        category="RESEARCH_ARTICLE"
        title="Research Articles & Journal Publications"
        description="Catalog SCOPUS, Web of Science (WOS), and Science Citation Index (SCI) peer-reviewed journal papers."
        icon={FileText}
      />
    </AppLayout>
  );
}
