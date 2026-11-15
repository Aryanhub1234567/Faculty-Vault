"use client";

import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { CategoryView } from "@/components/records/category-view";
import { BookOpen } from "lucide-react";

export default function BooksPage() {
  return (
    <AppLayout>
      <CategoryView
        category="BOOK"
        title="Books & Authored Monographs"
        description="Catalog authored textbooks, research monographs, and edited volumes with verified ISBN strings and publication dates."
        icon={BookOpen}
      />
    </AppLayout>
  );
}
