import GovPerformanceCards, { type PastPerformanceRecord } from "./GovPerformanceCards"

interface Props {
  records: PastPerformanceRecord[]
  showFilters?: boolean
  maxVisible?: number
  showViewAll?: boolean
}

export default function GovPastPerformanceCardsServer({ records, showFilters, maxVisible, showViewAll }: Props) {
  return (
    <GovPerformanceCards
      records={records}
      showFilters={showFilters}
      maxVisible={maxVisible}
      showViewAll={showViewAll}
    />
  )
}
