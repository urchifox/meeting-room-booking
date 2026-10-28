/** YYYY-MM-DD */
export type YearMonthDay =
	`${number}${number}${number}${number}-${number}${number}-${number}${number}`

/** HH:mm */
export type HourMinute = `${number}${number}:${number}${number}`

export type BookingInfo = {
	id: string
	/** YYYY-MM-DD */
	date: YearMonthDay
	timeRange: TimeRange
	title?: string
}

export type TimeRange = {
	start: HourMinute
	end: HourMinute
}
