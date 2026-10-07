export type RentStatus = "paid" | "overdue" | "due_soon" | "upcoming"

type RentStatusInput = {
  isPaid: boolean
  dueDate: number
  now: number
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

export const getRentStatus = ({ isPaid, dueDate, now }: RentStatusInput): RentStatus => {
  if (isPaid) return "paid"
  if (dueDate < now) return "overdue"
  if (dueDate - now <= SEVEN_DAYS) return "due_soon"
  return "upcoming"
}
