"use client";

import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { CategoryView } from "@/components/records/category-view";
import { Presentation } from "lucide-react";

export default function ConferencePage() {
  return (
    <AppLayout>
      <CategoryView
        category="CONFERENCE"
        title="Conference Proceedings & Presentations"
        description="Track paper presentations, keynotes, and participation in National and International engineering conferences."
        icon={Presentation}
      />
    </AppLayout>
  );
}
