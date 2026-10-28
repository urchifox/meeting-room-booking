import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"

import type { HourMinute, YearMonthDay } from "../types/types"

dayjs.extend(customParseFormat)

const DATE_FORMAT = "YYYY-MM-DD"
const TIME_FORMAT = "HH:mm"
const DATE_TIME_FORMAT = `${DATE_FORMAT} ${TIME_FORMAT}`

export function isYearMonthDay(date: string): date is YearMonthDay {
	return dayjs(date, DATE_FORMAT, true).isValid()
}

export function isHourMinute(time: string): time is HourMinute {
	return dayjs(time, TIME_FORMAT, true).isValid()
}

export function getDayjs({
	date,
	time,
}: {
	date: YearMonthDay
	time: HourMinute
}) {
	if (!isYearMonthDay(date)) {
		throw new Error(`Invalid date: ${date}`)
	}

	if (!isHourMinute(time)) {
		throw new Error(`Invalid time: ${time}`)
	}

	return dayjs(`${date} ${time}`, DATE_TIME_FORMAT, true)
}

export function getToday(): YearMonthDay {
	return dayjs().format(DATE_FORMAT) as YearMonthDay
}
