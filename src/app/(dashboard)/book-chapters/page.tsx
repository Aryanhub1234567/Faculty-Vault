"use client";

import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { CategoryView } from "@/components/records/category-view";
import { Bookmark } from "lucide-react";

export default function BookChaptersPage() {
  return (
    <AppLayout>
      <CategoryView
        category="BOOK_CHAPTER"
        title="Book Chapters & Contributions"
        description="Maintain records of peer-reviewed chapters in edited reference books and international conference volumes."
        icon={Bookmark}
      />
    </AppLayout>
  );
}
