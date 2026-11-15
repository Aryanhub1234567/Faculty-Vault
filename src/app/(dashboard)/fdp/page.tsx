"use client";

import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { CategoryView } from "@/components/records/category-view";
import { GraduationCap } from "lucide-react";

export default function FDPPage() {
  return (
    <AppLayout>
      <CategoryView
        category="FDP"
        title="Faculty Development Programs (FDP)"
        description="Record participation and coordination in professional development courses, ATAL academies, and engineering workshops."
        icon={GraduationCap}
      />
    </AppLayout>
  );
}
