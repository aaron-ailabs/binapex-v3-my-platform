import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminTrading() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
        Trading Monitor
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Live Market Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Real-time trading activity monitoring will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
