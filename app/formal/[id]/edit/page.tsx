import { FormalEditClient } from '@/components/themes/formal/FormalEditClient'

export const metadata = { title: '編輯出隊紀錄 · 成大山協' }

export default function EditPage({ params }: { params: { id: string } }) {
  return <FormalEditClient expeditionId={params.id} />
}
