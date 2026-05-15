import { Badge } from '../ui/Badge'
import { getStatusColor, getStatusLabel } from '../../lib/utils'
import type { ObjectiveStatus } from '../../types'

export function ObjectiveStatusBadge({ status }: { status: ObjectiveStatus }) {
  return (
    <Badge className={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Badge>
  )
}
