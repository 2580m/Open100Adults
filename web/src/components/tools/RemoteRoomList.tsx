"use client";

import { RemoteLobby } from "@/components/tools/RemoteLobby";
import type { Locale } from "@/data/tools";

export function RemoteRoomList({ locale }: { locale: Locale }) {
  return <RemoteLobby lang={locale} where="list" ctlSettings />;
}
