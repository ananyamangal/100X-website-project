export type AssetType   = "campaign" | "seo_article" | "landing_page" | "director_rec"
export type ActionType  = "deploy" | "approve" | "publish" | "monitor" | "execute"
export type AssetSource = "ads" | "seo" | "landing" | "director"

export interface QueueItem {
  assetId:        string
  assetType:      AssetType
  source:         AssetSource
  title:          string
  opportunity:    string
  revenueImpact:  number
  status:         string
  requiredAction: ActionType
  actionLabel:    string
  actionEndpoint: string
  actionPayload:  Record<string, unknown>
  priority:       "critical" | "high" | "medium" | "low"
  createdAt:      string
  meta?:          Record<string, unknown>
}

export interface Summary {
  totalItems:         number
  campaignsReady:     number
  articlesReady:      number
  pagesReady:         number
  monitoring:         number
  directorRecs:       number
  totalRevenueImpact: number
}

export interface ExecutionData { summary: Summary; queue: QueueItem[] }
