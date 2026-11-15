"use client";

import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { CategoryView } from "@/components/records/category-view";
import { Award } from "lucide-react";

export default function PatentsPage() {
  return (
    <AppLayout>
      <CategoryView
        category="PATENT"
        title="Patents & Intellectual Property"
        description="Organize Design and Utility patents from application filing through publication and final grant."
        icon={Award}
      />
    </AppLayout>
  );
}
