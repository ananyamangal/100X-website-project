"use client"

import { useEffect, useState } from "react"
import FeaturedDeployments, { type DeploymentRecord } from "@/components/trust/FeaturedDeployments"

interface Props {
  initialData?: DeploymentRecord[]
}

export default function HomeDeploymentsSection({ initialData }: Props = {}) {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>(initialData?.slice(0, 4) ?? [])
  const [loaded, setLoaded] = useState(!!initialData)

  useEffect(() => {
    if (initialData && initialData.length > 0) return
    fetch("/api/deployments")
      .then((r) => r.json())
      .then((data: DeploymentRecord[]) => {
        const withImages = Array.isArray(data) ? data.filter((d) => d.images && d.images.length > 0) : []
        setDeployments(withImages.slice(0, 4))
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [initialData])

  if (!loaded || deployments.length === 0) return null

  return (
    <section className="py-16 md:py-20 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <FeaturedDeployments deployments={deployments} heading="Real World Deployments" maxVisible={4} showViewAll />
      </div>
    </section>
  )
}
