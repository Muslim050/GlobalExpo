import { PageHeader } from '@/components/PageHeader.jsx'
import { TotalStatisticsReport } from '@/components/campaigns/CampaignReportPanels.jsx'

export default function Reports() {
  return (
    <div>
      <PageHeader
        title="Отчёт по бренду"
        subtitle="Сводка размещений, социальных сетей, устройств и географии аудитории."
      />
      <TotalStatisticsReport />
    </div>
  )
}
