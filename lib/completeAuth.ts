"use client"

import { authClient } from "@/lib/authClient"
import { queryClient } from "@/lib/queryClient"

export async function completeAuthLogin(accessToken: string) {
  await queryClient.cancelQueries()
  queryClient.clear()
  authClient.setAccessToken(accessToken)
}
