"use client"
import { useEffect, useState } from "react"
import { crmFetch } from "./api"

export interface TeamMember {
  id: string
  name: string
}

/** Assignable users. Failure is non-fatal (the assignee control simply has fewer options). */
export function useTeam(): TeamMember[] {
  const [team, setTeam] = useState<TeamMember[]>([])
  useEffect(() => {
    let live = true
    crmFetch<{ items: TeamMember[] }>("/api/crm/team")
      .then(r => {
        if (live) setTeam(r.items)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return team
}
