"use client";

import { useRouter } from "next/navigation";
import { AdminPanel } from "../../components/admin/AdminPanel";
import { useWarRoom } from "../../components/providers/WarRoomProvider";

export default function AdminPage() {
  const router = useRouter();
  const { clientConfig, setClientConfig } = useWarRoom();
  return (
    <AdminPanel
      onBackToWarroom={() => router.push("/")}
      clientConfig={clientConfig}
      onConfigUpdated={setClientConfig}
    />
  );
}
